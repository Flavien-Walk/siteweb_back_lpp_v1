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
  | 'systeme';

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
