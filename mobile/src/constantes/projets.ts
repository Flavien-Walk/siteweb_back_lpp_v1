/**
 * Constantes partagees entre nouveau-projet et modifier-projet
 */

import { CategorieProjet, MaturiteProjet, TypeLien } from '../services/projets';

// Type pour les etapes du wizard (identique dans les deux fichiers)
export type Etape = '1' | '2' | '3' | '4' | '5' | '6';

export const ETAPES_CREATION: { key: Etape; label: string; description: string }[] = [
  { key: '1', label: 'Identite', description: 'Nom, pitch et categorie' },
  { key: '2', label: 'Equipe', description: 'Porteurs et co-fondateurs' },
  { key: '3', label: 'Proposition', description: 'Probleme et solution' },
  { key: '4', label: 'Business', description: 'Maturite et objectifs' },
  { key: '5', label: 'Medias', description: 'Images et documents' },
  { key: '6', label: 'Publication', description: 'Relecture et publication' },
];

export const ETAPES_MODIFICATION: { key: Etape; label: string; description: string }[] = [
  { key: '1', label: 'Identite', description: 'Nom, pitch et categorie' },
  { key: '2', label: 'Proposition', description: 'Probleme et solution' },
  { key: '3', label: 'Business', description: 'Maturite et objectifs' },
  { key: '4', label: 'Medias', description: 'Images et documents' },
  { key: '5', label: 'Liens', description: 'Liens externes' },
  { key: '6', label: 'Recap', description: 'Verifier et sauvegarder' },
];

export const CATEGORIES: { value: CategorieProjet; label: string; icon: string }[] = [
  { value: 'tech', label: 'Tech', icon: 'code-slash' },
  { value: 'food', label: 'Food', icon: 'restaurant' },
  { value: 'sante', label: 'Sante', icon: 'medkit' },
  { value: 'education', label: 'Education', icon: 'school' },
  { value: 'energie', label: 'Energie', icon: 'flash' },
  { value: 'culture', label: 'Culture', icon: 'color-palette' },
  { value: 'environnement', label: 'Environnement', icon: 'leaf' },
  { value: 'autre', label: 'Autre', icon: 'ellipsis-horizontal' },
];

export const MATURITES: { value: MaturiteProjet; label: string; description: string }[] = [
  { value: 'idee', label: 'Idee', description: 'Concept en reflexion' },
  { value: 'prototype', label: 'Prototype', description: 'MVP en developpement' },
  { value: 'lancement', label: 'Lancement', description: 'Premiers clients' },
  { value: 'croissance', label: 'Croissance', description: 'Scaling en cours' },
];

export const TYPES_LIENS: { value: TypeLien; label: string; icon: string; placeholder: string }[] = [
  { value: 'site', label: 'Site web', icon: 'globe-outline', placeholder: 'https://monsite.com' },
  { value: 'fundraising', label: 'Levee de fonds', icon: 'cash-outline', placeholder: 'https://wiseed.com/...' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', placeholder: 'https://linkedin.com/company/...' },
  { value: 'twitter', label: 'X / Twitter', icon: 'logo-twitter', placeholder: 'https://twitter.com/...' },
  { value: 'instagram', label: 'Instagram', icon: 'logo-instagram', placeholder: 'https://instagram.com/...' },
  { value: 'tiktok', label: 'TikTok', icon: 'logo-tiktok', placeholder: 'https://tiktok.com/@...' },
  { value: 'youtube', label: 'YouTube', icon: 'logo-youtube', placeholder: 'https://youtube.com/...' },
  { value: 'discord', label: 'Discord', icon: 'logo-discord', placeholder: 'https://discord.gg/...' },
  { value: 'doc', label: 'Document', icon: 'document-outline', placeholder: 'https://notion.so/...' },
  { value: 'email', label: 'Email', icon: 'mail-outline', placeholder: 'mailto:contact@monprojet.com' },
  { value: 'other', label: 'Autre', icon: 'link-outline', placeholder: 'https://...' },
];

export const METRIQUE_ICONES: { value: string; icon: string }[] = [
  { value: 'analytics-outline', icon: 'analytics-outline' },
  { value: 'people-outline', icon: 'people-outline' },
  { value: 'cash-outline', icon: 'cash-outline' },
  { value: 'trending-up-outline', icon: 'trending-up-outline' },
  { value: 'star-outline', icon: 'star-outline' },
  { value: 'cart-outline', icon: 'cart-outline' },
  { value: 'globe-outline', icon: 'globe-outline' },
  { value: 'time-outline', icon: 'time-outline' },
];
