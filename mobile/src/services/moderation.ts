/**
 * Service de modération pour le staff mobile
 * Toutes les actions incluent source: 'mobile' pour le tracking
 */

import api, { ReponseAPI } from './api';

// Types
export interface WarnUserData {
  reason: string;
  expiresInDays?: number;
}

export interface SuspendUserData {
  reason: string;
  durationHours: number;
}

export interface BanUserData {
  reason: string;
}

export interface ContentActionData {
  reason?: string;
  reportId?: string;
}

export interface Warning {
  _id: string;
  reason: string;
  issuedBy: {
    _id: string;
    prenom: string;
    nom: string;
  };
  issuedAt: string;
  expiresAt?: string;
}

export interface UserModerationDetails {
  user: {
    _id: string;
    prenom: string;
    nom: string;
    email: string;
    avatar?: string;
    role: string;
    permissions: string[];
    dateCreation: string;
  };
  moderation: {
    isBanned: boolean;
    bannedAt?: string;
    banReason?: string;
    isSuspended: boolean;
    suspendedUntil?: string;
    warnings: Warning[];
    activeWarningsCount: number;
    totalWarningsCount: number;
  };
}

// Helper pour ajouter source: 'mobile' aux requêtes
const withMobileSource = (data: any = {}) => ({
  ...data,
  source: 'mobile',
});

// ============ ACTIONS SUR LES UTILISATEURS ============

/**
 * Avertir un utilisateur
 */
export const warnUser = async (
  userId: string,
  data: WarnUserData
): Promise<ReponseAPI<{ warning: Warning; totalWarnings: number }>> => {
  return api.post(`/moderation/users/${userId}/warn`, withMobileSource(data), true);
};

/**
 * Retirer un avertissement
 */
export const removeWarning = async (
  userId: string,
  warningId: string
): Promise<ReponseAPI<{ remainingWarnings: number }>> => {
  return api.delete(`/moderation/users/${userId}/warnings/${warningId}`, true, withMobileSource());
};

/**
 * Suspendre un utilisateur
 */
export const suspendUser = async (
  userId: string,
  data: SuspendUserData
): Promise<ReponseAPI<{ suspendedUntil: string; durationHours: number }>> => {
  return api.post(`/moderation/users/${userId}/suspend`, withMobileSource(data), true);
};

/**
 * Lever une suspension
 */
export const unsuspendUser = async (
  userId: string
): Promise<ReponseAPI<void>> => {
  return api.post(`/moderation/users/${userId}/unsuspend`, withMobileSource(), true);
};

/**
 * Bannir un utilisateur
 */
export const banUser = async (
  userId: string,
  data: BanUserData
): Promise<ReponseAPI<{ bannedAt: string; banReason: string }>> => {
  return api.post(`/moderation/users/${userId}/ban`, withMobileSource(data), true);
};

/**
 * Débannir un utilisateur
 */
export const unbanUser = async (
  userId: string,
  reason?: string
): Promise<ReponseAPI<void>> => {
  return api.post(`/moderation/users/${userId}/unban`, withMobileSource({ reason }), true);
};

/**
 * Obtenir les détails de modération d'un utilisateur
 */
export const getUserModerationDetails = async (
  userId: string
): Promise<ReponseAPI<UserModerationDetails>> => {
  return api.get(`/moderation/users/${userId}`, true);
};

// ============ ACTIONS SUR LE CONTENU ============

/**
 * Masquer une publication
 */
export const hidePublication = async (
  publicationId: string,
  data?: ContentActionData
): Promise<ReponseAPI<void>> => {
  return api.post(`/moderation/content/publication/${publicationId}/hide`, withMobileSource(data), true);
};

/**
 * Afficher une publication masquée
 */
export const unhidePublication = async (
  publicationId: string,
  reason?: string
): Promise<ReponseAPI<void>> => {
  return api.post(`/moderation/content/publication/${publicationId}/unhide`, withMobileSource({ reason }), true);
};

/**
 * Supprimer une publication
 */
export const deletePublication = async (
  publicationId: string,
  data?: ContentActionData
): Promise<ReponseAPI<void>> => {
  return api.delete(`/moderation/content/publication/${publicationId}`, true, withMobileSource(data));
};

/**
 * Supprimer un commentaire
 */
export const deleteCommentaire = async (
  commentaireId: string,
  data?: ContentActionData
): Promise<ReponseAPI<void>> => {
  return api.delete(`/moderation/content/commentaire/${commentaireId}`, true, withMobileSource(data));
};

// ============ HELPERS ============

/**
 * Formater la durée de suspension
 */
export const formatSuspensionDuration = (hours: number): string => {
  if (hours < 24) {
    return `${hours} heure${hours > 1 ? 's' : ''}`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} jour${days > 1 ? 's' : ''}`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }
  const months = Math.floor(days / 30);
  return `${months} mois`;
};

/**
 * Options de durée de suspension prédéfinies
 */
export const SUSPENSION_DURATIONS = [
  { label: '1 heure', hours: 1 },
  { label: '6 heures', hours: 6 },
  { label: '12 heures', hours: 12 },
  { label: '24 heures', hours: 24 },
  { label: '3 jours', hours: 72 },
  { label: '7 jours', hours: 168 },
  { label: '14 jours', hours: 336 },
  { label: '30 jours', hours: 720 },
];
