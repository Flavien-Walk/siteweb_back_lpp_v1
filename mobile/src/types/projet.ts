/**
 * Types Projet
 * Extraits de services/projets.ts
 */

export type MaturiteProjet = 'idee' | 'prototype' | 'lancement' | 'croissance';
export type CategorieProjet = 'tech' | 'food' | 'sante' | 'education' | 'energie' | 'culture' | 'environnement' | 'autre';
export type StatutProjet = 'draft' | 'published';
export type VisibiliteDocument = 'public' | 'private';
export type RoleEquipe = 'founder' | 'cofounder' | 'cto' | 'cmo' | 'cfo' | 'developer' | 'designer' | 'marketing' | 'sales' | 'other';
export type TypeLien = 'site' | 'fundraising' | 'linkedin' | 'twitter' | 'instagram' | 'tiktok' | 'discord' | 'youtube' | 'doc' | 'email' | 'other';

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
  localisation: {
    ville: string;
    lat: number;
    lng: number;
  };
  incubateur?: string;
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

export interface ProjetFormData {
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
  incubateur?: string;
  equipe?: Omit<MembreEquipe, 'utilisateur'>[];
  probleme?: string;
  solution?: string;
  avantageConcurrentiel?: string;
  cible?: string;
  maturite?: MaturiteProjet;
  businessModel?: string;
  metriques?: Metrique[];
  objectifFinancement?: number;
  montantLeve?: number;
  progression?: number;
  objectif?: string;
  image?: string;
  pitchVideo?: string;
  liens?: LienProjet[];
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
  incubateur?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface IncubateurActif {
  nom: string;
  count: number;
}

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
