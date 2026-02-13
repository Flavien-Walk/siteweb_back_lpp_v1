import api from './api';
import type { ReponseAPI } from './api';

export interface StoryUtilisateur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export interface Story {
  _id: string;
  utilisateur?: StoryUtilisateur;
  type: 'photo' | 'video';
  mediaUrl: string;
  thumbnailUrl?: string;
  dateCreation: string;
  dateExpiration: string;
  estVue?: boolean;
}

export interface StoriesGroupees {
  utilisateur: StoryUtilisateur;
  stories: Story[];
  derniereStory: string;
  toutesVues?: boolean;
}

export const getStoriesActives = async (): Promise<ReponseAPI<{ storiesParUtilisateur: StoriesGroupees[] }>> => {
  return api.get('/stories', true);
};

export const getMesStories = async (): Promise<ReponseAPI<{ stories: Story[] }>> => {
  return api.get('/stories/mes-stories', true);
};

export const getStoriesUtilisateur = async (userId: string): Promise<ReponseAPI<{ utilisateur: StoryUtilisateur; hasStories: boolean; peutVoir: boolean; stories: Story[] }>> => {
  return api.get(`/stories/utilisateur/${userId}`, true);
};

export const creerStory = async (
  media: string,
  type: 'photo' | 'video',
  options?: { durationSec?: number; filterPreset?: string; expirationMinutes?: number }
): Promise<ReponseAPI<{ story: Story }>> => {
  return api.post('/stories', {
    media,
    type,
    durationSec: options?.durationSec ?? 7,
    filterPreset: options?.filterPreset ?? 'normal',
    expirationMinutes: options?.expirationMinutes ?? 1440,
  }, true);
};

export const supprimerStory = async (id: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/stories/${id}`, true);
};

export const markStorySeen = async (storyId: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/stories/${storyId}/seen`, {}, true);
};
