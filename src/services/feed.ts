import api from './api';

export interface Publication {
  _id: string;
  auteur: { prenom: string; nom: string; avatar?: string } | { nom: string; image?: string };
  auteurType: 'Utilisateur' | 'Projet';
  type: 'annonce' | 'update' | 'editorial' | 'live-extrait';
  contenu: string;
  media?: string;
  projet?: { _id: string; nom: string; image?: string };
  likes: string[];
  dateCreation: string;
}

interface PaginatedFeed {
  publications: Publication[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const getFeed = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<PaginatedFeed>(`/feed${query}`, true);
};
