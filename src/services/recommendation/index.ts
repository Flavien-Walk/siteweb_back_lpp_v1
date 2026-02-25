/**
 * Recommendation Service — Point d'entree "Pour Toi"
 * Orchestre candidate generation → ranking → cache
 */

import mongoose from 'mongoose';
import EngagementEvent from '../../models/EngagementEvent.js';
import Projet from '../../models/Projet.js';
import UserPreferences, { IUserPreferences } from '../../models/UserPreferences.js';
import Utilisateur from '../../models/Utilisateur.js';
import { generateCandidates, generateColdStartCandidates } from './candidateGenerators/index.js';
import { RECO_CONFIG } from './config.js';
import { rankCandidates, RankedProject } from './ranker.js';

// === TYPES ===

export interface RecommendationResult {
  projets: any[];
  pagination: { page: number; limit: number; total: number };
  meta: {
    strategy: 'personalized' | 'cold_start';
    explorationRate: number;
    candidateCount: number;
  };
}

export interface RecommendationDebugResult {
  user: { _id: string; totalInteractions: number; strategy: string };
  preferences: {
    categoryAffinities: Record<string, number>;
    tagAffinities: Record<string, number>;
    recentlyViewedCount: number;
    recentlyRecommendedCount: number;
  };
  candidates: {
    total: number;
    bySources: Record<string, number>;
  };
  ranked: RankedProject[];
}

// === CACHE PER-USER ===

interface CachedReco {
  ranked: RankedProject[];
  timestamp: number;
}

const recoCache = new Map<string, CachedReco>();

// Nettoyage periodique du cache (toutes les 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of recoCache) {
    if (now - value.timestamp > RECO_CONFIG.cache.recoTTLMs * 5) {
      recoCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// === FONCTIONS PRINCIPALES ===

/**
 * Genere le feed "Pour Toi" pour un utilisateur
 */
export async function getRecommendations(
  userId: mongoose.Types.ObjectId,
  options: { page?: number; limit?: number } = {}
): Promise<RecommendationResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(50, Math.max(1, options.limit || 20));
  const totalNeeded = page * limit;

  // Verifier le cache
  const cacheKey = userId.toString();
  const cached = recoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RECO_CONFIG.cache.recoTTLMs) {
    return buildResult(cached.ranked, page, limit, cached.ranked.length > 0 ? 'personalized' : 'cold_start');
  }

  // Charger ou calculer les preferences utilisateur
  let prefs = await getOrComputeUserPreferences(userId);
  const isColdStart = (prefs.totalInteractions || 0) < RECO_CONFIG.coldStart.threshold;

  let ranked: RankedProject[];

  if (isColdStart) {
    // Cold start : trending + recents + exploration
    const candidates = await generateColdStartCandidates(new Set());
    ranked = await rankCandidates(candidates, userId, prefs, Math.max(totalNeeded, 50));
  } else {
    // Personnalise : toutes les sources
    // Les follows sont stockes dans Projet.followers[], pas dans l'utilisateur
    const followedProjets = await Projet.find(
      { followers: userId, statut: 'published' },
      { _id: 1 }
    ).lean();
    const followedProjetIds = new Set<string>(
      followedProjets.map((p: any) => p._id.toString())
    );

    const candidates = await generateCandidates(userId, prefs, followedProjetIds);
    ranked = await rankCandidates(candidates, userId, prefs, Math.max(totalNeeded, 50));
  }

  // Mettre en cache
  recoCache.set(cacheKey, { ranked, timestamp: Date.now() });

  // Mettre a jour recentlyRecommended (fire-and-forget)
  updateRecentlyRecommended(userId, ranked.slice(0, limit).map(r => r.projetId)).catch(() => {});

  return buildResult(ranked, page, limit, isColdStart ? 'cold_start' : 'personalized');
}

/**
 * Debug des recommandations pour un utilisateur (admin)
 */
export async function getRecommendationsDebug(
  userId: mongoose.Types.ObjectId
): Promise<RecommendationDebugResult | null> {
  const userExists = await Utilisateur.exists({ _id: userId });
  if (!userExists) return null;

  let prefs = await getOrComputeUserPreferences(userId);
  const isColdStart = (prefs.totalInteractions || 0) < RECO_CONFIG.coldStart.threshold;

  let candidates;
  if (isColdStart) {
    candidates = await generateColdStartCandidates(new Set());
  } else {
    const followedProjets = await Projet.find(
      { followers: userId, statut: 'published' },
      { _id: 1 }
    ).lean();
    const followedProjetIds = new Set<string>(
      followedProjets.map((p: any) => p._id.toString())
    );
    candidates = await generateCandidates(userId, prefs, followedProjetIds);
  }

  // Compter les sources
  const bySources: Record<string, number> = {};
  for (const c of candidates) {
    for (const s of c.sources) {
      bySources[s.source] = (bySources[s.source] || 0) + 1;
    }
  }

  const ranked = await rankCandidates(candidates, userId, prefs, 50);

  // Convertir les Maps en objets pour la serialisation
  const catAffinities: Record<string, number> = {};
  if (prefs.categoryAffinities) {
    for (const [k, v] of prefs.categoryAffinities.entries()) {
      catAffinities[k] = v;
    }
  }
  const tagAffs: Record<string, number> = {};
  if (prefs.tagAffinities) {
    for (const [k, v] of prefs.tagAffinities.entries()) {
      tagAffs[k] = v;
    }
  }

  return {
    user: {
      _id: userId.toString(),
      totalInteractions: prefs.totalInteractions || 0,
      strategy: isColdStart ? 'cold_start' : 'personalized',
    },
    preferences: {
      categoryAffinities: catAffinities,
      tagAffinities: tagAffs,
      recentlyViewedCount: (prefs.recentlyViewed || []).length,
      recentlyRecommendedCount: (prefs.recentlyRecommended || []).length,
    },
    candidates: {
      total: candidates.length,
      bySources,
    },
    ranked,
  };
}

// === HELPERS ===

/**
 * Construit le resultat pagine a partir des projets ranks
 */
async function buildResult(
  ranked: RankedProject[],
  page: number,
  limit: number,
  strategy: 'personalized' | 'cold_start'
): Promise<RecommendationResult> {
  const start = (page - 1) * limit;
  const pageItems = ranked.slice(start, start + limit);

  // Charger les projets complets
  const projetIds = pageItems.map(r => new mongoose.Types.ObjectId(r.projetId));

  const projets = await Projet.find({ _id: { $in: projetIds } })
    .select('nom pitch categorie image tags maturite datePublication dateMiseAJour followers localisation equipe statut')
    .lean();

  const projetMap = new Map(projets.map((p: any) => [p._id.toString(), p]));

  // Enrichir avec les scores de recommandation
  const enriched = pageItems
    .map(r => {
      const projet = projetMap.get(r.projetId);
      if (!projet) return null;
      return {
        ...projet,
        recommendationScore: r.score,
        recommendationSource: r.source,
        recommendationLabel: r.sourceLabel,
        followersCount: (projet as any).followers?.length || 0,
      };
    })
    .filter(Boolean);

  const explorationCount = pageItems.filter(r => r.source === 'exploration').length;

  return {
    projets: enriched,
    pagination: {
      page,
      limit,
      total: ranked.length,
    },
    meta: {
      strategy,
      explorationRate: pageItems.length > 0 ? explorationCount / pageItems.length : 0,
      candidateCount: ranked.length,
    },
  };
}

/**
 * Charge ou recalcule les preferences utilisateur
 */
async function getOrComputeUserPreferences(
  userId: mongoose.Types.ObjectId
): Promise<IUserPreferences> {
  const existing = await UserPreferences.findOne({ utilisateur: userId });

  // Si preferences fraiches, les retourner
  if (existing && Date.now() - existing.lastComputed.getTime() < RECO_CONFIG.cache.userPrefsTTLMs) {
    return existing;
  }

  // Recalculer les preferences depuis les events des 30 derniers jours
  return computeUserPreferences(userId, existing);
}

/**
 * Calcule les preferences utilisateur depuis EngagementEvent
 */
async function computeUserPreferences(
  userId: mongoose.Types.ObjectId,
  existing: IUserPreferences | null
): Promise<IUserPreferences> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  // Aggreger par categorie et tag
  const events = await EngagementEvent.find({
    actor: userId,
    targetType: 'projet',
    dateCreation: { $gte: thirtyDaysAgo },
    eventType: { $in: ['like', 'follow', 'comment', 'click', 'view_time', 'share', 'save'] },
  })
    .select('eventType targetCategorie targetTags')
    .lean();

  const categoryScores = new Map<string, number>();
  const tagScores = new Map<string, number>();

  for (const event of events as any[]) {
    const weight = RECO_CONFIG.affinityWeights[event.eventType] || 0;

    // Categorie
    if (event.targetCategorie) {
      const current = categoryScores.get(event.targetCategorie) || 0;
      categoryScores.set(event.targetCategorie, current + weight);
    }

    // Tags
    for (const tag of (event.targetTags || [])) {
      const current = tagScores.get(tag) || 0;
      tagScores.set(tag, current + weight);
    }
  }

  // Normaliser en 0-1
  const maxCatScore = Math.max(1, ...categoryScores.values());
  const categoryAffinities = new Map<string, number>();
  for (const [cat, score] of categoryScores) {
    categoryAffinities.set(cat, Math.round((score / maxCatScore) * 100) / 100);
  }

  const maxTagScore = Math.max(1, ...tagScores.values());
  const tagAffinities = new Map<string, number>();
  for (const [tag, score] of tagScores) {
    tagAffinities.set(tag, Math.round((score / maxTagScore) * 100) / 100);
  }

  // Upsert
  const update = {
    categoryAffinities,
    tagAffinities,
    totalInteractions: events.length,
    lastComputed: new Date(),
  };

  const prefs = await UserPreferences.findOneAndUpdate(
    { utilisateur: userId },
    { $set: update },
    { upsert: true, new: true }
  );

  return prefs;
}

/**
 * Met a jour la liste des projets recemment recommandes
 */
async function updateRecentlyRecommended(
  userId: mongoose.Types.ObjectId,
  projetIds: string[]
): Promise<void> {
  const items = projetIds.map(id => ({
    projetId: new mongoose.Types.ObjectId(id),
    date: new Date(),
  }));

  await UserPreferences.findOneAndUpdate(
    { utilisateur: userId },
    {
      $push: {
        recentlyRecommended: {
          $each: items,
          $slice: -RECO_CONFIG.cache.maxRecentlyRecommended,
        },
      },
    }
  );
}
