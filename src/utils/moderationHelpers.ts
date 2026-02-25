/**
 * Helpers partages pour la moderation
 * Utilises par les sous-controllers moderation/*
 */

import mongoose from 'mongoose';
import type { Request } from 'express';
import type { IUtilisateur } from '../models/Utilisateur.js';
import AuditLog from '../models/AuditLog.js';

// ============ CONSTANTES SYSTEME AUTO-ESCALADE ============

/** Duree d'auto-suspension apres 3 avertissements (7 jours en heures) */
export const AUTO_SUSPENSION_DURATION_HOURS = 7 * 24;

/** Nombre d'avertissements avant auto-suspension */
export const WARNINGS_BEFORE_AUTO_SUSPENSION = 3;

// ============ HELPERS ============

/**
 * Verifie que le moderateur peut agir sur la cible
 * (ne peut pas agir sur quelqu'un de niveau superieur ou egal)
 */
export const canModerate = (moderator: IUtilisateur, target: IUtilisateur): boolean => {
  // super_admin peut tout faire
  if (moderator.role === 'super_admin') return true;
  // Un modo ne peut pas moderer quelqu'un de niveau >= au sien
  return moderator.getRoleLevel() > target.getRoleLevel();
};

/**
 * Generer ou extraire un eventId pour idempotency
 * Si le header X-Event-Id est fourni, l'utiliser
 * Sinon, generer un nouveau ObjectId
 */
export const getOrCreateEventId = (req: Request): mongoose.Types.ObjectId => {
  const headerEventId = req.headers['x-event-id'] as string | undefined;
  if (headerEventId && mongoose.Types.ObjectId.isValid(headerEventId)) {
    return new mongoose.Types.ObjectId(headerEventId);
  }
  return new mongoose.Types.ObjectId();
};

/**
 * Verifier si un eventId a deja ete traite (idempotency check)
 * Retourne true si l'action a deja ete executee
 */
export const isEventIdAlreadyProcessed = async (eventId: mongoose.Types.ObjectId): Promise<boolean> => {
  const existing = await AuditLog.findOne({ eventId }).lean();
  return !!existing;
};
