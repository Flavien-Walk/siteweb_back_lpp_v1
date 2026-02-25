/**
 * Aggregator — Pipeline MongoDB pour calculer les signaux par projet
 * Execute periodiquement pour materialiser les scores trending
 */

import mongoose from 'mongoose';
import EngagementEvent from '../../models/EngagementEvent.js';
import ProjectSignals, { IWindowStats } from '../../models/ProjectSignals.js';
import Projet, { IProjet } from '../../models/Projet.js';
import { computeTrendingScore, ProjectAggregation } from './scoring.js';
import { TRENDING_CONFIG } from './config.js';

// === QUALITE PROJET ===

/**
 * Calcule le score de qualite d'un projet (0 a 1)
 * Base sur la completude du profil
 */
function computeQualityScore(projet: any): number {
  const w = TRENDING_CONFIG.quality.fieldWeights;
  let score = 0;

  if (projet.image) score += w.hasImage;
  if (projet.description && projet.description.length > 50) score += w.hasDescription;
  if (projet.pitch && projet.pitch.length > 10) score += w.hasPitch;
  if (projet.tags && projet.tags.length >= 2) score += w.hasTags;
  if (projet.equipe && projet.equipe.length >= 1) score += w.hasTeam;
  if (projet.liens && projet.liens.length >= 1) score += w.hasLinks;
  if (projet.localisation?.ville) score += w.hasLocation;
  if (projet.maturite && projet.maturite !== 'idee') score += w.maturityBonus;

  return Math.max(TRENDING_CONFIG.quality.minScore, Math.min(1, score));
}

// === AGGREGATION FENETRES ===

/**
 * Aggrege les events d'engagement par projet et par fenetre temporelle
 */
async function aggregateWindowStats(
  projetId: mongoose.Types.ObjectId,
  windowHours: number
): Promise<IWindowStats> {
  const since = new Date(Date.now() - windowHours * 3600 * 1000);

  const pipeline = [
    {
      $match: {
        targetType: 'projet',
        targetId: projetId,
        dateCreation: { $gte: since },
      },
    },
    {
      $group: {
        _id: null,
        likes: { $sum: { $cond: [{ $eq: ['$eventType', 'like'] }, 1, 0] } },
        comments: { $sum: { $cond: [{ $eq: ['$eventType', 'comment'] }, 1, 0] } },
        follows: { $sum: { $cond: [{ $eq: ['$eventType', 'follow'] }, 1, 0] } },
        shares: { $sum: { $cond: [{ $eq: ['$eventType', 'share'] }, 1, 0] } },
        views: { $sum: { $cond: [{ $eq: ['$eventType', 'view_time'] }, 1, 0] } },
        clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] } },
        impressions: { $sum: { $cond: [{ $eq: ['$eventType', 'impression'] }, 1, 0] } },
        uniqueActors: { $addToSet: '$actor' },
      },
    },
    {
      $project: {
        _id: 0,
        likes: 1,
        comments: 1,
        follows: 1,
        shares: 1,
        views: 1,
        clicks: 1,
        impressions: 1,
        uniqueActors: { $size: '$uniqueActors' },
      },
    },
  ];

  const result = await EngagementEvent.aggregate(pipeline);
  if (result.length === 0) {
    return { likes: 0, comments: 0, follows: 0, shares: 0, views: 0, clicks: 0, impressions: 0, uniqueActors: 0 };
  }
  return result[0];
}

/**
 * Calcule les metriques anti-spam pour un projet
 */
async function computeAntiSpamMetrics(
  projetId: mongoose.Types.ObjectId
): Promise<{ sameActorRatio: number; newAccountRatio: number }> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000); // 7 jours

  // Top acteur et ratio
  const actorPipeline = [
    {
      $match: {
        targetType: 'projet',
        targetId: projetId,
        dateCreation: { $gte: since },
        eventType: { $nin: ['impression'] }, // Ignorer impressions pour anti-spam
      },
    },
    {
      $group: {
        _id: '$actor',
        count: { $sum: 1 },
        isNewAccount: {
          $max: {
            $cond: [
              { $lt: ['$actorAccountAge', TRENDING_CONFIG.antiSpam.newAccountThresholdHours] },
              1,
              0,
            ],
          },
        },
      },
    },
  ];

  const actorStats = await EngagementEvent.aggregate(actorPipeline);

  if (actorStats.length === 0) {
    return { sameActorRatio: 0, newAccountRatio: 0 };
  }

  const totalEvents = actorStats.reduce((sum, a) => sum + a.count, 0);
  const maxActorEvents = Math.max(...actorStats.map((a: any) => a.count));
  const newAccountEvents = actorStats
    .filter((a: any) => a.isNewAccount === 1)
    .reduce((sum: number, a: any) => sum + a.count, 0);

  return {
    sameActorRatio: totalEvents > 0 ? maxActorEvents / totalEvents : 0,
    newAccountRatio: totalEvents > 0 ? newAccountEvents / totalEvents : 0,
  };
}

// === REFRESH GLOBAL ===

/**
 * Recalcule les scores trending pour tous les projets publies
 * Execute periodiquement (toutes les 5 min)
 */
export async function refreshTrendingScores(): Promise<{ processed: number; duration: number }> {
  const start = Date.now();

  // Recuperer tous les projets publies et non caches
  const projets = await Projet.find({
    statut: 'published',
    isHidden: { $ne: true },
  })
    .select('_id categorie tags image description pitch equipe liens localisation maturite')
    .lean() as (Pick<IProjet, '_id' | 'categorie' | 'tags' | 'image' | 'description' | 'pitch' | 'equipe' | 'liens' | 'localisation' | 'maturite'>)[];

  let processed = 0;

  for (const projet of projets) {
    try {
      const projetId = projet._id as mongoose.Types.ObjectId;

      // Aggreger les fenetres en parallele
      const [stats_1h, stats_6h, stats_24h, stats_7d, antiSpam] = await Promise.all([
        aggregateWindowStats(projetId, 1),
        aggregateWindowStats(projetId, 6),
        aggregateWindowStats(projetId, 24),
        aggregateWindowStats(projetId, 7 * 24),
        computeAntiSpamMetrics(projetId),
      ]);

      // Recuperer les events bruts des 7 derniers jours pour le scoring
      const events = await EngagementEvent.find({
        targetType: 'projet',
        targetId: projetId,
        dateCreation: { $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      })
        .select('eventType dateCreation actorAccountAge actor value')
        .lean();

      const qualityScore = computeQualityScore(projet);

      // Construire l'objet d'aggregation
      const aggregation: ProjectAggregation = {
        projetId: projetId.toString(),
        events: events.map((e: any) => ({
          eventType: e.eventType,
          dateCreation: e.dateCreation,
          actorAccountAge: e.actorAccountAge || 0,
          actor: e.actor.toString(),
          value: e.value || 1,
        })),
        stats_1h,
        stats_6h,
        stats_24h,
        stats_7d,
        stats_total: stats_7d, // Utilise 7d comme total pour le moment
        sameActorRatio: antiSpam.sameActorRatio,
        newAccountRatio: antiSpam.newAccountRatio,
        qualityScore,
      };

      // Calculer le score
      const result = computeTrendingScore(aggregation);

      // Upsert dans ProjectSignals
      await ProjectSignals.findOneAndUpdate(
        { projet: projetId },
        {
          $set: {
            engagement_1h: stats_1h,
            engagement_6h: stats_6h,
            engagement_24h: stats_24h,
            engagement_7d: stats_7d,
            engagement_total: stats_7d,
            trendingScore: result.trendingScore,
            trendingDebug: result.debug,
            qualityScore,
            sameActorRatio: antiSpam.sameActorRatio,
            newAccountRatio: antiSpam.newAccountRatio,
            lastComputed: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      processed++;
    } catch (error) {
      console.error(`[Trending] Erreur pour projet ${projet._id}:`, error);
    }
  }

  // Mettre a jour les rangs
  const allSignals = await ProjectSignals.find()
    .sort({ trendingScore: -1 })
    .select('_id')
    .lean();

  const bulkOps = allSignals.map((signal: any, index: number) => ({
    updateOne: {
      filter: { _id: signal._id },
      update: { $set: { trendingRank: index + 1 } },
    },
  }));

  if (bulkOps.length > 0) {
    await ProjectSignals.bulkWrite(bulkOps);
  }

  const duration = Date.now() - start;
  console.log(`[Trending] Refresh termine: ${processed} projets en ${duration}ms`);

  return { processed, duration };
}

/**
 * Recupere les signaux d'un projet specifique (pour debug)
 */
export async function getProjectSignalsDebug(projetId: string) {
  const signals = await ProjectSignals.findOne({
    projet: new mongoose.Types.ObjectId(projetId),
  }).lean();

  if (!signals) return null;

  // Recuperer les events recents pour le detail
  const recentEvents = await EngagementEvent.find({
    targetType: 'projet',
    targetId: new mongoose.Types.ObjectId(projetId),
    dateCreation: { $gte: new Date(Date.now() - 24 * 3600 * 1000) },
  })
    .sort({ dateCreation: -1 })
    .limit(50)
    .select('eventType dateCreation actor value')
    .lean();

  return {
    signals,
    recentEvents,
  };
}
