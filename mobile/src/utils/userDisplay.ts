/**
 * Utilitaires d'affichage utilisateur
 * Gère le mapping des rôles techniques vers les labels UI
 */

import { couleurs } from '../constantes/theme';
import type { Role, StatutUtilisateur } from '../services/auth';

// Types pour les icônes Ionicons
type IoniconsName = 'star' | 'shield' | 'shield-checkmark' | 'shield-outline' | 'rocket' | 'compass';

export interface UserBadgeConfig {
  label: string;
  icon: IoniconsName;
  color: string;
  isStaff: boolean;
}

// Couleurs spécifiques aux rôles staff
const STAFF_COLORS = {
  fondateur: '#FFD700',    // Or/Gold pour le fondateur
  admin: '#9B59B6',        // Violet pour admin
  moderateur: '#27AE60',   // Vert pour modérateur
  modoTest: '#3498DB',     // Bleu pour modo test
};

/**
 * Retourne la configuration du badge à afficher pour un utilisateur
 * Priorité : rôle staff > statut utilisateur
 *
 * @param role - Rôle technique de l'utilisateur (super_admin, admin_modo, modo, modo_test, user)
 * @param statut - Statut utilisateur (entrepreneur, visiteur)
 * @returns Configuration du badge (label, icône, couleur, isStaff)
 */
export const getUserBadgeConfig = (
  role?: Role | string,
  statut?: StatutUtilisateur | string
): UserBadgeConfig => {
  // Priorité 1: Rôles staff
  switch (role) {
    case 'super_admin':
      return {
        label: 'Fondateur',
        icon: 'star',
        color: STAFF_COLORS.fondateur,
        isStaff: true,
      };

    case 'admin_modo':
    case 'admin': // Legacy role
      return {
        label: 'Admin',
        icon: 'shield',
        color: STAFF_COLORS.admin,
        isStaff: true,
      };

    case 'modo':
      return {
        label: 'Modérateur',
        icon: 'shield-checkmark',
        color: STAFF_COLORS.moderateur,
        isStaff: true,
      };

    case 'modo_test':
      return {
        label: 'Modo Test',
        icon: 'shield-outline',
        color: STAFF_COLORS.modoTest,
        isStaff: true,
      };
  }

  // Priorité 2: Statut utilisateur standard
  switch (statut) {
    case 'entrepreneur':
      return {
        label: 'Entrepreneur',
        icon: 'rocket',
        color: couleurs.primaire,
        isStaff: false,
      };

    case 'visiteur':
    default:
      return {
        label: 'Visiteur',
        icon: 'compass',
        color: couleurs.texteSecondaire,
        isStaff: false,
      };
  }
};

/**
 * Vérifie si un utilisateur a un rôle staff
 *
 * @param role - Rôle technique de l'utilisateur
 * @returns true si l'utilisateur est staff
 */
export const isStaffRole = (role?: Role | string): boolean => {
  return ['super_admin', 'admin_modo', 'admin', 'modo', 'modo_test'].includes(role || '');
};

/**
 * Retourne uniquement le label à afficher pour un utilisateur
 * Raccourci pour getUserBadgeConfig(role, statut).label
 *
 * @param role - Rôle technique
 * @param statut - Statut utilisateur
 * @returns Label à afficher
 */
export const getUserDisplayLabel = (
  role?: Role | string,
  statut?: StatutUtilisateur | string
): string => {
  return getUserBadgeConfig(role, statut).label;
};

export default {
  getUserBadgeConfig,
  getUserDisplayLabel,
  isStaffRole,
  STAFF_COLORS,
};
