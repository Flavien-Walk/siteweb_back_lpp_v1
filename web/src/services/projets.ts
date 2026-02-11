import api from './api';
import type { ReponseAPI } from './api';

export type MaturiteProjet = 'idee' | 'prototype' | 'lancement' | 'croissance';
export type CategorieProjet = 'tech' | 'food' | 'sante' | 'education' | 'energie' | 'culture' | 'environnement' | 'autre';
export type StatutProjet = 'draft' | 'published';
export type VisibiliteDocument = 'public' | 'private';
export type TypeLien = 'site' | 'fundraising' | 'linkedin' | 'twitter' | 'instagram' | 'tiktok' | 'discord' | 'youtube' | 'doc' | 'email' | 'other';

export interface Porteur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export interface MembreEquipe {
  utilisateur?: Porteur;
  nom: string;
  role: string;
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

export interface LienProjet {
  _id?: string;
  type: TypeLien;
  label?: string;
  url: string;
}

export interface Projet {
  _id: string;
  nom: string;
  description: string;
  pitch: string;
  logo?: string;
  categorie: CategorieProjet;
  secteur: string;
  tags: string[];
  localisation: { ville: string; lat: number; lng: number };
  porteur?: Porteur;
  equipe: MembreEquipe[];
  probleme?: string;
  solution?: string;
  avantageConcurrentiel?: string;
  cible?: string;
  maturite: MaturiteProjet;
  businessModel?: string;
  metriques: Metrique[];
  objectifFinancement?: number;
  montantLeve?: number;
  progression: number;
  objectif: string;
  image: string;
  pitchVideo?: string;
  galerie: MediaGalerie[];
  documents: DocumentProjet[];
  liens: LienProjet[];
  statut: StatutProjet;
  datePublication?: string;
  followers: Porteur[];
  nbFollowers: number;
  estSuivi: boolean;
  dateCreation: string;
  dateMiseAJour: string;
  montant: number;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface FiltresProjets {
  categorie?: CategorieProjet;
  secteur?: string;
  maturite?: MaturiteProjet;
  q?: string;
  page?: number;
  limit?: number;
}

export const getProjets = async (filtres: FiltresProjets = {}): Promise<ReponseAPI<{ projets: Projet[]; pagination: PaginationData }>> => {
  const params = new URLSearchParams();
  if (filtres.categorie) params.append('categorie', filtres.categorie);
  if (filtres.secteur) params.append('secteur', filtres.secteur);
  if (filtres.maturite) params.append('maturite', filtres.maturite);
  if (filtres.q) params.append('q', filtres.q);
  if (filtres.page) params.append('page', filtres.page.toString());
  if (filtres.limit) params.append('limit', filtres.limit.toString());
  const qs = params.toString();
  return api.get(`/projets${qs ? `?${qs}` : ''}`, true);
};

export const getProjet = async (id: string): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.get(`/projets/${id}`, true);
};

export const toggleSuivreProjet = async (id: string): Promise<ReponseAPI<{ estSuivi: boolean; nbFollowers: number }>> => {
  return api.post(`/projets/${id}/suivre`, {}, true);
};

export const getProjetsTendance = async (limit = 5): Promise<ReponseAPI<{ projets: Projet[] }>> => {
  return api.get(`/projets?limit=${limit}&sort=popular`, true);
};

export const getMesProjets = async (): Promise<ReponseAPI<{ projets: Projet[] }>> => {
  return api.get('/projets/suivis', true);
};

export const getProjetsSuivisUtilisateur = async (userId: string): Promise<ReponseAPI<{ projets: Projet[] }>> => {
  return api.get(`/utilisateurs/${userId}/projets-suivis`, true);
};

// ─── Entrepreneur endpoints ───

export type RoleEquipe = 'founder' | 'cofounder' | 'cto' | 'cmo' | 'cfo' | 'developer' | 'designer' | 'marketing' | 'sales' | 'other';

export interface ProjetFormData {
  nom?: string;
  pitch?: string;
  description?: string;
  categorie?: CategorieProjet;
  secteur?: string;
  tags?: string[];
  localisation?: { ville: string };
  probleme?: string;
  solution?: string;
  avantageConcurrentiel?: string;
  cible?: string;
  maturite?: MaturiteProjet;
  businessModel?: string;
  objectifFinancement?: number;
  metriques?: Metrique[];
  liens?: LienProjet[];
  image?: string;
  pitchVideo?: string;
}

export const getMesProjetsEntrepreneur = async (): Promise<ReponseAPI<{ projets: Projet[] }>> => {
  return api.get('/projets/entrepreneur/mes-projets', true);
};

export const creerProjet = async (data: ProjetFormData): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.post('/projets/entrepreneur/creer', data, true);
};

export const modifierProjet = async (id: string, data: ProjetFormData): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.put(`/projets/entrepreneur/${id}`, data, true);
};

export const publierProjet = async (id: string): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.post(`/projets/entrepreneur/${id}/publier`, {}, true);
};

export const depublierProjet = async (id: string): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.post(`/projets/entrepreneur/${id}/depublier`, {}, true);
};

export const supprimerProjet = async (id: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/projets/entrepreneur/${id}`, true);
};

export const gererEquipeProjet = async (id: string, membres: { utilisateur?: string; nom: string; role: RoleEquipe; titre?: string }[]): Promise<ReponseAPI<{ projet: Projet }>> => {
  return api.patch(`/projets/entrepreneur/${id}/equipe`, { membres }, true);
};

export const uploadMediaProjet = async (id: string, media: string, type: 'image' | 'video' = 'image', target: 'cover' | 'galerie' = 'galerie'): Promise<ReponseAPI<{ url: string }>> => {
  return api.post(`/projets/entrepreneur/${id}/upload-media`, { media, type, target }, true);
};

export const uploadDocumentProjet = async (id: string, document: { nom: string; fichier: string; type: string; visibilite: VisibiliteDocument }): Promise<ReponseAPI<{ document: DocumentProjet }>> => {
  return api.post(`/projets/entrepreneur/${id}/upload-document`, document, true);
};

export const getRepresentantsProjet = async (id: string): Promise<ReponseAPI<{ representants: Porteur[] }>> => {
  return api.get(`/projets/${id}/representants`, false);
};
