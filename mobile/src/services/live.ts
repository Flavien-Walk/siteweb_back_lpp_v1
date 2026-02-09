/**
 * Service Live - API pour les diffusions vidéo en direct
 * Gestion des lives vidéo/audio avec Agora
 */

import api, { ReponseAPI } from './api';

// ============ TYPES ============

export interface LiveHost {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export interface Live {
  _id: string;
  channelName: string;
  title?: string;
  thumbnail?: string;
  startedAt: string;
  viewerCount: number;
  host: LiveHost;
}

export interface AgoraCredentials {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
}

export interface StartLiveResponse {
  live: {
    _id: string;
    channelName: string;
    title?: string;
    status: string;
    startedAt: string;
  };
  agora: AgoraCredentials;
}

export interface EndLiveResponse {
  live: {
    _id: string;
    channelName: string;
    status: string;
    startedAt: string;
    endedAt: string;
    peakViewerCount: number;
  };
}

export interface LiveStatusResponse {
  isLive: boolean;
  live: {
    _id: string;
    channelName: string;
    title?: string;
    startedAt: string;
    viewerCount: number;
  } | null;
}

// ============ API CALLS ============

/**
 * Démarrer un nouveau live
 * @param title - Titre optionnel du live (max 100 caractères)
 */
export const startLive = async (
  title?: string
): Promise<ReponseAPI<StartLiveResponse>> => {
  return api.post('/live/start', { title }, true);
};

/**
 * Arrêter son live en cours
 */
export const endLive = async (): Promise<ReponseAPI<EndLiveResponse>> => {
  return api.post('/live/end', {}, true);
};

/**
 * Récupérer la liste des lives actifs
 */
export const getActiveLives = async (): Promise<
  ReponseAPI<{ lives: Live[] }>
> => {
  return api.get('/live/active', true);
};

/**
 * Obtenir un token Agora pour rejoindre un live
 * @param channelName - Nom du canal Agora
 * @param role - 'publisher' (hôte) ou 'subscriber' (viewer)
 */
export const getAgoraToken = async (
  channelName: string,
  role: 'publisher' | 'subscriber'
): Promise<ReponseAPI<AgoraCredentials>> => {
  return api.post('/live/token', { channelName, role }, true);
};

/**
 * Rejoindre un live (incrémente le compteur de viewers)
 * @param liveId - ID du live
 */
export const joinLive = async (
  liveId: string
): Promise<ReponseAPI<{ viewerCount: number }>> => {
  return api.post(`/live/${liveId}/join`, {}, true);
};

/**
 * Quitter un live (décrémente le compteur de viewers)
 * @param liveId - ID du live
 */
export const leaveLive = async (
  liveId: string
): Promise<ReponseAPI<{ viewerCount: number }>> => {
  return api.post(`/live/${liveId}/leave`, {}, true);
};

/**
 * Vérifier si un utilisateur est actuellement en live
 * @param userId - ID de l'utilisateur
 */
export const getUserLiveStatus = async (
  userId: string
): Promise<ReponseAPI<LiveStatusResponse>> => {
  return api.get(`/live/user/${userId}`, true);
};

// ============ IMAGES DE FOND LIVE ============

/** Images Unsplash libres de droits pour les fonds de LiveCard */
export const LIVE_THUMBNAILS = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&h=400&fit=crop&q=80',
];

/** Retourne une image de fond pour un live (par son index ou aléatoire) */
export const getLiveThumbnail = (index?: number): string => {
  const i = index !== undefined ? index % LIVE_THUMBNAILS.length : Math.floor(Math.random() * LIVE_THUMBNAILS.length);
  return LIVE_THUMBNAILS[i];
};

// ============ HELPERS ============

/**
 * Calculer la durée d'un live
 * @param startedAt - Date de début (ISO string)
 * @returns Durée formatée (ex: "1h 23m" ou "45m")
 */
export const formatLiveDuration = (startedAt: string): string => {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Formater le nombre de viewers pour l'affichage
 * @param count - Nombre de viewers
 * @returns Nombre formaté (ex: "1.2k" pour 1200)
 */
export const formatViewerCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
};
