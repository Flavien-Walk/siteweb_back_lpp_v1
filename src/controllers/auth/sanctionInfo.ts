// sanctionInfo.ts - Informations et historique des sanctions utilisateur
// Endpoints accessibles meme si le compte est banni/suspendu

import { Request, Response, NextFunction } from 'express';
import { getLatestSanctionNotification } from '../../utils/sanctionNotification.js';
import Notification from '../../models/Notification.js';
import AuditLog from '../../models/AuditLog.js';

// Mapping des roles pour affichage
const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Moderateur',
  modo: 'Moderateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
  admin: 'Administrateur',
};

/**
 * Mapping AuditLog action -> type court pour mobile
 */
const auditActionToSanctionType: Record<string, string> = {
  'user:warn': 'warn',
  'user:warn_remove': 'unwarn',
  'user:suspend': 'suspend',
  'user:unsuspend': 'unsuspend',
  'user:ban': 'ban',
  'user:unban': 'unban',
};

/**
 * Mapping type court -> titre lisible
 */
const sanctionTypeTitles: Record<string, string> = {
  ban: 'Bannissement',
  unban: 'Compte retabli',
  suspend: 'Suspension',
  unsuspend: 'Suspension levee',
  warn: 'Avertissement',
  unwarn: 'Avertissement retire',
};

/**
 * Recuperer les informations de sanction d'un utilisateur
 * GET /api/auth/sanction-info
 *
 * Accessible meme si le compte est banni/suspendu (pas de checkUserStatus)
 * Permet au client mobile d'afficher la raison et le post concerne
 */
export const getSanctionInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;

    // Determiner le statut de restriction
    const isBanned = utilisateur.isBanned();
    const isSuspended = utilisateur.isSuspended();

    if (!isBanned && !isSuspended) {
      // Pas de sanction active
      res.status(200).json({
        succes: true,
        data: {
          isRestricted: false,
        },
      });
      return;
    }

    // Recuperer la derniere notification de sanction
    const notification = await getLatestSanctionNotification(utilisateur._id);

    // Construire la reponse
    const sanctionInfo: Record<string, unknown> = {
      isRestricted: true,
      type: isBanned ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      reason: isBanned ? utilisateur.banReason : utilisateur.suspendReason,
      bannedAt: isBanned ? utilisateur.bannedAt?.toISOString() : undefined,
      suspendedUntil: isSuspended ? utilisateur.suspendedUntil?.toISOString() : undefined,
    };

    // Ajouter les infos de la notification si presente
    if (notification) {
      sanctionInfo.notificationId = notification._id;
      sanctionInfo.notificationDate = notification.dateCreation;

      // Ajouter les infos du staff qui a pris la decision
      if (notification.data?.actorRole) {
        sanctionInfo.actorRole = notification.data.actorRole;
      }

      // Ajouter le snapshot du post si disponible
      if (notification.data?.postSnapshot) {
        sanctionInfo.postSnapshot = notification.data.postSnapshot;
        sanctionInfo.postId = notification.data.postId;
      }
    }

    res.status(200).json({
      succes: true,
      data: sanctionInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recuperer l'historique des sanctions de l'utilisateur
 * GET /api/auth/my-sanctions
 * Accessible meme si banni/suspendu (pas de checkUserStatus)
 *
 * Combine les donnees de:
 * 1. Notifications de type sanction (nouveau systeme)
 * 2. AuditLog (historique complet des sanctions)
 */
export const getMySanctions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;

    // === 1. Recuperer depuis les Notifications (nouveau systeme) ===
    const sanctionNotifTypes = [
      'sanction_ban',
      'sanction_suspend',
      'sanction_warn',
      'sanction_unban',
      'sanction_unsuspend',
      'sanction_unwarn',
    ];

    const notifications = await Notification.find({
      destinataire: utilisateur._id,
      type: { $in: sanctionNotifTypes },
    })
      .sort({ dateCreation: -1 })
      .lean();

    // Transformer les notifications
    const sanctionsFromNotifications = notifications.map((notif) => {
      const shortType = notif.type.replace('sanction_', '');
      return {
        type: shortType,
        createdAt: notif.dateCreation,
        titre: notif.titre,
        message: notif.message,
        reason: notif.data?.reason || null,
        actorRole: notif.data?.actorRole || null,
        suspendedUntil: notif.data?.suspendedUntil || null,
        postSnapshot: notif.data?.postSnapshot || null,
        postId: notif.data?.postId || null,
        source: 'notification' as const,
      };
    });

    // === 2. Recuperer depuis l'AuditLog (historique complet) ===
    const auditActions = [
      'user:warn',
      'user:warn_remove',
      'user:suspend',
      'user:unsuspend',
      'user:ban',
      'user:unban',
    ];

    const auditLogs = await AuditLog.find({
      targetType: 'utilisateur',
      targetId: utilisateur._id,
      action: { $in: auditActions },
    })
      .sort({ dateCreation: -1 })
      .lean();

    // Transformer les audit logs
    const sanctionsFromAuditLog = auditLogs.map((log) => {
      const shortType = auditActionToSanctionType[log.action] || 'warn';
      const titre = sanctionTypeTitles[shortType] || 'Sanction';

      // Generer un message descriptif
      let message = titre;
      if (log.reason) {
        message += ` - Raison: ${log.reason}`;
      }

      return {
        type: shortType,
        createdAt: log.dateCreation,
        titre,
        message,
        reason: log.reason || null,
        actorRole: log.actorRole || null,
        suspendedUntil: log.metadata?.suspendedUntil as string || null,
        postSnapshot: log.metadata?.postSnapshot as { contenu?: string; mediaUrl?: string } || null,
        postId: log.metadata?.postId as string || null,
        source: 'auditlog' as const,
      };
    });

    // === 3. Fusionner et dedupliquer ===
    // Type pour une sanction avec source
    type SanctionWithSource = {
      type: string;
      createdAt: Date;
      titre: string;
      message: string;
      reason: string | null;
      actorRole: string | null;
      suspendedUntil: string | null;
      postSnapshot: { contenu?: string; mediaUrl?: string } | null;
      postId: string | null;
      source: 'notification' | 'auditlog';
    };

    // On utilise une Map avec cle basee sur (type + date arrondie a la MINUTE)
    // pour eviter les doublons entre notifications et audit logs
    // Une sanction du meme type dans la meme minute = probablement la meme sanction
    const sanctionsMap = new Map<string, SanctionWithSource>();

    // D'abord ajouter les notifications (prioritaires car plus detaillees)
    for (const s of sanctionsFromNotifications) {
      // Tronquer a la minute (slice(0, 16) = YYYY-MM-DDTHH:MM)
      const dateKey = new Date(s.createdAt).toISOString().slice(0, 16);
      const key = `${s.type}-${dateKey}`;
      sanctionsMap.set(key, s as SanctionWithSource);
    }

    // Ensuite ajouter les audit logs seulement si pas deja present
    for (const s of sanctionsFromAuditLog) {
      const dateKey = new Date(s.createdAt).toISOString().slice(0, 16);
      const key = `${s.type}-${dateKey}`;
      if (!sanctionsMap.has(key)) {
        sanctionsMap.set(key, s);
      }
    }

    // Convertir en array et trier par date decroissante
    const sanctions = Array.from(sanctionsMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(({ source, ...rest }) => rest); // Retirer le champ source avant envoi

    res.status(200).json({
      succes: true,
      data: {
        sanctions,
        total: sanctions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recuperer le statut de moderation de l'utilisateur connecte
 * GET /api/auth/moderation-status
 *
 * Accessible meme si banni/suspendu (pas de checkUserStatus)
 * Permet au mobile d'afficher le compteur d'avertissements (ex: "2/3")
 *
 * Retourne:
 * - status: 'active' | 'suspended' | 'banned'
 * - warnCountSinceLastAutoSuspension: nombre de warnings depuis derniere auto-suspension
 * - warningsBeforeNextSanction: nombre de warnings restants avant prochaine sanction auto (3 - count)
 * - autoSuspensionsCount: 0 si jamais auto-suspendu, 1 si deja auto-suspendu
 * - nextAutoAction: 'suspend' si autoSuspensionsCount=0, 'ban' si autoSuspensionsCount=1
 */
export const getModerationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const utilisateur = req.utilisateur!;

    // Determiner le statut actuel
    let status: 'active' | 'suspended' | 'banned' = 'active';
    if (utilisateur.isBanned()) {
      status = 'banned';
    } else if (utilisateur.isSuspended()) {
      status = 'suspended';
    }

    // Recuperer les donnees de moderation
    const moderation = utilisateur.moderation || {
      warnCountSinceLastAutoSuspension: 0,
      autoSuspensionsCount: 0,
    };

    const warnCount = moderation.warnCountSinceLastAutoSuspension || 0;
    const autoSuspensions = moderation.autoSuspensionsCount || 0;

    // Calculer le nombre de warnings restants avant prochaine sanction auto
    const WARNINGS_BEFORE_AUTO_SUSPENSION = 3;
    const warningsBeforeNextSanction = Math.max(0, WARNINGS_BEFORE_AUTO_SUSPENSION - warnCount);

    // Determiner quelle sera la prochaine action auto
    // Si pas encore auto-suspendu (0), prochaine action = suspend
    // Si deja auto-suspendu (1), prochaine action = ban
    const nextAutoAction = autoSuspensions === 0 ? 'suspend' : 'ban';

    res.status(200).json({
      succes: true,
      data: {
        status,
        warnCountSinceLastAutoSuspension: warnCount,
        warningsBeforeNextSanction,
        autoSuspensionsCount: autoSuspensions,
        nextAutoAction,
        // Infos supplementaires si suspendu
        ...(status === 'suspended' && {
          suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
          suspendReason: utilisateur.suspendReason,
        }),
        // Infos supplementaires si banni
        ...(status === 'banned' && {
          bannedAt: utilisateur.bannedAt?.toISOString(),
          banReason: utilisateur.banReason,
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};
