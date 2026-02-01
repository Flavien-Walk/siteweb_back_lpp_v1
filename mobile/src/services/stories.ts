/**
 * Service des Stories
 * Gestion des stories Instagram-like (photo/vidéo 24h)
 */

import api, { ReponseAPI } from './api';

// Types
export type TypeStory = 'photo' | 'video';

export interface StoryUtilisateur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export interface Story {
  _id: string;
  utilisateur?: StoryUtilisateur;
  type: TypeStory;
  mediaUrl: string;
  thumbnailUrl?: string;
  dateCreation: string;
  dateExpiration: string;
}

export interface StoriesGroupeesParUtilisateur {
  utilisateur: StoryUtilisateur;
  stories: Story[];
  derniereStory: string;
}

// ============ STORIES ============

/**
 * Récupérer toutes les stories actives (feed)
 * Les stories sont groupées par utilisateur
 */
export const getStoriesActives = async (): Promise<
  ReponseAPI<{ storiesParUtilisateur: StoriesGroupeesParUtilisateur[] }>
> => {
  return api.get('/stories', true);
};

/**
 * Récupérer mes stories actives
 */
export const getMesStories = async (): Promise<
  ReponseAPI<{ stories: Story[] }>
> => {
  return api.get('/stories/mes-stories', true);
};

/**
 * Récupérer les stories d'un utilisateur spécifique
 */
export const getStoriesUtilisateur = async (
  userId: string
): Promise<ReponseAPI<{ utilisateur: StoryUtilisateur; stories: Story[] }>> => {
  return api.get(`/stories/utilisateur/${userId}`, true);
};

/**
 * Récupérer une story spécifique
 */
export const getStory = async (
  id: string
): Promise<ReponseAPI<{ story: Story }>> => {
  return api.get(`/stories/${id}`, true);
};

/**
 * Créer une nouvelle story
 * @param media - Base64 ou URL du média
 * @param type - 'photo' ou 'video'
 */
export const creerStory = async (
  media: string,
  type: TypeStory
): Promise<ReponseAPI<{ story: Story }>> => {
  return api.post('/stories', { media, type }, true);
};

/**
 * Supprimer une story
 */
export const supprimerStory = async (
  id: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/stories/${id}`, true);
};

/**
 * Vérifier si une story est expirée localement
 */
export const isStoryExpired = (story: Story): boolean => {
  return new Date(story.dateExpiration) <= new Date();
};

/**
 * Calculer le temps restant avant expiration (en ms)
 */
export const getTempsRestant = (story: Story): number => {
  const expiration = new Date(story.dateExpiration).getTime();
  const maintenant = Date.now();
  return Math.max(0, expiration - maintenant);
};

/**
 * Formater le temps restant (ex: "23h", "45m")
 */
export const formatTempsRestant = (story: Story): string => {
  const ms = getTempsRestant(story);
  const heures = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (heures > 0) {
    return `${heures}h`;
  }
  return `${minutes}m`;
};
