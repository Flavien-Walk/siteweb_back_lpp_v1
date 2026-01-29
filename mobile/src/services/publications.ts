/**
 * Service des publications
 * Gestion des posts et commentaires
 */

import api, { ReponseAPI } from './api';

// Types
export type Role = 'user' | 'admin';

export interface Auteur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
  role?: Role;
}

export interface Publication {
  _id: string;
  auteur: Auteur;
  auteurType: 'Utilisateur' | 'Projet';
  type: 'post' | 'annonce' | 'update' | 'editorial' | 'live-extrait';
  contenu: string;
  media?: string;
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

// ============ PUBLICATIONS ============

/**
 * Récupérer les publications
 */
export const getPublications = async (
  page = 1,
  limit = 20,
  type?: string
): Promise<ReponseAPI<{ publications: Publication[]; pagination: PaginationData }>> => {
  let endpoint = `/publications?page=${page}&limit=${limit}`;
  if (type) endpoint += `&type=${type}`;
  return api.get(endpoint, true);
};

/**
 * Récupérer une publication
 */
export const getPublication = async (
  id: string
): Promise<ReponseAPI<{ publication: Publication }>> => {
  return api.get(`/publications/${id}`, true);
};

/**
 * Créer une publication
 */
export const creerPublication = async (
  contenu: string,
  media?: string
): Promise<ReponseAPI<{ publication: Publication }>> => {
  return api.post('/publications', { contenu, media, type: 'post' }, true);
};

/**
 * Supprimer une publication
 */
export const supprimerPublication = async (
  id: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/publications/${id}`, true);
};

/**
 * Modifier une publication
 */
export const modifierPublication = async (
  id: string,
  contenu: string
): Promise<ReponseAPI<{ publication: Publication }>> => {
  return api.patch(`/publications/${id}`, { contenu }, true);
};

/**
 * Liker/unliker une publication
 */
export const toggleLikePublication = async (
  id: string
): Promise<ReponseAPI<{ aLike: boolean; nbLikes: number }>> => {
  return api.post(`/publications/${id}/like`, {}, true);
};

// ============ COMMENTAIRES ============

/**
 * Récupérer les commentaires d'une publication
 */
export const getCommentaires = async (
  publicationId: string,
  page = 1,
  limit = 20
): Promise<ReponseAPI<{ commentaires: Commentaire[]; pagination: PaginationData }>> => {
  return api.get(`/publications/${publicationId}/commentaires?page=${page}&limit=${limit}`, true);
};

/**
 * Ajouter un commentaire
 */
export const ajouterCommentaire = async (
  publicationId: string,
  contenu: string,
  reponseA?: string
): Promise<ReponseAPI<{ commentaire: Commentaire }>> => {
  return api.post(
    `/publications/${publicationId}/commentaires`,
    { contenu, reponseA },
    true
  );
};

/**
 * Supprimer un commentaire
 */
export const supprimerCommentaire = async (
  publicationId: string,
  commentaireId: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/publications/${publicationId}/commentaires/${commentaireId}`, true);
};

/**
 * Modifier un commentaire
 */
export const modifierCommentaire = async (
  publicationId: string,
  commentaireId: string,
  contenu: string
): Promise<ReponseAPI<{ commentaire: Commentaire }>> => {
  return api.patch(
    `/publications/${publicationId}/commentaires/${commentaireId}`,
    { contenu },
    true
  );
};

/**
 * Liker/unliker un commentaire
 */
export const toggleLikeCommentaire = async (
  publicationId: string,
  commentaireId: string
): Promise<ReponseAPI<{ aLike: boolean; nbLikes: number }>> => {
  return api.post(`/publications/${publicationId}/commentaires/${commentaireId}/like`, {}, true);
};

// ============ AVATARS ============

/**
 * Récupérer les avatars par défaut
 */
export const getAvatarsDefaut = async (): Promise<ReponseAPI<{ avatars: string[] }>> => {
  return api.get('/profil/avatars', false);
};

/**
 * Modifier l'avatar
 */
export const modifierAvatar = async (
  avatar: string | null
): Promise<ReponseAPI<{ utilisateur: Auteur }>> => {
  return api.patch('/profil/avatar', { avatar }, true);
};
