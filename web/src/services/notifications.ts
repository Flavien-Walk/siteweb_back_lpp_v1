import api from './api';
import type { ReponseAPI } from './api';

export type TypeNotification = 'demande_ami' | 'ami_accepte' | 'nouveau_message' | 'nouveau_commentaire' | 'nouveau_like' | 'like_commentaire' | 'projet-update' | 'project_follow' | 'annonce' | 'live-rappel' | 'interaction' | 'systeme' | 'sanction_ban' | 'sanction_suspend' | 'sanction_warn' | 'sanction_unban' | 'sanction_unsuspend' | 'sanction_unwarn' | 'moderation' | 'broadcast';

export interface Notification {
  _id: string;
  type: TypeNotification;
  titre: string;
  message: string;
  lue: boolean;
  dateCreation: string;
  data?: {
    userId?: string;
    userNom?: string;
    userPrenom?: string;
    userAvatar?: string;
    conversationId?: string;
    projetId?: string;
    publicationId?: string;
    commentaireId?: string;
    broadcastBadge?: string;
  };
}

export const getNotifications = async (page = 1, limit = 20): Promise<ReponseAPI<{ notifications: Notification[]; nonLues: number }>> => {
  return api.get(`/notifications?page=${page}&limit=${limit}`, true);
};

export const getCompteNonLues = async (): Promise<ReponseAPI<{ nonLues: number }>> => {
  return api.get('/notifications/non-lues', true);
};

export const marquerNotificationLue = async (id: string): Promise<ReponseAPI<{ notification: Notification }>> => {
  return api.patch(`/notifications/${id}/lue`, {}, true);
};

export const marquerToutesLues = async (): Promise<ReponseAPI<{ message: string }>> => {
  return api.patch('/notifications/lire-tout', {}, true);
};

export const supprimerNotification = async (id: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/notifications/${id}`, true);
};
