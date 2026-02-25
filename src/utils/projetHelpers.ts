/**
 * Helpers partages pour les controllers projet
 * Extraits de projet/team.ts et projet/management.ts
 */

import mongoose from 'mongoose';
import type { IProjet } from '../models/Projet.js';
import Utilisateur from '../models/Utilisateur.js';

/**
 * Verifie si deux utilisateurs sont amis
 */
export const isFriend = async (
  userIdA: mongoose.Types.ObjectId,
  userIdB: mongoose.Types.ObjectId
): Promise<boolean> => {
  const user = await Utilisateur.findById(userIdA).select('amis');
  if (!user) return false;
  return user.amis.some((amiId) => amiId.equals(userIdB));
};

/**
 * Verifie si l'utilisateur est membre de l'equipe du projet
 */
export const isTeamMember = (
  projet: IProjet,
  userId: mongoose.Types.ObjectId
): boolean => {
  return projet.equipe.some((m) => m.utilisateur && m.utilisateur.equals(userId));
};

/**
 * Verifie si l'utilisateur peut modifier le projet (owner ou membre equipe)
 */
export const canEditProject = (
  projet: IProjet,
  userId: mongoose.Types.ObjectId
): boolean => {
  return projet.porteur.equals(userId) || isTeamMember(projet, userId);
};
