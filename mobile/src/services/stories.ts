/**
 * Service des Stories
 * Gestion des stories Instagram-like (photo/vidéo 24h)
 */

import api, { ReponseAPI } from './api';
import { StoryWidget } from '../types/storyWidgets';

// Types
export type TypeStory = 'photo' | 'video';

// Types de filtres disponibles (V2)
export type FilterPreset = 'normal' | 'warm' | 'cool' | 'bw' | 'contrast' | 'vignette';

// Interface pour la localisation (V2)
export interface StoryLocation {
  label: string;
  lat?: number;
  lng?: number;
}

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
  estVue?: boolean; // true si l'utilisateur connecté a vu cette story
  // V2 - Nouveaux champs
  durationSec?: number; // Durée d'affichage choisie (5/7/10/15s)
  location?: StoryLocation; // Localisation optionnelle
  filterPreset?: FilterPreset; // Filtre visuel appliqué
  // V3 - Durée de vie
  expirationMinutes?: ExpirationMinutes; // Durée de vie choisie
  // V4 - Widgets
  widgets?: StoryWidget[]; // Widgets interactifs (liens, texte, emoji, etc.)
}

export interface StoriesGroupeesParUtilisateur {
  utilisateur: StoryUtilisateur;
  stories: Story[];
  derniereStory: string;
  toutesVues?: boolean; // true si toutes les stories du groupe ont été vues
}

/**
 * Réponse pour les stories d'un utilisateur spécifique
 * Inclut hasStories (indicateur visible) et peutVoir (autorisation)
 */
export interface StoriesUtilisateurResponse {
  utilisateur: StoryUtilisateur;
  hasStories: boolean;
  peutVoir: boolean;
  toutesVues?: boolean; // true si toutes les stories ont été vues
  stories: Story[];
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
 * Retourne hasStories (indicateur visible) et peutVoir (si ami)
 * Si non-ami: stories sera vide mais hasStories indique si l'utilisateur a des stories
 */
export const getStoriesUtilisateur = async (
  userId: string
): Promise<ReponseAPI<StoriesUtilisateurResponse>> => {
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
 * Durées de vie disponibles (en minutes)
 */
export type ExpirationMinutes = 7 | 15 | 60 | 360 | 1440;

/**
 * Options V2/V3/V4 pour la création de story
 */
export interface CreateStoryOptions {
  durationSec?: number; // Durée d'affichage (5/7/10/15s, défaut: 7)
  location?: StoryLocation; // Localisation optionnelle
  filterPreset?: FilterPreset; // Filtre visuel (défaut: 'normal')
  expirationMinutes?: ExpirationMinutes; // V3 - Durée de vie (7min, 15min, 1h, 6h, 24h)
  widgets?: StoryWidget[]; // V4 - Widgets interactifs
}

/**
 * Créer une nouvelle story
 * @param media - Base64 ou URL du média
 * @param type - 'photo' ou 'video'
 * @param options - Options V2/V3 (durée affichage, localisation, filtre, expiration)
 */
export const creerStory = async (
  media: string,
  type: TypeStory,
  options?: CreateStoryOptions
): Promise<ReponseAPI<{ story: Story }>> => {
  return api.post('/stories', {
    media,
    type,
    durationSec: options?.durationSec || 7,
    location: options?.location,
    filterPreset: options?.filterPreset || 'normal',
    expirationMinutes: options?.expirationMinutes || 1440, // 24h par défaut
    widgets: options?.widgets || [], // V4 - Widgets
  }, true);
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
 * Marquer une story comme vue
 * Appel atomic avec $addToSet côté backend pour éviter les doublons
 */
export const markStorySeen = async (
  storyId: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/stories/${storyId}/seen`, {}, true);
};

/**
 * Interface pour un viewer de story
 */
export interface StoryViewer {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

/**
 * Récupérer la liste des utilisateurs ayant vu une story
 * SÉCURITÉ: Ne fonctionne que pour ses propres stories
 */
export const getStoryViewers = async (
  storyId: string
): Promise<ReponseAPI<{ nbVues: number; viewers: StoryViewer[] }>> => {
  return api.get(`/stories/${storyId}/viewers`, true);
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
