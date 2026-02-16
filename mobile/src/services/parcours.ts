/**
 * Service Parcours du Batisseur - Gamification
 * Gestion de la progression, des quetes et des defis hebdomadaires
 */

import api, { ReponseAPI } from './api';

// === TYPES ===

export interface ParcoursData {
  xp: number;
  niveau: number;
  niveauNom: string;
  niveauIcone: string;
  niveauSuivant: string;
  xpPourProchainNiveau: number;
  xpDansNiveau: number;
  xpTotalNiveau: number;
  streak: number;
  quetesCompletees: string[];
}

export interface DefiActif {
  _id: string;
  titre: string;
  description: string;
  objectif: number;
  progression: number;
  complete: boolean;
  xpRecompense: number;
  dateFin: string;
  participants: number;
  completions: number;
  icone: string;
  couleur: string;
}

export interface Quete {
  id: string;
  titre: string;
  description: string;
  xp: number;
  icone: string;
  type: 'visiteur' | 'entrepreneur' | 'tous';
}

export interface ActionResultat {
  xpGagne: number;
  totalXp: number;
  niveau: number;
  levelUp: boolean;
  niveauNom: string;
  queteCompletee: string | null;
  defiProgression: {
    progression: number;
    objectif: number;
    complete: boolean;
  } | null;
}

// === API CALLS ===

/**
 * Recuperer le parcours de l'utilisateur connecte + defi actif + quetes
 */
export const getMonParcours = async (): Promise<
  ReponseAPI<{
    parcours: ParcoursData;
    defiActif: DefiActif | null;
    quetesDisponibles: Quete[];
  }>
> => api.get('/parcours/moi', true);

/**
 * Enregistrer une action gamifiee (fire-and-forget depuis le front)
 */
export const enregistrerAction = async (
  action: string,
  targetId?: string,
  targetType?: string
): Promise<ReponseAPI<ActionResultat>> =>
  api.post('/parcours/action', { action, targetId, targetType }, true);

/**
 * Liste de toutes les quetes avec statut
 */
export const getQuetes = async (): Promise<
  ReponseAPI<{
    quetes: (Quete & { completee: boolean })[];
  }>
> => api.get('/parcours/quetes', true);

/**
 * Parcours public d'un utilisateur (pour badge profil)
 */
export const getParcoursPublic = async (
  userId: string
): Promise<
  ReponseAPI<{
    parcours: {
      xp: number;
      niveau: number;
      niveauNom: string;
      niveauIcone: string;
      streak: number;
    };
  }>
> => api.get(`/parcours/utilisateur/${userId}`, true);
