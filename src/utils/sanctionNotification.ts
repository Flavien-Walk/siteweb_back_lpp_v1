/**
 * Utilitaire pour creer des notifications de sanction
 * Permet de notifier un utilisateur lorsqu'il recoit une sanction (ban, suspend, warn)
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
}

/**
 * Creer une notification de sanction pour un utilisateur
 * Capture un snapshot du post AVANT suppression si applicable
 */
export async function createSanctionNotification(params: SanctionNotificationParams): Promise<mongoose.Types.ObjectId | null> {
  const { targetUserId, sanctionType, reason, suspendedUntil, postId, actorId, actorRole } = params;

  try {
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

    console.log(`[SanctionNotification] Notification creee: ${notification._id} pour user ${targetUserId}`);
    return notification._id;
  } catch (error) {
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
