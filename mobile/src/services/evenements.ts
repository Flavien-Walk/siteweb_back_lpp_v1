/**
 * Service des evenements
 * Gestion des lives, replays et Q/R
 */

import api, { ReponseAPI } from './api';
import { Projet } from './projets';

// Types
export type TypeEvenement = 'live' | 'replay' | 'qr';
export type StatutEvenement = 'a-venir' | 'en-cours' | 'termine';

export interface Evenement {
  _id: string;
  titre: string;
  description: string;
  type: TypeEvenement;
  projet?: Projet;
  date: string;
  duree: number; // en minutes
  lienVideo?: string;
  statut: StatutEvenement;
  dateCreation: string;
}

export interface FiltresEvenements {
  type?: TypeEvenement;
  statut?: StatutEvenement;
  page?: number;
  limit?: number;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ============ EVENEMENTS ============

/**
 * Recuperer la liste des evenements
 */
export const getEvenements = async (
  filtres: FiltresEvenements = {}
): Promise<ReponseAPI<{ evenements: Evenement[]; pagination: PaginationData }>> => {
  const params = new URLSearchParams();
  if (filtres.type) params.append('type', filtres.type);
  if (filtres.statut) params.append('statut', filtres.statut);
  if (filtres.page) params.append('page', filtres.page.toString());
  if (filtres.limit) params.append('limit', filtres.limit.toString());

  const queryString = params.toString();
  const endpoint = `/evenements${queryString ? `?${queryString}` : ''}`;

  return api.get(endpoint, true);
};

/**
 * Recuperer les lives en cours ou a venir
 */
export const getLivesActifs = async (
  limit = 5
): Promise<ReponseAPI<{ evenements: Evenement[] }>> => {
  return api.get(`/evenements?type=live&statut=en-cours,a-venir&limit=${limit}`, true);
};

/**
 * Recuperer les replays disponibles
 */
export const getReplays = async (
  limit = 10
): Promise<ReponseAPI<{ evenements: Evenement[] }>> => {
  return api.get(`/evenements?type=replay&limit=${limit}`, true);
};
