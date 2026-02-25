/**
 * Event Controller - Ingestion d'events d'engagement pour le systeme de recommandation/trending
 * Endpoint batch: accepte jusqu'a 50 events par requete
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import EngagementEvent, { EngagementEventType, EngagementTargetType } from '../models/EngagementEvent.js';
import Projet, { IProjet } from '../models/Projet.js';

// === TYPES ===

interface EventInput {
  type: string;
  targetId: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

// Mapping type externe → eventType interne
const EVENT_TYPE_MAP: Record<string, { eventType: EngagementEventType; targetType: EngagementTargetType }> = {
  project_impression: { eventType: 'impression', targetType: 'projet' },
  project_click: { eventType: 'click', targetType: 'projet' },
  project_view_time: { eventType: 'view_time', targetType: 'projet' },
  project_like: { eventType: 'like', targetType: 'projet' },
  project_unlike: { eventType: 'unlike', targetType: 'projet' },
  project_follow: { eventType: 'follow', targetType: 'projet' },
  project_unfollow: { eventType: 'unfollow', targetType: 'projet' },
  project_comment: { eventType: 'comment', targetType: 'projet' },
  project_share: { eventType: 'share', targetType: 'projet' },
  project_save: { eventType: 'save', targetType: 'projet' },
};

// === CACHE PROJET (denormalisation) ===

interface ProjetCache {
  categorie: string;
  tags: string[];
  expiry: number;
}

const projetCache = new Map<string, ProjetCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getProjetInfo(projetId: string): Promise<{ categorie: string; tags: string[] } | null> {
  const cached = projetCache.get(projetId);
  if (cached && cached.expiry > Date.now()) {
    return { categorie: cached.categorie, tags: cached.tags };
  }

  const projet = await Projet.findById(projetId).select('categorie tags').lean() as Pick<IProjet, 'categorie' | 'tags'> | null;
  if (!projet) return null;

  projetCache.set(projetId, {
    categorie: projet.categorie,
    tags: projet.tags || [],
    expiry: Date.now() + CACHE_TTL_MS,
  });

  return { categorie: projet.categorie, tags: projet.tags || [] };
}

// Nettoyage periodique du cache (toutes les 10 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of projetCache.entries()) {
    if (value.expiry < now) projetCache.delete(key);
  }
}, 10 * 60 * 1000);

// === CONTROLLER ===

/**
 * POST /api/events
 * Ingestion batch d'events d'engagement
 */
export const ingestEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ succes: false, message: 'Le champ events doit etre un tableau non vide.' });
      return;
    }

    if (events.length > 50) {
      res.status(400).json({ succes: false, message: 'Maximum 50 events par requete.' });
      return;
    }

    const utilisateur = req.utilisateur!;
    const actorId = utilisateur._id;
    const actorAccountAge = utilisateur.dateCreation
      ? (Date.now() - new Date(utilisateur.dateCreation).getTime()) / (1000 * 60 * 60) // en heures
      : 0;

    const source = (req.body.source as string) || 'mobile';
    const validSources = ['mobile', 'web', 'api'];
    const finalSource = validSources.includes(source) ? source : 'mobile';

    const docsToInsert: any[] = [];

    for (const event of events as EventInput[]) {
      // Valider le type d'event
      const mapping = EVENT_TYPE_MAP[event.type];
      if (!mapping) continue; // Ignorer les types inconnus

      // Valider le targetId
      if (!event.targetId || !mongoose.Types.ObjectId.isValid(event.targetId)) continue;

      // Pour view_time, la value doit etre > 0 et raisonnable (max 30 min)
      let value = event.value ?? 1;
      if (mapping.eventType === 'view_time') {
        if (value <= 0 || value > 1800) continue; // Skip invalides
      } else {
        value = 1; // Les autres events ont toujours value = 1
      }

      // Recuperer les infos denormalisees du projet
      const projetInfo = await getProjetInfo(event.targetId);
      if (!projetInfo) continue; // Projet inexistant

      docsToInsert.push({
        actor: actorId,
        actorAccountAge: Math.round(actorAccountAge),
        eventType: mapping.eventType,
        targetType: mapping.targetType,
        targetId: new mongoose.Types.ObjectId(event.targetId),
        targetCategorie: projetInfo.categorie,
        targetTags: projetInfo.tags,
        value,
        metadata: event.metadata || undefined,
        source: finalSource,
      });
    }

    if (docsToInsert.length > 0) {
      await EngagementEvent.insertMany(docsToInsert, { ordered: false });
    }

    res.status(200).json({
      succes: true,
      data: { tracked: docsToInsert.length },
    });
  } catch (error) {
    console.error('[EventController] Erreur ingestion events:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors de l\'ingestion des events.',
    });
  }
};
