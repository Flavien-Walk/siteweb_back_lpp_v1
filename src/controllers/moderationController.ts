import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Utilisateur, { IUtilisateur, IWarning, ROLE_HIERARCHY, Role, Permission } from '../models/Utilisateur.js';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import AuditLog from '../models/AuditLog.js';
import Report from '../models/Report.js';
import { auditLogger } from '../utils/auditLogger.js';
import { createSanctionNotification, createReverseSanctionNotification } from '../utils/sanctionNotification.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

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

const schemaAddPermission = z.object({
  permission: z.string(),
  reason: z.string().max(500).optional(),
});

// ============ HELPERS ============

/**
 * Vérifie que le modérateur peut agir sur la cible
 * (ne peut pas agir sur quelqu'un de niveau supérieur ou égal)
 */
const canModerate = (moderator: IUtilisateur, target: IUtilisateur): boolean => {
  // super_admin peut tout faire
  if (moderator.role === 'super_admin') return true;
  // Un modo ne peut pas modérer quelqu'un de niveau >= au sien
  return moderator.getRoleLevel() > target.getRoleLevel();
};

/**
 * Generer ou extraire un eventId pour idempotency
 * Si le header X-Event-Id est fourni, l'utiliser
 * Sinon, generer un nouveau ObjectId
 */
const getOrCreateEventId = (req: Request): mongoose.Types.ObjectId => {
  const headerEventId = req.headers['x-event-id'] as string | undefined;
  if (headerEventId && mongoose.Types.ObjectId.isValid(headerEventId)) {
    return new mongoose.Types.ObjectId(headerEventId);
  }
  return new mongoose.Types.ObjectId();
};

/**
 * Verifier si un eventId a deja ete traite (idempotency check)
 * Retourne true si l'action a deja ete executee
 */
const isEventIdAlreadyProcessed = async (eventId: mongoose.Types.ObjectId): Promise<boolean> => {
  const existing = await AuditLog.findOne({ eventId }).lean();
  return !!existing;
};

// ============ CONSTANTES SYSTEME AUTO-ESCALADE ============

const AUTO_SUSPENSION_DURATION_HOURS = 7 * 24; // 7 jours en heures
const WARNINGS_BEFORE_AUTO_SUSPENSION = 3;

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

    target.warnings.push(warning);

    // Initialiser moderation si necessaire
    if (!target.moderation) {
      target.moderation = {
        status: 'active',
        warnCountSinceLastAutoSuspension: 0,
        autoSuspensionsCount: 0,
        updatedAt: new Date(),
      };
    }

    // Incrementer le compteur de warnings depuis la derniere auto-suspension
    target.moderation.warnCountSinceLastAutoSuspension += 1;
    target.moderation.updatedAt = new Date();

    await target.save();

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
    target.warnings.splice(warningIndex, 1);

    // Decrementer le compteur de warnings si positif
    if (target.moderation && target.moderation.warnCountSinceLastAutoSuspension > 0) {
      target.moderation.warnCountSinceLastAutoSuspension -= 1;
      target.moderation.updatedAt = new Date();
    }

    await target.save();

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

    // Seul un super_admin peut changer les rôles
    if (moderator.role !== 'super_admin') {
      throw new ErreurAPI('Seul un super administrateur peut modifier les rôles', 403);
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Ne pas se rétrograder soi-même
    if (target._id.equals(moderator._id) && donnees.newRole !== 'super_admin') {
      throw new ErreurAPI('Vous ne pouvez pas vous rétrograder vous-même', 400);
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

// ============ ACTIONS SUR LE CONTENU ============

/**
 * Masquer une publication
 * POST /api/moderation/content/publication/:id/hide
 */
export const hidePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const moderator = req.utilisateur!;
    const reason = req.body.reason as string | undefined;
    const relatedReport = req.body.reportId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvée', 404);
    }

    // Vérifier si déjà masquée
    if ((publication as any).isHidden) {
      throw new ErreurAPI('Cette publication est déjà masquée', 400);
    }

    (publication as any).isHidden = true;
    await publication.save();

    // Log de l'action
    await auditLogger.actions.hideContent(
      req,
      'publication',
      publication._id,
      reason || 'Contenu masqué par la modération',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Publication masquée.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Afficher une publication masquée
 * POST /api/moderation/content/publication/:id/unhide
 */
export const unhidePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const reason = req.body.reason as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvée', 404);
    }

    if (!(publication as any).isHidden) {
      throw new ErreurAPI("Cette publication n'est pas masquée", 400);
    }

    (publication as any).isHidden = false;
    await publication.save();

    // Log de l'action
    await auditLogger.log(req, {
      action: 'content:unhide',
      targetType: 'publication',
      targetId: publication._id,
      reason: reason || 'Contenu réaffiché par la modération',
    });

    res.status(200).json({
      succes: true,
      message: 'Publication réaffichée.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer définitivement une publication
 * DELETE /api/moderation/content/publication/:id
 */
export const deletePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const reason = req.body.reason as string | undefined;
    const relatedReport = req.body.reportId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvée', 404);
    }

    // Sauvegarder les infos pour le log avant suppression
    const publicationSnapshot = {
      _id: publication._id,
      auteur: publication.auteur,
      contenu: (publication as any).contenu,
    };

    // Supprimer les commentaires associés
    await Commentaire.deleteMany({ publication: publicationId });

    // Supprimer la publication
    await publication.deleteOne();

    // Log de l'action
    await auditLogger.actions.deleteContent(
      req,
      'publication',
      new mongoose.Types.ObjectId(publicationId),
      reason || 'Contenu supprimé par la modération',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Publication et commentaires associés supprimés.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un commentaire
 * DELETE /api/moderation/content/commentaire/:id
 */
export const deleteCommentaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commentaireId = req.params.id;
    const reason = req.body.reason as string | undefined;
    const relatedReport = req.body.reportId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(commentaireId)) {
      throw new ErreurAPI('ID commentaire invalide', 400);
    }

    const commentaire = await Commentaire.findById(commentaireId);
    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouvé', 404);
    }

    await commentaire.deleteOne();

    // Log de l'action
    await auditLogger.actions.deleteContent(
      req,
      'commentaire',
      new mongoose.Types.ObjectId(commentaireId),
      reason || 'Commentaire supprimé par la modération',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Commentaire supprimé.',
    });
  } catch (error) {
    next(error);
  }
};

// ============ CONSULTATION UTILISATEURS ============

/**
 * Obtenir les détails de modération d'un utilisateur
 * GET /api/moderation/users/:id
 */
export const getUserModerationDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const user = await Utilisateur.findById(userId)
      .select('prenom nom email avatar role permissions bannedAt banReason suspendedUntil suspendReason warnings moderation dateCreation')
      .populate('warnings.issuedBy', '_id prenom nom');

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Filtrer les warnings expirés pour le comptage actif
    const now = new Date();
    const activeWarnings = user.warnings.filter(
      (w) => !w.expiresAt || new Date(w.expiresAt) > now
    );

    // Calculer warnings avant prochaine sanction
    const warnCount = user.moderation?.warnCountSinceLastAutoSuspension || 0;
    const warningsBeforeNextSanction = Math.max(0, WARNINGS_BEFORE_AUTO_SUSPENSION - warnCount);

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          permissions: user.permissions,
          dateCreation: user.dateCreation,
        },
        moderation: {
          status: user.moderation?.status || 'active',
          isBanned: user.isBanned(),
          bannedAt: user.bannedAt,
          banReason: user.banReason,
          isSuspended: user.isSuspended(),
          suspendedUntil: user.suspendedUntil,
          suspendReason: user.suspendReason,
          warnings: user.warnings,
          activeWarningsCount: activeWarnings.length,
          totalWarningsCount: user.warnings.length,
          // Champs pour le systeme d'auto-escalade
          warnCountSinceLastAutoSuspension: warnCount,
          warningsBeforeNextSanction,
          autoSuspensionsCount: user.moderation?.autoSuspensionsCount || 0,
          lastAutoActionAt: user.moderation?.lastAutoActionAt || null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lister les utilisateurs avec filtres de modération
 * GET /api/moderation/users
 */
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Filtres
    const filter: Record<string, unknown> = {};

    // Filtre par statut
    const status = req.query.status as string;
    if (status === 'banned') {
      filter.bannedAt = { $ne: null };
    } else if (status === 'suspended') {
      filter.suspendedUntil = { $gt: new Date() };
    } else if (status === 'active') {
      filter.bannedAt = null;
      filter.$or = [
        { suspendedUntil: null },
        { suspendedUntil: { $lte: new Date() } },
      ];
    }

    // Filtre par rôle
    const role = req.query.role as string;
    if (role && ['user', 'modo_test', 'modo', 'admin_modo', 'super_admin'].includes(role)) {
      filter.role = role;
    }

    // Recherche par nom/email
    const search = req.query.search as string;
    if (search && search.length >= 2) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { prenom: searchRegex },
        { nom: searchRegex },
        { email: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      Utilisateur.find(filter)
        .select('_id prenom nom email avatar role bannedAt banReason suspendedUntil suspendReason warnings dateCreation')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Utilisateur.countDocuments(filter),
    ]);

    // Enrichir avec le statut de modération
    const enrichedUsers = users.map((user) => ({
      ...user,
      isBanned: user.bannedAt !== null,
      isSuspended: user.suspendedUntil ? new Date(user.suspendedUntil) > new Date() : false,
      warningsCount: user.warnings?.length || 0,
    }));

    res.status(200).json({
      succes: true,
      data: {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ AUDIT & HISTORIQUE UTILISATEUR ============

/**
 * Récupérer l'historique d'audit d'un utilisateur
 * GET /api/admin/users/:id/audit
 *
 * Retourne toutes les entrées AuditLog où:
 * - targetType = 'utilisateur' && targetId = userId
 * - OU actions sur du contenu appartenant à cet utilisateur
 */
export const getUserAuditHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Vérifier que l'utilisateur existe
    const user = await Utilisateur.findById(userId).select('_id prenom nom');
    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    // Filtres optionnels
    const actionFilter = req.query.action as string;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;

    // Récupérer les publications/commentaires de l'utilisateur pour inclure les actions sur son contenu
    const userPublications = await Publication.find({ auteur: userId }).select('_id').lean();
    const userCommentaires = await Commentaire.find({ auteur: userId }).select('_id').lean();

    const pubIds = userPublications.map(p => p._id);
    const comIds = userCommentaires.map(c => c._id);

    // Construire la query
    const query: Record<string, unknown> = {
      $or: [
        // Actions directes sur l'utilisateur
        { targetType: 'utilisateur', targetId: new mongoose.Types.ObjectId(userId) },
        // Actions sur ses publications
        ...(pubIds.length > 0 ? [{ targetType: 'publication', targetId: { $in: pubIds } }] : []),
        // Actions sur ses commentaires
        ...(comIds.length > 0 ? [{ targetType: 'commentaire', targetId: { $in: comIds } }] : []),
      ],
    };

    // Filtre par action si spécifié
    if (actionFilter) {
      query.action = actionFilter;
    }

    // Filtre par dates
    if (dateFrom || dateTo) {
      query.dateCreation = {};
      if (dateFrom) (query.dateCreation as Record<string, Date>).$gte = dateFrom;
      if (dateTo) (query.dateCreation as Record<string, Date>).$lte = dateTo;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', '_id prenom nom avatar role')
        .populate('relatedReport', '_id raison status')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
        },
        logs: logs.map(log => ({
          _id: log._id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          reason: log.reason,
          metadata: log.metadata,
          snapshot: log.snapshot,
          moderator: log.actor,
          relatedReport: log.relatedReport,
          createdAt: log.dateCreation,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer une timeline synthétique de modération d'un utilisateur
 * GET /api/admin/users/:id/timeline
 *
 * Vue synthétique et chronologique:
 * - Avertissements
 * - Suspensions
 * - Bans/Débans
 * - Reports majeurs (ayant abouti à une action)
 */
export const getUserModerationTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Récupérer l'utilisateur avec ses warnings
    const user = await Utilisateur.findById(userId)
      .select('_id prenom nom email avatar role bannedAt banReason suspendedUntil suspendReason warnings dateCreation')
      .populate('warnings.issuedBy', '_id prenom nom')
      .lean();

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Récupérer les actions de modération importantes
    const moderationActions = await AuditLog.find({
      targetType: 'utilisateur',
      targetId: new mongoose.Types.ObjectId(userId),
      action: { $in: ['user:warn', 'user:suspend', 'user:unsuspend', 'user:ban', 'user:unban', 'user:role_change'] },
    })
      .populate('actor', '_id prenom nom')
      .sort({ dateCreation: -1 })
      .limit(100)
      .lean();

    // Récupérer les reports ayant abouti à une action sur cet utilisateur
    const actionedReports = await Report.find({
      targetType: 'utilisateur',
      targetId: new mongoose.Types.ObjectId(userId),
      status: 'action_taken',
    })
      .populate('moderatedBy', '_id prenom nom')
      .sort({ moderatedAt: -1 })
      .limit(50)
      .lean();

    // Construire la timeline
    const timeline: Array<{
      type: string;
      date: Date;
      action?: string;
      reason?: string;
      moderator?: { _id: string; prenom: string; nom: string } | null;
      details?: Record<string, unknown>;
    }> = [];

    // Ajouter les warnings de l'utilisateur
    if (user.warnings) {
      for (const warning of user.warnings) {
        const issuedByData = warning.issuedBy as unknown as { _id: string; prenom: string; nom: string } | null;
        timeline.push({
          type: 'warning',
          date: new Date(warning.issuedAt),
          action: 'user:warn',
          reason: warning.reason,
          moderator: issuedByData || null,
          details: {
            warningId: warning._id,
            expiresAt: warning.expiresAt,
          },
        });
      }
    }

    // Ajouter les actions de modération
    for (const action of moderationActions) {
      const actorData = action.actor as unknown as { _id: string; prenom: string; nom: string } | null;
      timeline.push({
        type: 'moderation_action',
        date: action.dateCreation,
        action: action.action,
        reason: action.reason,
        moderator: actorData || null,
        details: {
          snapshot: action.snapshot,
          metadata: action.metadata,
        },
      });
    }

    // Ajouter les reports ayant abouti à une action
    for (const report of actionedReports) {
      const moderatedByData = report.moderatedBy as unknown as { _id: string; prenom: string; nom: string } | null;
      timeline.push({
        type: 'report_action',
        date: report.moderatedAt || report.dateCreation,
        action: 'report:action_taken',
        reason: report.reason,
        moderator: moderatedByData || null,
        details: {
          reportId: report._id,
          reportReason: report.reason,
          actionTaken: report.action,
        },
      });
    }

    // Trier par date décroissante
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Stats résumé
    const summary = {
      totalWarnings: user.warnings?.length || 0,
      activeWarnings: user.warnings?.filter(w => !w.expiresAt || new Date(w.expiresAt) > new Date()).length || 0,
      totalSuspensions: moderationActions.filter(a => a.action === 'user:suspend').length,
      totalBans: moderationActions.filter(a => a.action === 'user:ban').length,
      currentlyBanned: !!user.bannedAt,
      currentlySuspended: user.suspendedUntil ? new Date(user.suspendedUntil) > new Date() : false,
      accountAge: Math.floor((Date.now() - new Date(user.dateCreation).getTime()) / (1000 * 60 * 60 * 24)),
    };

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          dateCreation: user.dateCreation,
        },
        status: {
          bannedAt: user.bannedAt,
          banReason: user.banReason,
          suspendedUntil: user.suspendedUntil,
          suspendReason: user.suspendReason,
        },
        summary,
        timeline: timeline.slice(0, 100), // Limiter à 100 entrées
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer l'activité complète d'un utilisateur
 * GET /api/admin/users/:id/activity
 *
 * Agrège:
 * - Publications créées
 * - Commentaires créés
 * - Reports envoyés
 * - Sanctions reçues (warnings, suspensions, bans)
 * - Audit logs où l'utilisateur est la cible
 *
 * Filtres disponibles:
 * - type: 'publication' | 'commentaire' | 'report' | 'sanction' | 'all'
 * - dateFrom, dateTo: filtrage par période
 */
export const getUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Vérifier que l'utilisateur existe
    const user = await Utilisateur.findById(userId)
      .select('_id prenom nom email avatar role bannedAt banReason suspendedUntil suspendReason warnings dateCreation')
      .lean();

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    // Filtres
    const typeFilter = req.query.type as string || 'all';
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;

    // Construire le filtre de date commun
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.$gte = dateFrom;
    if (dateTo) dateFilter.$lte = dateTo;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Structure pour collecter les activités
    interface ActivityItem {
      type: 'publication' | 'commentaire' | 'report_sent' | 'sanction';
      date: Date;
      data: Record<string, unknown>;
    }
    const activities: ActivityItem[] = [];

    // 1. Publications créées par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'publication') {
      const pubQuery: Record<string, unknown> = { auteur: new mongoose.Types.ObjectId(userId) };
      if (hasDateFilter) pubQuery.dateCreation = dateFilter;

      const publications = await Publication.find(pubQuery)
        .select('_id contenu medias dateCreation')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const pub of publications) {
        activities.push({
          type: 'publication',
          date: pub.dateCreation,
          data: {
            _id: pub._id,
            contenu: (pub as any).contenu?.substring(0, 200) || '',
            hasMedia: ((pub as any).medias?.length || 0) > 0,
            mediaCount: (pub as any).medias?.length || 0,
          },
        });
      }
    }

    // 2. Commentaires créés par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'commentaire') {
      const comQuery: Record<string, unknown> = { auteur: new mongoose.Types.ObjectId(userId) };
      if (hasDateFilter) comQuery.dateCreation = dateFilter;

      const commentaires = await Commentaire.find(comQuery)
        .select('_id contenu publication dateCreation')
        .populate('publication', '_id')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const com of commentaires) {
        activities.push({
          type: 'commentaire',
          date: com.dateCreation,
          data: {
            _id: com._id,
            contenu: (com as any).contenu?.substring(0, 200) || '',
            publicationId: (com.publication as any)?._id || null,
          },
        });
      }
    }

    // 3. Reports envoyés par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'report') {
      const reportQuery: Record<string, unknown> = { reporter: new mongoose.Types.ObjectId(userId) };
      if (hasDateFilter) reportQuery.dateCreation = dateFilter;

      const reports = await Report.find(reportQuery)
        .select('_id targetType targetId reason status dateCreation')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const report of reports) {
        activities.push({
          type: 'report_sent',
          date: report.dateCreation,
          data: {
            _id: report._id,
            targetType: report.targetType,
            targetId: report.targetId,
            reason: report.reason,
            status: report.status,
          },
        });
      }
    }

    // 4. Sanctions reçues (via AuditLog)
    if (typeFilter === 'all' || typeFilter === 'sanction') {
      const sanctionQuery: Record<string, unknown> = {
        targetType: 'utilisateur',
        targetId: new mongoose.Types.ObjectId(userId),
        action: { $in: ['user:warn', 'user:suspend', 'user:ban', 'user:unban', 'user:unsuspend'] },
      };
      if (hasDateFilter) sanctionQuery.dateCreation = dateFilter;

      const sanctions = await AuditLog.find(sanctionQuery)
        .populate('actor', '_id prenom nom')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const sanction of sanctions) {
        const actorData = sanction.actor as unknown as { _id: string; prenom: string; nom: string } | null;
        activities.push({
          type: 'sanction',
          date: sanction.dateCreation,
          data: {
            _id: sanction._id,
            action: sanction.action,
            reason: sanction.reason,
            moderator: actorData ? { _id: actorData._id, prenom: actorData.prenom, nom: actorData.nom } : null,
            snapshot: sanction.snapshot,
          },
        });
      }
    }

    // Trier par date décroissante
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination manuelle sur les résultats agrégés
    const total = activities.length;
    const paginatedActivities = activities.slice((page - 1) * limit, page * limit);

    // Stats résumé
    const stats = {
      totalPublications: activities.filter(a => a.type === 'publication').length,
      totalCommentaires: activities.filter(a => a.type === 'commentaire').length,
      totalReportsSent: activities.filter(a => a.type === 'report_sent').length,
      totalSanctions: activities.filter(a => a.type === 'sanction').length,
    };

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          dateCreation: user.dateCreation,
        },
        stats,
        activities: paginatedActivities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques globales des utilisateurs
 * GET /api/admin/users/stats
 */
export const getUsersStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();

    // Exécuter toutes les requêtes en parallèle pour la performance
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      roleStats,
      registrationStats,
      warningStats,
    ] = await Promise.all([
      // Total des utilisateurs
      Utilisateur.countDocuments(),

      // Utilisateurs actifs (ni bannis, ni suspendus)
      Utilisateur.countDocuments({
        bannedAt: null,
        $or: [
          { suspendedUntil: null },
          { suspendedUntil: { $lte: now } },
        ],
      }),

      // Utilisateurs suspendus
      Utilisateur.countDocuments({
        suspendedUntil: { $gt: now },
        bannedAt: null,
      }),

      // Utilisateurs bannis
      Utilisateur.countDocuments({
        bannedAt: { $ne: null },
      }),

      // Répartition par rôle
      Utilisateur.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Inscriptions des 30 derniers jours
      Utilisateur.aggregate([
        {
          $match: {
            dateCreation: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$dateCreation' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Utilisateurs avec des avertissements actifs
      Utilisateur.aggregate([
        { $unwind: '$warnings' },
        {
          $match: {
            $or: [
              { 'warnings.expiresAt': null },
              { 'warnings.expiresAt': { $gt: now } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            usersWithActiveWarnings: { $addToSet: '$_id' },
            totalActiveWarnings: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Formater les stats par rôle
    const byRole = roleStats.reduce(
      (acc: Record<string, number>, stat: { _id: string; count: number }) => {
        acc[stat._id] = stat.count;
        return acc;
      },
      {}
    );

    // Stats des avertissements
    const warningData = warningStats[0] || { usersWithActiveWarnings: [], totalActiveWarnings: 0 };

    res.status(200).json({
      succes: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        banned: bannedUsers,
        byRole,
        byStatus: {
          active: activeUsers,
          suspended: suspendedUsers,
          banned: bannedUsers,
        },
        warnings: {
          usersWithActiveWarnings: warningData.usersWithActiveWarnings.length,
          totalActiveWarnings: warningData.totalActiveWarnings,
        },
        registrations: {
          last30Days: registrationStats,
          total30Days: registrationStats.reduce(
            (sum: number, day: { count: number }) => sum + day.count,
            0
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les reports créés par un utilisateur (safe)
 * GET /api/admin/users/:id/reports
 */
export const getUserReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ reporter: new mongoose.Types.ObjectId(userId) })
        .select('_id targetType targetId reason status dateCreation moderatedAt')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments({ reporter: new mongoose.Types.ObjectId(userId) }),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
