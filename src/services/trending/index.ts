/**
 * Trending Service — Point d'entree du systeme de tendances
 * Gere le refresh periodique et expose les fonctions de query
 */

import mongoose from 'mongoose';
import ProjectSignals from '../../models/ProjectSignals.js';
import Projet from '../../models/Projet.js';
import { refreshTrendingScores, getProjectSignalsDebug } from './aggregator.js';
import { TRENDING_CONFIG } from './config.js';

// === CACHE ===

interface TrendingCache {
  data: any;
  expiry: number;
}

const trendingCache = new Map<string, TrendingCache>();

function getCacheKey(page: number, limit: number, categorie?: string): string {
  return `trending:${page}:${limit}:${categorie || 'all'}`;
}

// === INIT ===

let refreshInterval: ReturnType<typeof setInterval> | null = null;
let lastRefreshDate: Date | null = null;

/**
 * Demarre le refresh periodique des scores trending
 * Appeler au demarrage du serveur
 */
export function startTrendingRefresh(): void {
  if (refreshInterval) return; // Deja demarre

  console.log('[Trending] Demarrage du refresh periodique (interval: %dms)', TRENDING_CONFIG.refresh.intervalMs);

  // Premier refresh immediat
  refreshTrendingScores()
    .then(() => {
      lastRefreshDate = new Date();
    })
    .catch((err) => {
      console.error('[Trending] Erreur premier refresh:', err);
    });

  // Refresh periodique
  refreshInterval = setInterval(async () => {
    try {
      await refreshTrendingScores();
      lastRefreshDate = new Date();
      // Invalider le cache apres chaque refresh
      trendingCache.clear();
    } catch (err) {
      console.error('[Trending] Erreur refresh periodique:', err);
    }
  }, TRENDING_CONFIG.refresh.intervalMs);
}

/**
 * Arrete le refresh periodique
 */
export function stopTrendingRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// === QUERIES ===

interface TrendingOptions {
  page?: number;
  limit?: number;
  categorie?: string;
}

/**
 * GET trending projects — retourne les projets classes par score
 */
export async function getTrendingProjects(options: TrendingOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const { categorie } = options;

  // Check cache
  const cacheKey = getCacheKey(page, limit, categorie);
  const cached = trendingCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Filtre optionnel par categorie
  const signalFilter: any = { trendingScore: { $gt: 0 } };

  // Si categorie, on doit d'abord trouver les projets de cette categorie
  let projetIds: mongoose.Types.ObjectId[] | null = null;
  if (categorie) {
    const projets = await Projet.find({
      statut: 'published',
      isHidden: { $ne: true },
      categorie,
    })
      .select('_id')
      .lean();
    projetIds = projets.map((p: any) => p._id);
    signalFilter.projet = { $in: projetIds };
  }

  const skip = (page - 1) * limit;

  const [signals, total] = await Promise.all([
    ProjectSignals.find(signalFilter)
      .sort({ trendingScore: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ProjectSignals.countDocuments(signalFilter),
  ]);

  // Recuperer les projets complets
  const projetIdsToFetch = signals.map((s: any) => s.projet);
  const projets = await Projet.find({ _id: { $in: projetIdsToFetch } })
    .populate('porteur', 'prenom nom avatar')
    .populate('equipe.utilisateur', 'prenom nom avatar')
    .lean();

  // Map pour acces rapide
  const projetMap = new Map(projets.map((p: any) => [p._id.toString(), p]));

  // Fusionner projet + signaux
  const result = signals
    .map((signal: any, index: number) => {
      const projet = projetMap.get(signal.projet.toString());
      if (!projet) return null;

      return {
        ...projet,
        trendingScore: signal.trendingScore,
        trendingRank: skip + index + 1,
        engagement: {
          likes_24h: signal.engagement_24h?.likes || 0,
          comments_24h: signal.engagement_24h?.comments || 0,
          follows_24h: signal.engagement_24h?.follows || 0,
        },
        nbFollowers: (projet as any).followers?.length || 0,
        followers: undefined, // PENTEST: ne pas exposer
      };
    })
    .filter(Boolean);

  const response = {
    projets: result,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    meta: {
      lastRefresh: lastRefreshDate,
      nextRefresh: lastRefreshDate
        ? new Date(lastRefreshDate.getTime() + TRENDING_CONFIG.refresh.intervalMs)
        : null,
    },
  };

  // Mettre en cache
  trendingCache.set(cacheKey, {
    data: response,
    expiry: Date.now() + TRENDING_CONFIG.refresh.cacheTTLMs,
  });

  return response;
}

/**
 * Debug scoring d'un projet specifique
 */
export async function getTrendingDebug(projetId: string) {
  const debugData = await getProjectSignalsDebug(projetId);
  if (!debugData) return null;

  const projet = await Projet.findById(projetId).select('nom categorie').lean();

  const { signals } = debugData;
  const debug = signals.trendingDebug;

  // Generer une explication textuelle
  const explanations: string[] = [];

  if (debug.weightedEngagement > 10) {
    explanations.push(`Engagement fort (${debug.weightedEngagement.toFixed(1)} points ponderes)`);
  } else if (debug.weightedEngagement > 0) {
    explanations.push(`Engagement modere (${debug.weightedEngagement.toFixed(1)} points ponderes)`);
  } else {
    explanations.push('Aucun engagement recent');
  }

  if (debug.velocityMultiplier > 1.2) {
    explanations.push(`Acceleration detectee (x${debug.velocityMultiplier.toFixed(2)})`);
  }

  if (debug.spamPenalty > 0) {
    explanations.push(`Penalite anti-spam (-${(debug.spamPenalty * 100).toFixed(0)}%)`);
  }

  if (debug.qualityFactor < 0.5) {
    explanations.push('Profil projet incomplet (penalise)');
  }

  return {
    projet: projet ? { _id: projet._id, nom: (projet as any).nom } : null,
    signals: {
      engagement_1h: signals.engagement_1h,
      engagement_6h: signals.engagement_6h,
      engagement_24h: signals.engagement_24h,
      engagement_7d: signals.engagement_7d,
    },
    scoring: {
      ...debug,
      finalScore: signals.trendingScore,
      rank: signals.trendingRank,
      explanation: explanations.join('. ') + '.',
    },
    recentEvents: debugData.recentEvents,
  };
}

// Re-export config pour acces externe
export { TRENDING_CONFIG } from './config.js';
