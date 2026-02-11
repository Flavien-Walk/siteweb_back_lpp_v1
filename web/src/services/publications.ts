import api from './api';
import type { ReponseAPI } from './api';

export interface Auteur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
  role?: string;
  statut?: string;
}

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export interface Publication {
  _id: string;
  auteur: Auteur;
  auteurType: 'Utilisateur' | 'Projet';
  type: 'post' | 'annonce' | 'update' | 'editorial' | 'live-extrait';
  contenu: string;
  media?: string;
  medias: MediaItem[];
  nbLikes: number;
  nbCommentaires: number;
  aLike: boolean;
  dateCreation: string;
}

export interface Commentaire {
  _id: string;
  auteur: Auteur;
  contenu: string;
  nbLikes: number;
  aLike: boolean;
  reponseA?: string;
  reponses?: Commentaire[];
  modifie?: boolean;
  dateCreation: string;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const getPublications = async (page = 1, limit = 20, type?: string): Promise<ReponseAPI<{ publications: Publication[]; pagination: PaginationData }>> => {
  let endpoint = `/publications?page=${page}&limit=${limit}`;
  if (type) endpoint += `&type=${type}`;
  return api.get(endpoint, true);
};

export const getPublication = async (id: string): Promise<ReponseAPI<{ publication: Publication }>> => {
  return api.get(`/publications/${id}`, true);
};

export const getPublicationsUtilisateur = async (userId: string, page = 1, limit = 20): Promise<ReponseAPI<{ publications: Publication[]; pagination: PaginationData }>> => {
  return api.get(`/publications?auteur=${userId}&page=${page}&limit=${limit}`, true);
};

export const creerPublication = async (contenu: string, medias?: string[]): Promise<ReponseAPI<{ publication: Publication }>> => {
  if (medias && medias.length > 0) {
    return api.post('/publications', { contenu, medias, type: 'post' }, true);
  }
  return api.post('/publications', { contenu, type: 'post' }, true);
};

export const supprimerPublication = async (id: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/publications/${id}`, true);
};

export const toggleLikePublication = async (id: string): Promise<ReponseAPI<{ aLike: boolean; nbLikes: number }>> => {
  return api.post(`/publications/${id}/like`, {}, true);
};

export const getCommentaires = async (publicationId: string, page = 1, limit = 20): Promise<ReponseAPI<{ commentaires: Commentaire[]; pagination: PaginationData }>> => {
  return api.get(`/publications/${publicationId}/commentaires?page=${page}&limit=${limit}`, true);
};

export const ajouterCommentaire = async (publicationId: string, contenu: string, reponseA?: string): Promise<ReponseAPI<{ commentaire: Commentaire }>> => {
  return api.post(`/publications/${publicationId}/commentaires`, { contenu, reponseA }, true);
};

export const supprimerCommentaire = async (publicationId: string, commentaireId: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/publications/${publicationId}/commentaires/${commentaireId}`, true);
};

export const toggleLikeCommentaire = async (publicationId: string, commentaireId: string): Promise<ReponseAPI<{ aLike: boolean; nbLikes: number }>> => {
  return api.post(`/publications/${publicationId}/commentaires/${commentaireId}/like`, {}, true);
};

export type RaisonSignalement = 'spam' | 'harcelement' | 'contenu_inapproprie' | 'fausse_info' | 'nudite' | 'violence' | 'haine' | 'autre';

export const modifierPublication = async (id: string, contenu: string): Promise<ReponseAPI<{ publication: Publication }>> => {
  return api.patch(`/publications/${id}`, { contenu }, true);
};

export const modifierCommentaire = async (publicationId: string, commentaireId: string, contenu: string): Promise<ReponseAPI<{ commentaire: Commentaire }>> => {
  return api.patch(`/publications/${publicationId}/commentaires/${commentaireId}`, { contenu }, true);
};

export const signalerPublication = async (publicationId: string, raison: RaisonSignalement, details?: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post('/reports', { targetType: 'post', targetId: publicationId, reason: raison, details }, true);
};
