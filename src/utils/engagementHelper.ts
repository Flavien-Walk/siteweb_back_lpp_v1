/**
 * Helper pour emettre des EngagementEvents depuis les controllers existants
 * Fire-and-forget : ne jamais bloquer le flow principal
 */

import mongoose from 'mongoose';
import EngagementEvent, { EngagementEventType, EngagementTargetType } from '../models/EngagementEvent.js';
import Projet from '../models/Projet.js';

// Cache categorie/tags projet (5 min)
const projetInfoCache = new Map<string, { categorie: string; tags: string[]; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getProjetInfo(projetId: string): Promise<{ categorie: string; tags: string[] } | null> {
  const cached = projetInfoCache.get(projetId);
  if (cached && cached.expiry > Date.now()) {
    return { categorie: cached.categorie, tags: cached.tags };
  }

  try {
    const projet = await Projet.findById(projetId).select('categorie tags').lean();
    if (!projet) return null;

    const info = { categorie: (projet as any).categorie || '', tags: (projet as any).tags || [] };
    projetInfoCache.set(projetId, { ...info, expiry: Date.now() + CACHE_TTL });
    return info;
  } catch {
    return null;
  }
}

/**
 * Emettre un engagement event (fire-and-forget)
 * Ne jamais throw — les erreurs sont loggees silencieusement
 */
export function emitEngagementEvent(params: {
  actorId: mongoose.Types.ObjectId | string;
  actorAccountAge?: number;
  eventType: EngagementEventType;
  targetType: EngagementTargetType;
  targetId: mongoose.Types.ObjectId | string;
  value?: number;
  source?: 'mobile' | 'web' | 'api';
}): void {
  // Fire and forget — pas de await
  (async () => {
    try {
      const projetId = params.targetId.toString();
      const projetInfo = await getProjetInfo(projetId);

      await EngagementEvent.create({
        actor: params.actorId,
        actorAccountAge: params.actorAccountAge || 0,
        eventType: params.eventType,
        targetType: params.targetType,
        targetId: params.targetId,
        targetCategorie: projetInfo?.categorie || '',
        targetTags: projetInfo?.tags || [],
        value: params.value || 1,
        source: params.source || 'api',
      });
    } catch (error) {
      // Silent fail — l'engagement tracking ne doit jamais casser le flow
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[EngagementHelper] Erreur emission event:', error);
      }
    }
  })();
}
