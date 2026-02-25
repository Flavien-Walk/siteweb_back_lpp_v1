/**
 * Scoring — Calcul du score trending pour un projet
 * Formule : trendingScore = weightedEngagement * timeDecay * velocityMultiplier * qualityFactor * (1 - spamPenalty)
 */

import { TRENDING_CONFIG } from './config.js';
import { IWindowStats, ITrendingDebug } from '../../models/ProjectSignals.js';

// === TYPES ===

export interface ProjectAggregation {
  projetId: string;
  // Events avec timestamps pour calcul decay par event
  events: Array<{
    eventType: string;
    dateCreation: Date;
    actorAccountAge: number;
    actor: string;
    value: number;
  }>;
  // Stats fenetres pre-calculees
  stats_1h: IWindowStats;
  stats_6h: IWindowStats;
  stats_24h: IWindowStats;
  stats_7d: IWindowStats;
  stats_total: IWindowStats;
  // Anti-spam
  sameActorRatio: number;
  newAccountRatio: number;
  // Qualite
  qualityScore: number;
}

export interface ScoringResult {
  trendingScore: number;
  debug: ITrendingDebug;
}

// === FONCTIONS DE SCORING ===

/**
 * Calcul du weighted engagement avec time decay par event
 * Chaque event est pondere par son type ET par son age
 */
export function computeWeightedEngagement(
  events: ProjectAggregation['events']
): number {
  const { weights, decay, antiSpam } = TRENDING_CONFIG;
  const now = Date.now();
  const halfLifeMs = decay.halfLifeHours * 3600 * 1000;
  const ln2 = Math.log(2);

  let total = 0;

  for (const event of events) {
    const weight = weights[event.eventType] ?? 0;
    if (weight === 0) continue;

    // Time decay per-event : events recents comptent plus
    const ageMs = now - new Date(event.dateCreation).getTime();
    const timeDecay = Math.exp(-(ageMs / halfLifeMs) * ln2);

    // Penalite comptes nouveaux
    let actorWeight = 1;
    if (event.actorAccountAge < antiSpam.newAccountThresholdHours) {
      actorWeight = 1 - antiSpam.newAccountWeightReduction;
    }

    total += weight * timeDecay * actorWeight * event.value;
  }

  return Math.max(0, total);
}

/**
 * Time decay global — depuis la derniere activite
 */
export function computeTimeDecay(
  events: ProjectAggregation['events']
): number {
  if (events.length === 0) return 0;

  const { decay } = TRENDING_CONFIG;
  const halfLifeMs = decay.halfLifeHours * 3600 * 1000;
  const ln2 = Math.log(2);

  // Trouver l'event le plus recent
  let latestMs = 0;
  for (const e of events) {
    const ts = new Date(e.dateCreation).getTime();
    if (ts > latestMs) latestMs = ts;
  }

  const ageMs = Date.now() - latestMs;
  return Math.exp(-(ageMs / halfLifeMs) * ln2);
}

/**
 * Velocity multiplier — acceleration de l'engagement
 * Compare engagement_6h vs moyenne horaire des 24h
 */
export function computeVelocityMultiplier(
  stats_6h: IWindowStats,
  stats_24h: IWindowStats
): number {
  const { velocity } = TRENDING_CONFIG;
  const { weights } = TRENDING_CONFIG;

  // Calcul engagement pondere par fenetre
  const engagementForWindow = (s: IWindowStats): number =>
    s.likes * weights.like +
    s.comments * weights.comment +
    s.follows * weights.follow +
    s.shares * weights.share +
    s.views * weights.view +
    s.clicks * weights.click;

  const eng6h = engagementForWindow(stats_6h);
  const eng24h = engagementForWindow(stats_24h);

  // Moyenne horaire des 24h
  const avgHourly24h = eng24h / velocity.longWindowHours;
  // Moyenne horaire des 6h
  const avgHourly6h = eng6h / velocity.shortWindowHours;

  // Ratio : si 6h est plus actif que la moyenne 24h → boost
  const ratio = avgHourly6h / Math.max(avgHourly24h, 0.1);

  // Clamp entre minBoost et minBoost + boostFactor
  return Math.min(
    velocity.minBoost + velocity.boostFactor,
    Math.max(velocity.minBoost, velocity.minBoost + (ratio - 1) * velocity.boostFactor)
  );
}

/**
 * Spam penalty — penalise les patterns suspects
 */
export function computeSpamPenalty(
  sameActorRatio: number,
  newAccountRatio: number,
  uniqueActors: number,
  totalImpressions: number
): number {
  const { antiSpam } = TRENDING_CONFIG;
  let penalty = 0;

  // Pas assez d'acteurs uniques
  if (uniqueActors < antiSpam.minUniqueActors) {
    penalty += 0.5;
  }

  // Trop d'engagement du meme acteur
  if (sameActorRatio > antiSpam.maxSameActorRatio) {
    penalty += 0.3;
  }

  // Trop de comptes nouveaux
  if (newAccountRatio > 0.5) {
    penalty += 0.2;
  }

  // Pas assez d'impressions (biais small sample)
  if (totalImpressions < antiSpam.minImpressions) {
    penalty += 0.2;
  }

  return Math.min(penalty, antiSpam.maxPenalty);
}

/**
 * Score final pour un projet
 */
export function computeTrendingScore(project: ProjectAggregation): ScoringResult {
  const weightedEngagement = computeWeightedEngagement(project.events);
  const timeDecay = computeTimeDecay(project.events);
  const velocityMultiplier = computeVelocityMultiplier(project.stats_6h, project.stats_24h);
  const qualityFactor = Math.max(TRENDING_CONFIG.quality.minScore, project.qualityScore);
  const spamPenalty = computeSpamPenalty(
    project.sameActorRatio,
    project.newAccountRatio,
    project.stats_7d.uniqueActors,
    project.stats_7d.impressions
  );

  const rawScore = weightedEngagement * timeDecay * velocityMultiplier * qualityFactor * (1 - spamPenalty);
  // Arrondir a 4 decimales
  const trendingScore = Math.round(rawScore * 10000) / 10000;

  return {
    trendingScore,
    debug: {
      weightedEngagement: Math.round(weightedEngagement * 100) / 100,
      timeDecay: Math.round(timeDecay * 1000) / 1000,
      velocityMultiplier: Math.round(velocityMultiplier * 100) / 100,
      qualityFactor: Math.round(qualityFactor * 100) / 100,
      spamPenalty: Math.round(spamPenalty * 100) / 100,
      rawScore: Math.round(rawScore * 10000) / 10000,
    },
  };
}
