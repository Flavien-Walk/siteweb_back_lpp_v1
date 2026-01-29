/**
 * Service des projets
 * Gestion des startups/projets de la plateforme
 */

import api, { ReponseAPI } from './api';

// Types
export type MaturiteProjet = 'idee' | 'prototype' | 'lancement' | 'croissance';
export type CategorieProjet = 'tech' | 'food' | 'sante' | 'education' | 'energie' | 'culture' | 'environnement' | 'autre';

export interface Porteur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export interface Projet {
  _id: string;
  nom: string;
  description: string;
  pitch: string;
  categorie: CategorieProjet;
  secteur: string;
  maturite: MaturiteProjet;
  porteur?: Porteur;
  localisation: {
    ville: string;
    lat: number;
    lng: number;
  };
  progression: number;
  objectif: string;
  montant: number;
  image: string;
  tags: string[];
  nbFollowers: number;
  estSuivi: boolean;
  dateCreation: string;
}

export interface FiltresProjets {
  categorie?: CategorieProjet;
  secteur?: string;
  maturite?: MaturiteProjet;
  q?: string;
  page?: number;
  limit?: number;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ============ PROJETS ============

/**
 * Recuperer la liste des projets avec filtres
 */
export const getProjets = async (
  filtres: FiltresProjets = {}
): Promise<ReponseAPI<{ projets: Projet[]; pagination: PaginationData }>> => {
  const params = new URLSearchParams();
  if (filtres.categorie) params.append('categorie', filtres.categorie);
  if (filtres.secteur) params.append('secteur', filtres.secteur);
  if (filtres.maturite) params.append('maturite', filtres.maturite);
  if (filtres.q) params.append('q', filtres.q);
  if (filtres.page) params.append('page', filtres.page.toString());
  if (filtres.limit) params.append('limit', filtres.limit.toString());

  const queryString = params.toString();
  const endpoint = `/projets${queryString ? `?${queryString}` : ''}`;

  return api.get(endpoint, true);
};

/**
 * Recuperer le detail d'un projet
 */
export const getProjet = async (
  id: string
): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.get(`/projets/${id}`, true);
};

/**
 * Suivre ou ne plus suivre un projet
 */
export const toggleSuivreProjet = async (
  id: string
): Promise<ReponseAPI<{ estSuivi: boolean; nbFollowers: number }>> => {
  return api.post(`/projets/${id}/suivre`, {}, true);
};

/**
 * Recuperer mes projets suivis
 */
export const getMesProjets = async (): Promise<ReponseAPI<{ projets: Projet[] }>> => {
  return api.get('/projets/suivis', true);
};

/**
 * Recuperer les projets tendance (les plus suivis recemment)
 */
export const getProjetsTendance = async (
  limit = 3
): Promise<ReponseAPI<{ projets: Projet[] }>> => {
  return api.get(`/projets?limit=${limit}&sort=popular`, true);
};
