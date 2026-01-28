import api from './api';

export interface Notification {
  _id: string;
  type: 'projet-update' | 'annonce' | 'live-rappel' | 'interaction' | 'like' | 'follow';
  titre: string;
  message: string;
  lien?: string;
  lue: boolean;
  dateCreation: string;
}

interface PaginatedNotifications {
  notifications: Notification[];
  nonLues: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const getNotifications = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<PaginatedNotifications>(`/notifications${query}`, true);
};

export const marquerLue = (id: string) =>
  api.patch<{ notification: Notification }>(`/notifications/${id}/lue`, {}, true);

export const marquerToutLu = () =>
  api.patch<void>('/notifications/lire-tout', {}, true);

export const supprimerNotification = (id: string) =>
  api.delete<void>(`/notifications/${id}`, true);

export const supprimerToutesNotifications = () =>
  api.delete<void>('/notifications/toutes', true);
