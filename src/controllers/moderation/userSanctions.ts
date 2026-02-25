import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Utilisateur, { IWarning } from '../../models/Utilisateur.js';
import AuditLog from '../../models/AuditLog.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { forceDisconnectUser } from '../../socket/index.js';
import { createSanctionNotification, createReverseSanctionNotification } from '../../utils/sanctionNotification.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import {
  canModerate,
  getOrCreateEventId,
  isEventIdAlreadyProcessed,
  AUTO_SUSPENSION_DURATION_HOURS,
  WARNINGS_BEFORE_AUTO_SUSPENSION,
} from '../../utils/moderationHelpers.js';

// ============ SCHEMAS DE VALIDATION ============

const schemaWarnUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caractères').max(500),
  expiresInDays: z.number().int().positive().max(365).optional(), // null = permanent
});

const schemaSuspendUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caractères').max(500),
  durationHours: z.number().int().min(1).max(8760), // Max 1 an (365 jours)
});

const schemaBanUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caractères').max(500),
});

const schemaUnbanUser = z.object({
  reason: z.string().max(500).optional(),
});

const schemaChangeRole = z.object({
  newRole: z.enum(['user', 'modo_test', 'modo', 'admin_modo', 'super_admin']),
  reason: z.string().max(500).optional(),
});

// ============ ACTIONS SUR LES UTILISATEURS ============

/**
 * Avertir un utilisateur avec systeme d'escalade automatique
 * POST /api/moderation/users/:id/warn
 *
 * Logique d'auto-escalade:
 * - 3 warnings cumules → suspension automatique 7 jours
 * - 3 warnings supplementaires apres suspension → ban definitif
 */
export const warnUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaWarnUser.parse(req.body);

    // Generer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Verifier si cet eventId a deja ete traite (idempotency)
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] warnUser eventId ${eventId} deja traite, retour OK sans action`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Vérifier les permissions de hiérarchie
    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    // Verifier si deja banni
    if (target.isBanned()) {
      throw new ErreurAPI('Cet utilisateur est deja banni', 400);
    }

    // Determiner la source
    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';

    // Créer l'avertissement
    const warning: IWarning = {
      reason: donnees.reason,
      note: req.body.note,
      issuedBy: moderator._id,
      issuedAt: new Date(),
      expiresAt: donnees.expiresInDays
        ? new Date(Date.now() + donnees.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
      source,
    };

    // Atomic: push warning + increment counter without read-modify-write race
    const updatedTarget = await Utilisateur.findByIdAndUpdate(
      target._id,
      {
        $push: { warnings: warning },
        $inc: { 'moderation.warnCountSinceLastAutoSuspension': 1 },
        $set: { 'moderation.updatedAt': new Date() },
        $setOnInsert: { 'moderation.status': 'active', 'moderation.autoSuspensionsCount': 0 },
      },
      { new: true }
    );
    if (updatedTarget) {
      // Refresh target for subsequent auto-escalation logic
      Object.assign(target, updatedTarget.toObject());
    }

    // Log de l'action du moderateur avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'user:warn',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: donnees.reason,
      metadata: {
        warningId: target.warnings[target.warnings.length - 1]._id,
        expiresAt: warning.expiresAt?.toISOString(),
        totalWarnings: target.warnings.length,
        warnCountSinceLastAutoSuspension: target.moderation.warnCountSinceLastAutoSuspension,
        autoSuspensionsCount: target.moderation.autoSuspensionsCount,
      },
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Creer une notification pour l'avertissement avec eventId pour idempotency
    const postId = req.body.postId;
    const warningNotificationId = await createSanctionNotification({
      targetUserId: target._id,
      sanctionType: 'warn',
      reason: donnees.reason,
      postId,
      actorId: moderator._id,
      actorRole: moderator.role,
      eventId,
    });

    // ============ LOGIQUE D'AUTO-ESCALADE ============
    let autoAction: 'none' | 'auto_suspend' | 'auto_ban' = 'none';
    let autoActionNotificationId: mongoose.Types.ObjectId | null = null;

    const warnCount = target.moderation.warnCountSinceLastAutoSuspension;
    const autoSuspensions = target.moderation.autoSuspensionsCount;

    if (warnCount >= WARNINGS_BEFORE_AUTO_SUSPENSION) {
      if (autoSuspensions === 0) {
        // === CAS 1: Premiere auto-suspension (3 warnings atteints) ===
        autoAction = 'auto_suspend';

        // EventId distinct pour l'action auto-suspend
        const autoSuspendEventId = new mongoose.Types.ObjectId();

        const suspendedUntil = new Date(Date.now() + AUTO_SUSPENSION_DURATION_HOURS * 60 * 60 * 1000);
        const autoReason = `Suspension automatique: ${WARNINGS_BEFORE_AUTO_SUSPENSION} avertissements cumules`;

        target.suspendedUntil = suspendedUntil;
        target.suspendReason = autoReason;
        target.moderation.status = 'suspended';
        target.moderation.warnCountSinceLastAutoSuspension = 0; // Reset
        target.moderation.autoSuspensionsCount = 1;
        target.moderation.lastAutoActionAt = new Date();

        await target.save();

        // Log AuditLog avec actor = system et eventId distinct
        await AuditLog.create({
          eventId: autoSuspendEventId,
          actor: moderator._id, // Le modo qui a declenche
          actorRole: 'system', // Marque comme action systeme
          action: 'user:suspend',
          targetType: 'utilisateur',
          targetId: target._id,
          reason: autoReason,
          metadata: {
            autoAction: true,
            triggerType: 'AUTO_SUSPEND',
            warningsAtTrigger: target.warnings.length,
            suspendedUntil: suspendedUntil.toISOString(),
            durationHours: AUTO_SUSPENSION_DURATION_HOURS,
            triggeredByWarnFrom: moderator._id,
            triggeredByEventId: eventId.toString(),
          },
          snapshot: {
            before: { status: 'active' },
            after: { status: 'suspended', suspendedUntil: suspendedUntil.toISOString() },
          },
          source: 'system',
        });

        // Notification de suspension automatique avec eventId
        autoActionNotificationId = await createSanctionNotification({
          targetUserId: target._id,
          sanctionType: 'suspend',
          reason: autoReason,
          suspendedUntil,
          actorId: moderator._id, // Le modo qui a declenche le warning
          actorRole: 'system', // Indique que c'est une action automatique
          eventId: autoSuspendEventId,
        });

        // RED-17: Déconnecter immédiatement l'utilisateur auto-suspendu
        forceDisconnectUser(target._id.toString(), 'Votre compte a été suspendu automatiquement.');

        console.log(`[AUTO-ESCALADE] User ${target._id} suspendu automatiquement pour 7 jours (3 warnings) eventId: ${autoSuspendEventId}`);

      } else {
        // === CAS 2: Ban definitif (3 warnings apres suspension) ===
        autoAction = 'auto_ban';

        // EventId distinct pour l'action auto-ban
        const autoBanEventId = new mongoose.Types.ObjectId();

        const autoReason = `Bannissement automatique: ${WARNINGS_BEFORE_AUTO_SUSPENSION} avertissements supplementaires apres suspension`;

        target.bannedAt = new Date();
        target.banReason = autoReason;
        target.suspendedUntil = null; // Annuler toute suspension en cours
        target.moderation.status = 'banned';
        target.moderation.lastAutoActionAt = new Date();

        await target.save();

        // Log AuditLog avec actor = system et eventId distinct
        await AuditLog.create({
          eventId: autoBanEventId,
          actor: moderator._id, // Le modo qui a declenche
          actorRole: 'system', // Marque comme action systeme
          action: 'user:ban',
          targetType: 'utilisateur',
          targetId: target._id,
          reason: autoReason,
          metadata: {
            autoAction: true,
            triggerType: 'AUTO_BAN',
            warningsAtTrigger: target.warnings.length,
            previousAutoSuspensions: autoSuspensions,
            triggeredByWarnFrom: moderator._id,
            triggeredByEventId: eventId.toString(),
          },
          snapshot: {
            before: { status: target.moderation.status },
            after: { status: 'banned', bannedAt: target.bannedAt?.toISOString() },
          },
          source: 'system',
        });

        // Notification de ban automatique avec eventId
        autoActionNotificationId = await createSanctionNotification({
          targetUserId: target._id,
          sanctionType: 'ban',
          reason: autoReason,
          actorId: moderator._id, // Le modo qui a declenche le warning
          actorRole: 'system', // Indique que c'est une action automatique
          eventId: autoBanEventId,
        });

        // RED-17: Déconnecter immédiatement l'utilisateur auto-banni
        forceDisconnectUser(target._id.toString(), 'Votre compte a été banni définitivement.');

        console.log(`[AUTO-ESCALADE] User ${target._id} banni automatiquement (3 warnings apres suspension) eventId: ${autoBanEventId}`);
      }
    }

    res.status(200).json({
      succes: true,
      message: autoAction === 'auto_suspend'
        ? 'Avertissement envoyé. Suspension automatique declenchee (3 warnings).'
        : autoAction === 'auto_ban'
          ? 'Avertissement envoyé. Bannissement automatique declenche.'
          : 'Avertissement envoyé.',
      data: {
        eventId: eventId.toString(),
        warning: target.warnings[target.warnings.length - 1],
        totalWarnings: target.warnings.length,
        notificationId: warningNotificationId,
        moderation: {
          warnCountSinceLastAutoSuspension: target.moderation.warnCountSinceLastAutoSuspension,
          warningsBeforeNextSanction: Math.max(0, WARNINGS_BEFORE_AUTO_SUSPENSION - target.moderation.warnCountSinceLastAutoSuspension),
          autoSuspensionsCount: target.moderation.autoSuspensionsCount,
          status: target.moderation.status,
        },
        autoAction: autoAction !== 'none' ? {
          type: autoAction,
          notificationId: autoActionNotificationId,
          suspendedUntil: autoAction === 'auto_suspend' ? target.suspendedUntil?.toISOString() : undefined,
          bannedAt: autoAction === 'auto_ban' ? target.bannedAt?.toISOString() : undefined,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retirer un avertissement
 * DELETE /api/moderation/users/:id/warnings/:warningId
 */
export const removeWarning = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: userId, warningId } = req.params;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(warningId)) {
      throw new ErreurAPI('ID invalide', 400);
    }

    // Generer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Verifier si cet eventId a deja ete traite
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] removeWarning eventId ${eventId} deja traite`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    const warningIndex = target.warnings.findIndex(
      (w) => w._id?.toString() === warningId
    );

    if (warningIndex === -1) {
      throw new ErreurAPI('Avertissement non trouvé', 404);
    }

    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';
    const removedWarning = target.warnings[warningIndex];

    // Atomic: pull warning + decrement counter without read-modify-write race
    const updateOps: any = {
      $pull: { warnings: { _id: removedWarning._id } },
      $set: { 'moderation.updatedAt': new Date() },
    };
    if (target.moderation && target.moderation.warnCountSinceLastAutoSuspension > 0) {
      updateOps.$inc = { 'moderation.warnCountSinceLastAutoSuspension': -1 };
    }
    const updatedTarget = await Utilisateur.findByIdAndUpdate(target._id, updateOps, { new: true });
    if (updatedTarget) {
      Object.assign(target, updatedTarget.toObject());
    }

    // Log de l'action avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'user:warn_remove',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: 'Avertissement retiré',
      metadata: {
        removedWarning,
        warnCountSinceLastAutoSuspension: target.moderation?.warnCountSinceLastAutoSuspension || 0,
      },
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Notification de levée d'avertissement avec eventId
    await createReverseSanctionNotification({
      targetUserId: target._id,
      reverseSanctionType: 'unwarn',
      reason: removedWarning.reason,
      actorId: moderator._id,
      actorRole: moderator.role,
      eventId,
    });

    res.status(200).json({
      succes: true,
      message: 'Avertissement retiré.',
      data: {
        eventId: eventId.toString(),
        remainingWarnings: target.warnings.length,
        moderation: {
          warnCountSinceLastAutoSuspension: target.moderation?.warnCountSinceLastAutoSuspension || 0,
          warningsBeforeNextSanction: Math.max(0, WARNINGS_BEFORE_AUTO_SUSPENSION - (target.moderation?.warnCountSinceLastAutoSuspension || 0)),
          autoSuspensionsCount: target.moderation?.autoSuspensionsCount || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspendre temporairement un utilisateur
 * POST /api/moderation/users/:id/suspend
 */
export const suspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaSuspendUser.parse(req.body);

    // Generer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Verifier si cet eventId a deja ete traite
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] suspendUser eventId ${eventId} deja traite`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    // Vérifier si déjà banni
    if (target.isBanned()) {
      throw new ErreurAPI('Cet utilisateur est déjà banni définitivement', 400);
    }

    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';
    const suspendedUntil = new Date(Date.now() + donnees.durationHours * 60 * 60 * 1000);
    const snapshot = {
      before: { suspendedUntil: target.suspendedUntil?.toISOString() || null, suspendReason: target.suspendReason || null },
      after: { suspendedUntil: suspendedUntil.toISOString(), suspendReason: donnees.reason },
    };

    target.suspendedUntil = suspendedUntil;
    target.suspendReason = donnees.reason;
    await target.save();

    // RED-17: Déconnecter immédiatement l'utilisateur suspendu
    forceDisconnectUser(target._id.toString(), 'Votre compte a été suspendu.');

    // Log de l'action avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'user:suspend',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: donnees.reason,
      metadata: { durationHours: donnees.durationHours },
      snapshot,
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Creer une notification avec eventId pour idempotency
    const postId = req.body.postId;
    const notificationId = await createSanctionNotification({
      targetUserId: target._id,
      sanctionType: 'suspend',
      reason: donnees.reason,
      suspendedUntil,
      postId,
      actorId: moderator._id,
      actorRole: moderator.role,
      eventId,
    });

    res.status(200).json({
      succes: true,
      message: `Utilisateur suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`,
      data: {
        eventId: eventId.toString(),
        suspendedUntil: suspendedUntil.toISOString(),
        durationHours: donnees.durationHours,
        notificationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lever une suspension
 * POST /api/moderation/users/:id/unsuspend
 */
export const unsuspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Generer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Verifier si cet eventId a deja ete traite
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] unsuspendUser eventId ${eventId} deja traite`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    if (!target.isSuspended()) {
      throw new ErreurAPI("Cet utilisateur n'est pas suspendu", 400);
    }

    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';
    const snapshot = {
      before: { suspendedUntil: target.suspendedUntil?.toISOString(), suspendReason: target.suspendReason || null },
      after: { suspendedUntil: null, suspendReason: null },
    };

    target.suspendedUntil = null;
    target.suspendReason = undefined;
    await target.save();

    // Log de l'action avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'user:unsuspend',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: 'Suspension levée',
      snapshot,
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Notification de levée de suspension avec eventId
    await createReverseSanctionNotification({
      targetUserId: target._id,
      reverseSanctionType: 'unsuspend',
      actorId: moderator._id,
      actorRole: moderator.role,
      eventId,
    });

    res.status(200).json({
      succes: true,
      message: 'Suspension levée.',
      data: { eventId: eventId.toString() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bannir définitivement un utilisateur
 * POST /api/moderation/users/:id/ban
 */
export const banUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaBanUser.parse(req.body);

    // Generer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Verifier si cet eventId a deja ete traite
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] banUser eventId ${eventId} deja traite`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    if (target.isBanned()) {
      throw new ErreurAPI('Cet utilisateur est déjà banni', 400);
    }

    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';
    const snapshot = {
      before: { bannedAt: null, banReason: null },
      after: { bannedAt: new Date().toISOString(), banReason: donnees.reason },
    };

    target.bannedAt = new Date();
    target.banReason = donnees.reason;
    target.suspendedUntil = null; // Annuler toute suspension en cours
    await target.save();

    // RED-17: Déconnecter immédiatement l'utilisateur banni de toutes les sessions socket
    forceDisconnectUser(target._id.toString(), 'Votre compte a été banni.');

    // Log de l'action avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'user:ban',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: donnees.reason,
      snapshot,
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Creer une notification avec eventId
    const postId = req.body.postId;
    const notificationId = await createSanctionNotification({
      targetUserId: target._id,
      sanctionType: 'ban',
      reason: donnees.reason,
      postId,
      actorId: moderator._id,
      actorRole: moderator.role,
      eventId,
    });

    res.status(200).json({
      succes: true,
      message: 'Utilisateur banni définitivement.',
      data: {
        eventId: eventId.toString(),
        bannedAt: target.bannedAt.toISOString(),
        banReason: target.banReason,
        notificationId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Débannir un utilisateur
 * POST /api/moderation/users/:id/unban
 */
export const unbanUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaUnbanUser.parse(req.body);

    // Generer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Verifier si cet eventId a deja ete traite
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] unbanUser eventId ${eventId} deja traite`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Seul un admin peut débannir
    if (!moderator.isAdmin()) {
      throw new ErreurAPI('Seul un administrateur peut débannir un utilisateur', 403);
    }

    if (!target.isBanned()) {
      throw new ErreurAPI("Cet utilisateur n'est pas banni", 400);
    }

    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';
    const snapshot = {
      before: { bannedAt: target.bannedAt?.toISOString(), banReason: target.banReason },
      after: { bannedAt: null, banReason: null },
    };

    target.bannedAt = null;
    target.banReason = undefined;
    await target.save();

    // Log de l'action avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'user:unban',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: donnees.reason || 'Débannissement',
      snapshot,
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Notification de débannissement avec eventId
    await createReverseSanctionNotification({
      targetUserId: target._id,
      reverseSanctionType: 'unban',
      reason: donnees.reason,
      actorId: moderator._id,
      actorRole: moderator.role,
      eventId,
    });

    res.status(200).json({
      succes: true,
      message: 'Utilisateur débanni.',
      data: { eventId: eventId.toString() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Changer le rôle d'un utilisateur
 * PATCH /api/moderation/users/:id/role
 */
export const changeUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaChangeRole.parse(req.body);

    // Vérifier la permission edit_roles
    if (!moderator.hasPermission('users:edit_roles')) {
      throw new ErreurAPI('Permission insuffisante pour modifier les rôles', 403);
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Ne pas se modifier soi-même
    if (target._id.equals(moderator._id)) {
      throw new ErreurAPI('Vous ne pouvez pas modifier votre propre rôle', 400);
    }

    const { ROLE_HIERARCHY } = await import('../../models/Utilisateur.js');
    const moderatorLevel = ROLE_HIERARCHY[moderator.role as keyof typeof ROLE_HIERARCHY] ?? 0;
    const targetCurrentLevel = ROLE_HIERARCHY[target.role as keyof typeof ROLE_HIERARCHY] ?? 0;
    const targetNewLevel = ROLE_HIERARCHY[donnees.newRole as keyof typeof ROLE_HIERARCHY] ?? 0;

    // Un admin_modo ne peut agir que sur des grades strictement inferieurs au sien
    if (targetCurrentLevel >= moderatorLevel) {
      throw new ErreurAPI('Vous ne pouvez pas modifier le rôle d\'un membre de grade égal ou supérieur', 403);
    }

    // Un admin_modo ne peut promouvoir que jusqu'au grade juste en-dessous du sien
    if (targetNewLevel >= moderatorLevel) {
      throw new ErreurAPI('Vous ne pouvez pas promouvoir au-delà de votre propre grade', 403);
    }

    const oldRole = target.role;
    target.role = donnees.newRole;
    await target.save();

    // Log de l'action
    await auditLogger.actions.changeRole(req, target._id, oldRole, donnees.newRole, donnees.reason);

    res.status(200).json({
      succes: true,
      message: `Rôle modifié de "${oldRole}" à "${donnees.newRole}".`,
      data: {
        oldRole,
        newRole: donnees.newRole,
      },
    });
  } catch (error) {
    next(error);
  }
};
