/**
 * Types Publication
 * Extraits de services/publications.ts
 */

export interface Auteur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
  role?: 'user' | 'admin';
  statut?: 'visiteur' | 'entrepreneur';
  isVerified?: boolean;
}

export type MediaType = 'image' | 'video';

export interface MediaItem {
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
}

export interface Mention {
  type: 'utilisateur' | 'projet';
  id: string;
  display: string;
}

export interface Publication {
  _id: string;
  auteur: Auteur;
  auteurType: 'Utilisateur' | 'Projet';
  type: 'post' | 'annonce' | 'update' | 'editorial' | 'live-extrait';
  contenu: string;
  media?: string;
  medias: MediaItem[];
  mentions?: Mention[];
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

export type RaisonSignalement =
  | 'spam'
  | 'harcelement'
  | 'contenu_inapproprie'
  | 'fausse_info'
  | 'nudite'
  | 'violence'
  | 'haine'
  | 'autre';

export interface MentionUtilisateur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export interface MentionProjet {
  _id: string;
  nom: string;
  logo?: string;
  categorie?: string;
}
