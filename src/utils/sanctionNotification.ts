/**
 * Utilitaire pour creer des notifications de sanction
 * Permet de notifier un utilisateur lorsqu'il recoit une sanction (ban, suspend, warn)
 * ou lorsqu'une sanction est levee (unban, unsuspend, unwarn)
 */

import mongoose from 'mongoose';
import Notification, { TypeNotification, INotificationData } from '../models/Notification.js';
import Publication from '../models/Publication.js';

export interface SanctionNotificationParams {
  targetUserId: mongoose.Types.ObjectId | string;
  sanctionType: 'ban' | 'suspend' | 'warn';
  reason: string;
  suspendedUntil?: Date;
  postId?: mongoose.Types.ObjectId | string;
  actorId: mongoose.Types.ObjectId | string;
  actorRole: string;
  // EventId pour idempotency - si fourni, empeche les doublons
  eventId?: mongoose.Types.ObjectId | string;
}

export interface ReverseSanctionNotificationParams {
  targetUserId: mongoose.Types.ObjectId | string;
  reverseSanctionType: 'unban' | 'unsuspend' | 'unwarn';
  reason?: string;
  actorId: mongoose.Types.ObjectId | string;
  actorRole: string;
  // EventId pour idempotency - si fourni, empeche les doublons
  eventId?: mongoose.Types.ObjectId | string;
}

/**
 * Creer une notification de sanction pour un utilisateur
 * Capture un snapshot du post AVANT suppression si applicable
 *
 * IDEMPOTENCY: Si eventId est fourni et qu'une notification existe deja
 * avec ce eventId, retourne l'ID existant sans creer de doublon.
 */
export async function createSanctionNotification(params: SanctionNotificationParams): Promise<mongoose.Types.ObjectId | null> {
  const { targetUserId, sanctionType, reason, suspendedUntil, postId, actorId, actorRole, eventId } = params;

  try {
    // Si eventId fourni, verifier si notification existe deja (idempotency)
    if (eventId) {
      const existingNotification = await Notification.findOne({
        'data.eventId': eventId.toString(),
      }).lean();

      if (existingNotification) {
        console.log(`[SanctionNotification] Notification deja existante pour eventId ${eventId}, idempotency OK`);
        return existingNotification._id;
      }
    }

    // Determiner le type et titre de la notification
    let type: TypeNotification;
    let titre: string;
    let message: string;

    switch (sanctionType) {
      case 'ban':
        type = 'sanction_ban';
        titre = 'Compte suspendu definitivement';
        message = `Votre compte a ete suspendu definitivement. Raison : ${reason}`;
        break;
      case 'suspend':
        type = 'sanction_suspend';
        titre = 'Compte temporairement suspendu';
        message = `Votre compte a ete suspendu temporairement. Raison : ${reason}`;
        break;
      case 'warn':
        type = 'sanction_warn';
        titre = 'Avertissement recu';
        message = `Vous avez recu un avertissement. Raison : ${reason}`;
        break;
      default:
        console.error('[SanctionNotification] Type de sanction invalide:', sanctionType);
        return null;
    }

    // Preparer les donnees de la notification
    const notificationData: INotificationData = {
      sanctionType,
      reason,
      actorId: actorId.toString(),
      actorRole,
    };

    // Ajouter eventId si fourni (pour idempotency)
    if (eventId) {
      notificationData.eventId = eventId.toString();
    }

    // Ajouter la date de fin de suspension si applicable
    if (suspendedUntil) {
      notificationData.suspendedUntil = suspendedUntil.toISOString();
    }

    // Capturer un snapshot du post si un postId est fourni
    if (postId) {
      try {
        const post = await Publication.findById(postId).select('contenu media').lean();
        if (post) {
          notificationData.postId = postId.toString();
          notificationData.postSnapshot = {
            contenu: post.contenu ? post.contenu.substring(0, 140) + (post.contenu.length > 140 ? '...' : '') : undefined,
            mediaUrl: post.media && post.media.length > 0 ? post.media[0] : undefined,
          };
        }
      } catch (postError) {
        // Le post peut deja etre supprime, ce n'est pas une erreur critique
        console.log('[SanctionNotification] Post non trouve ou erreur:', postId);
        notificationData.postId = postId.toString();
      }
    }

    // Creer la notification
    const notification = await Notification.create({
      destinataire: new mongoose.Types.ObjectId(targetUserId.toString()),
      type,
      titre,
      message,
      data: notificationData,
      lue: false,
    });

    console.log(`[SanctionNotification] Notification creee: ${notification._id} pour user ${targetUserId} (eventId: ${eventId || 'none'})`);
    return notification._id;
  } catch (error: any) {
    // Gerer le cas de doublon MongoDB (erreur E11000)
    if (error?.code === 11000 && eventId) {
      console.log(`[SanctionNotification] Doublon detecte pour eventId ${eventId}, recuperation existante`);
      const existingNotification = await Notification.findOne({
        'data.eventId': eventId.toString(),
      }).lean();
      return existingNotification?._id || null;
    }
    console.error('[SanctionNotification] Erreur creation notification:', error);
    return null;
  }
}

/**
 * Obtenir la derniere notification de sanction pour un utilisateur
 */
export async function getLatestSanctionNotification(userId: mongoose.Types.ObjectId | string) {
  try {
    const notification = await Notification.findOne({
      destinataire: new mongoose.Types.ObjectId(userId.toString()),
      type: { $in: ['sanction_ban', 'sanction_suspend', 'sanction_warn'] },
    })
      .sort({ dateCreation: -1 })
      .lean();

    return notification;
  } catch (error) {
    console.error('[SanctionNotification] Erreur recuperation notification:', error);
    return null;
  }
}

// Mapping des roles vers des labels lisibles
const roleLabels: Record<string, string> = {
  user: 'Utilisateur',
  modo_test: 'Moderateur',
  modo: 'Moderateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
  admin: 'Administrateur', // Legacy
};

/**
 * Creer une notification de levee de sanction PAR UN STAFF
 * Inclut le role du staff dans le message
 *
 * IDEMPOTENCY: Si eventId est fourni et qu'une notification existe deja
 * avec ce eventId, retourne l'ID existant sans creer de doublon.
 */
export async function createReverseSanctionNotification(
  params: ReverseSanctionNotificationParams
): Promise<mongoose.Types.ObjectId | null> {
  const { targetUserId, reverseSanctionType, reason, actorId, actorRole, eventId } = params;

  try {
    // Si eventId fourni, verifier si notification existe deja (idempotency)
    if (eventId) {
      const existingNotification = await Notification.findOne({
        'data.eventId': eventId.toString(),
      }).lean();

      if (existingNotification) {
        console.log(`[SanctionNotification] Notification reverse deja existante pour eventId ${eventId}, idempotency OK`);
        return existingNotification._id;
      }
    }

    // Determiner le type et titre de la notification
    let type: TypeNotification;
    let titre: string;
    let message: string;
    const roleLabel = roleLabels[actorRole] || 'un membre du staff';

    switch (reverseSanctionType) {
      case 'unban':
        type = 'sanction_unban';
        titre = 'Compte retabli';
        message = reason
          ? `Votre compte a ete retabli par ${roleLabel}. Raison : ${reason}`
          : `Votre compte a ete retabli par ${roleLabel}. Vous pouvez a nouveau utiliser la plateforme.`;
        break;
      case 'unsuspend':
        type = 'sanction_unsuspend';
        titre = 'Suspension levee';
        message = reason
          ? `Votre suspension a ete levee par ${roleLabel}. Raison : ${reason}`
          : `Votre suspension a ete levee par ${roleLabel}. Vous pouvez a nouveau utiliser la plateforme.`;
        break;
      case 'unwarn':
        type = 'sanction_unwarn';
        titre = 'Avertissement retire';
        message = reason
          ? `Un avertissement a ete retire de votre compte par ${roleLabel}. Raison : ${reason}`
          : `Un avertissement a ete retire de votre compte par ${roleLabel}.`;
        break;
      default:
        console.error('[SanctionNotification] Type de reverse sanction invalide:', reverseSanctionType);
        return null;
    }

    // Preparer les donnees de la notification
    const notificationData: INotificationData = {
      sanctionType: reverseSanctionType,
      reason: reason || undefined,
      actorId: actorId.toString(),
      actorRole,
    };

    // Ajouter eventId si fourni (pour idempotency)
    if (eventId) {
      notificationData.eventId = eventId.toString();
    }

    // Creer la notification
    const notification = await Notification.create({
      destinataire: new mongoose.Types.ObjectId(targetUserId.toString()),
      type,
      titre,
      message,
      data: notificationData,
      lue: false,
    });

    console.log(`[SanctionNotification] Notification reverse creee: ${notification._id} pour user ${targetUserId} (eventId: ${eventId || 'none'})`);
    return notification._id;
  } catch (error: any) {
    // Gerer le cas de doublon MongoDB (erreur E11000)
    if (error?.code === 11000 && eventId) {
      console.log(`[SanctionNotification] Doublon reverse detecte pour eventId ${eventId}, recuperation existante`);
      const existingNotification = await Notification.findOne({
        'data.eventId': eventId.toString(),
      }).lean();
      return existingNotification?._id || null;
    }
    console.error('[SanctionNotification] Erreur creation notification reverse:', error);
    return null;
  }
}

/**
 * Creer une notification d'expiration NATURELLE de suspension
 * Appelee quand la suspension expire automatiquement (pas par un staff)
 */
export async function createSuspensionExpiredNotification(
  userId: mongoose.Types.ObjectId | string
): Promise<mongoose.Types.ObjectId | null> {
  try {
    const notification = await Notification.create({
      destinataire: new mongoose.Types.ObjectId(userId.toString()),
      type: 'sanction_unsuspend' as TypeNotification,
      titre: 'Suspension terminee',
      message: 'Votre periode de suspension est terminee. Vous pouvez a nouveau utiliser la plateforme.',
      data: {
        sanctionType: 'unsuspend',
      },
      lue: false,
    });

    console.log(`[SanctionNotification] Notification expiration naturelle creee: ${notification._id} pour user ${userId}`);
    return notification._id;
  } catch (error) {
    console.error('[SanctionNotification] Erreur creation notification expiration:', error);
    return null;
  }
}
