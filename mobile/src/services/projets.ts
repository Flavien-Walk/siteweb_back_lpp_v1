/**
 * Service des projets
 * Gestion des startups/projets de la plateforme
 */

import api, { ReponseAPI } from './api';

// Types
export type MaturiteProjet = 'idee' | 'prototype' | 'lancement' | 'croissance';
export type CategorieProjet = 'tech' | 'food' | 'sante' | 'education' | 'energie' | 'culture' | 'environnement' | 'autre';
export type StatutProjet = 'draft' | 'published';
export type VisibiliteDocument = 'public' | 'private';
export type RoleEquipe = 'founder' | 'cofounder' | 'cto' | 'cmo' | 'cfo' | 'developer' | 'designer' | 'marketing' | 'sales' | 'other';

export interface Porteur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
  statut?: string;
}

export interface MembreEquipe {
  utilisateur?: Porteur;
  nom: string;
  role: RoleEquipe;
  titre?: string;
  linkedin?: string;
  photo?: string;
}

export interface DocumentProjet {
  _id?: string;
  nom: string;
  url: string;
  type: 'pdf' | 'pptx' | 'xlsx' | 'docx' | 'image' | 'other';
  visibilite: VisibiliteDocument;
  dateAjout: string;
}

export interface MediaGalerie {
  _id?: string;
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  legende?: string;
  ordre: number;
}

export interface Metrique {
  label: string;
  valeur: string;
  icone?: string;
}

export interface Projet {
  _id: string;
  // Étape A - Identité
  nom: string;
  description: string;
  pitch: string;
  logo?: string;
  categorie: CategorieProjet;
  secteur: string;
  tags: string[];
  localisation: {
    ville: string;
    lat: number;
    lng: number;
  };
  // Étape B - Équipe
  porteur?: Porteur;
  equipe: MembreEquipe[];
  // Étape C - Proposition de valeur
  probleme?: string;
  solution?: string;
  avantageConcurrentiel?: string;
  cible?: string;
  // Étape D - Traction & business
  maturite: MaturiteProjet;
  businessModel?: string;
  metriques: Metrique[];
  objectifFinancement?: number;
  montantLeve?: number;
  progression: number;
  objectif: string;
  // Étape E - Médias & documents
  image: string;
  pitchVideo?: string;
  galerie: MediaGalerie[];
  documents: DocumentProjet[];
  // Étape F - Publication
  statut: StatutProjet;
  datePublication?: string;
  // Système
  followers: Porteur[];
  nbFollowers: number;
  estSuivi: boolean;
  dateCreation: string;
  dateMiseAJour: string;
  // Legacy
  montant: number;
}

// Interface pour créer/modifier un projet (données partielles)
export interface ProjetFormData {
  // Étape A
  nom?: string;
  description?: string;
  pitch?: string;
  logo?: string;
  categorie?: CategorieProjet;
  secteur?: string;
  tags?: string[];
  localisation?: {
    ville: string;
    lat?: number;
    lng?: number;
  };
  // Étape B
  equipe?: Omit<MembreEquipe, 'utilisateur'>[];
  // Étape C
  probleme?: string;
  solution?: string;
  avantageConcurrentiel?: string;
  cible?: string;
  // Étape D
  maturite?: MaturiteProjet;
  businessModel?: string;
  metriques?: Metrique[];
  objectifFinancement?: number;
  montantLeve?: number;
  progression?: number;
  objectif?: string;
  // Étape E
  image?: string;
  pitchVideo?: string;
}

export interface StatsEntrepreneur {
  total: number;
  drafts: number;
  published: number;
  totalFollowers: number;
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

// ============ ENTREPRENEUR ============

/**
 * Recuperer mes projets en tant qu'entrepreneur (brouillons + publies)
 */
export const getMesProjetsEntrepreneur = async (
  statut?: StatutProjet
): Promise<ReponseAPI<{ projets: Projet[]; stats: StatsEntrepreneur }>> => {
  const params = statut ? `?statut=${statut}` : '';
  return api.get(`/projets/entrepreneur/mes-projets${params}`, true);
};

/**
 * Creer un nouveau projet (brouillon)
 */
export const creerProjet = async (
  data: ProjetFormData
): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.post('/projets/entrepreneur/creer', data, true);
};

/**
 * Modifier un projet existant
 */
export const modifierProjet = async (
  id: string,
  data: ProjetFormData
): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.put(`/projets/entrepreneur/${id}`, data, true);
};

/**
 * Publier un projet (draft -> published)
 */
export const publierProjet = async (
  id: string
): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.post(`/projets/entrepreneur/${id}/publier`, {}, true);
};

/**
 * Depublier un projet (published -> draft)
 */
export const depublierProjet = async (
  id: string
): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.post(`/projets/entrepreneur/${id}/depublier`, {}, true);
};

/**
 * Supprimer un projet
 */
export const supprimerProjet = async (
  id: string
): Promise<ReponseAPI<void>> => {
  return api.delete(`/projets/entrepreneur/${id}`, true);
};

/**
 * Upload de medias pour un projet
 * @param type - 'galerie' | 'logo' | 'cover' | 'pitchVideo'
 */
export const uploadMediaProjet = async (
  id: string,
  medias: string[],
  type: 'galerie' | 'logo' | 'cover' | 'pitchVideo' = 'galerie'
): Promise<ReponseAPI<{ urls: string[] }>> => {
  return api.post(`/projets/entrepreneur/${id}/upload-media`, { medias, type }, true);
};

/**
 * Upload d'un document pour un projet
 */
export const uploadDocumentProjet = async (
  id: string,
  document: string,
  nom: string,
  type: DocumentProjet['type'] = 'other',
  visibilite: VisibiliteDocument = 'private'
): Promise<ReponseAPI<{ document: DocumentProjet }>> => {
  return api.post(`/projets/entrepreneur/${id}/upload-document`, {
    document,
    nom,
    type,
    visibilite,
  }, true);
};

/**
 * Gerer l'equipe d'un projet (ajouter/retirer des membres)
 * @param add - IDs des utilisateurs a ajouter
 * @param remove - IDs des utilisateurs a retirer
 */
export const gererEquipeProjet = async (
  id: string,
  add: string[] = [],
  remove: string[] = []
): Promise<ReponseAPI<{ projet: Projet; added: string[]; removed: string[]; errors?: string[] }>> => {
  return api.patch(`/projets/entrepreneur/${id}/equipe`, { add, remove }, true);
};

/**
 * Recuperer les representants d'un projet (porteur + equipe)
 * Pour la fonctionnalite "Contacter le projet"
 */
export const getRepresentantsProjet = async (
  id: string
): Promise<ReponseAPI<{ representants: Porteur[] }>> => {
  return api.get(`/projets/${id}/representants`, true);
};
