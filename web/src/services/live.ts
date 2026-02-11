import api, { ReponseAPI } from './api';

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

export const getActiveLives = async (): Promise<ReponseAPI<{ lives: Live[] }>> => {
  return api.get('/live/active', true);
};

export const getAgoraToken = async (channelName: string, role: 'publisher' | 'subscriber'): Promise<ReponseAPI<AgoraCredentials>> => {
  return api.post('/live/token', { channelName, role }, true);
};

export const joinLive = async (liveId: string): Promise<ReponseAPI<{ viewerCount: number }>> => {
  return api.post(`/live/${liveId}/join`, {}, true);
};

export const leaveLive = async (liveId: string): Promise<ReponseAPI<{ viewerCount: number }>> => {
  return api.post(`/live/${liveId}/leave`, {}, true);
};

export const formatLiveDuration = (startedAt: string): string => {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const LIVE_THUMBNAILS = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop&q=80',
];
