/**
 * Service Notifications - La Première Pierre Mobile
 * Gestion des notifications utilisateur
 */

import { api, ReponseAPI } from './api';

// Types de notifications (extensible pour l'avenir)
export type TypeNotification =
  | 'demande_ami'
  | 'ami_accepte'
  | 'nouveau_message'
  | 'nouveau_commentaire'
  | 'nouveau_like'
  | 'like_commentaire'
  | 'projet_update'
  | 'systeme'
  // Types de sanctions
  | 'sanction_ban'
  | 'sanction_suspend'
  | 'sanction_warn'
  // Types de levée de sanctions
  | 'sanction_unban'
  | 'sanction_unsuspend'
  | 'sanction_unwarn'
  // Broadcast (notifications envoyées par l'équipe)
  | 'broadcast';

export interface Notification {
  _id: string;
  type: TypeNotification;
  titre: string;
  message: string;
  lue: boolean;
  dateCreation: string;
  // Données contextuelles selon le type
  data?: {
    userId?: string;
    userNom?: string;
    userPrenom?: string;
    userAvatar?: string;
    conversationId?: string;
    projetId?: string;
    publicationId?: string;
    commentaireId?: string;
    // Données de sanction
    sanctionType?: 'ban' | 'suspend' | 'warn' | 'unban' | 'unsuspend' | 'unwarn';
    reason?: string;
    suspendedUntil?: string;
    postId?: string;
    postSnapshot?: {
      contenu?: string;
      mediaUrl?: string;
    };
    actorId?: string;
    actorRole?: string;
    // Données broadcast
    broadcastBadge?: 'actu' | 'maintenance' | 'mise_a_jour' | 'evenement' | 'important';
    broadcastId?: string;
  };
}

interface NotificationsResponse {
  notifications: Notification[];
  nonLues: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface NotificationResponse {
  notification: Notification;
}

interface CompteNonLuesResponse {
  nonLues: number;
}

// ============ NOTIFICATIONS ============

/**
 * Récupérer toutes les notifications
 */
export const getNotifications = async (
  page = 1,
  limit = 20
): Promise<ReponseAPI<NotificationsResponse>> => {
  return api.get<NotificationsResponse>(
    `/notifications?page=${page}&limit=${limit}`,
    true
  );
};

/**
 * Récupérer le nombre de notifications non lues
 */
export const getCompteNonLues = async (): Promise<ReponseAPI<CompteNonLuesResponse>> => {
  return api.get<CompteNonLuesResponse>('/notifications/non-lues', true);
};

/**
 * Marquer une notification comme lue
 */
export const marquerNotificationLue = async (
  notificationId: string
): Promise<ReponseAPI<NotificationResponse>> => {
  return api.patch<NotificationResponse>(
    `/notifications/${notificationId}/lue`,
    {},
    true
  );
};

/**
 * Marquer toutes les notifications comme lues
 */
export const marquerToutesLues = async (): Promise<ReponseAPI<{ message: string }>> => {
  return api.patch<{ message: string }>('/notifications/lire-tout', {}, true);
};

/**
 * Supprimer une notification
 */
export const supprimerNotification = async (
  notificationId: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete<{ message: string }>(`/notifications/${notificationId}`, true);
};

/**
 * Supprimer toutes les notifications lues
 */
export const supprimerNotificationsLues = async (): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete<{ message: string }>('/notifications/lues', true);
};
