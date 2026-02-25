/**
 * Ranker — Scoring multi-signaux pour classer les candidats
 */

import mongoose from 'mongoose';
import Projet from '../../models/Projet.js';
import ProjectSignals from '../../models/ProjectSignals.js';
import Utilisateur from '../../models/Utilisateur.js';
import { IUserPreferences } from '../../models/UserPreferences.js';
import { MergedCandidate } from './candidateGenerators/index.js';
import { RECO_CONFIG } from './config.js';

export interface RankedProject {
  projetId: string;
  score: number;
  source: string; // Source principale pour le label UX
  sourceLabel: string; // Label lisible pour l'UX
  breakdown: {
    categoryAffinity: number;
    freshness: number;
    engagement: number;
    social: number;
    quality: number;
    diversity: number;
    exploration: number;
    penalties: number;
  };
}

/**
 * Classe les candidats par score multi-signaux
 */
export async function rankCandidates(
  candidates: MergedCandidate[],
  userId: mongoose.Types.ObjectId,
  prefs: IUserPreferences,
  limit: number
): Promise<RankedProject[]> {
  if (candidates.length === 0) return [];

  const projetIds = candidates.map(c => new mongoose.Types.ObjectId(c.projetId));

  // Charger les donnees en parallele
  const [projets, signals, userAmis] = await Promise.all([
    Projet.find({ _id: { $in: projetIds } })
      .select('categorie tags dateMiseAJour datePublication maturite image description pitch equipe liens localisation followers')
      .lean(),
    ProjectSignals.find({ projet: { $in: projetIds } })
      .select('projet trendingScore qualityScore engagement_24h')
      .lean(),
    Utilisateur.findById(userId).select('amis').lean(),
  ]);

  // Maps pour acces rapide
  const projetMap = new Map(projets.map((p: any) => [p._id.toString(), p]));
  const signalMap = new Map(signals.map((s: any) => [s.projet.toString(), s]));
  const amisSet = new Set(((userAmis as any)?.amis || []).map((a: any) => a.toString()));

  // Tracker les categories pour le bonus diversite
  const categoryCount = new Map<string, number>();

  const now = Date.now();
  const halfLifeMs = RECO_CONFIG.freshness.halfLifeDays * 24 * 3600 * 1000;
  const ln2 = Math.log(2);
  const weights = RECO_CONFIG.ranking;

  // Normaliser engagement (max parmi tous les candidats)
  let maxEngagement = 0;
  for (const s of signals) {
    if ((s as any).trendingScore > maxEngagement) maxEngagement = (s as any).trendingScore;
  }
  if (maxEngagement === 0) maxEngagement = 1;

  const ranked: RankedProject[] = [];

  for (const candidate of candidates) {
    const projet = projetMap.get(candidate.projetId);
    if (!projet) continue;

    const signal = signalMap.get(candidate.projetId);
    const p = projet as any;

    // 1) Category Affinity
    const catAffinity = prefs.categoryAffinities?.get(p.categorie) || 0;
    let tagAffinity = 0;
    for (const tag of (p.tags || [])) {
      tagAffinity += prefs.tagAffinities?.get(tag) || 0;
    }
    const categoryAffinityScore = Math.min(1, catAffinity + tagAffinity * 0.5);

    // 2) Freshness
    const lastActivity = new Date(p.dateMiseAJour || p.datePublication || p.dateCreation).getTime();
    const freshnessScore = Math.exp(-((now - lastActivity) / halfLifeMs) * ln2);

    // 3) Engagement (normalise par le max)
    const engagementScore = signal ? (signal as any).trendingScore / maxEngagement : 0;

    // 4) Social (amis qui suivent ce projet)
    let socialScore = 0;
    const followers = p.followers || [];
    for (const f of followers) {
      if (amisSet.has(f.toString())) socialScore += 0.2;
    }
    socialScore = Math.min(1, socialScore);

    // 5) Quality
    const qualityScore = signal ? (signal as any).qualityScore : 0.3;

    // 6) Diversity bonus
    const catCount = categoryCount.get(p.categorie) || 0;
    const diversityScore = catCount === 0 ? 1 : catCount < 3 ? 0.5 : 0;
    categoryCount.set(p.categorie, catCount + 1);

    // 7) Exploration bonus
    const isExploration = candidate.sources.some(s => s.source === 'exploration');
    const explorationScore = isExploration ? 1 : 0;

    // 8) Penalties
    let penalties = 0;
    const recentlyViewed = prefs.recentlyViewed || [];
    if (recentlyViewed.some(rv => rv.projetId.toString() === candidate.projetId)) {
      penalties += RECO_CONFIG.penalties.alreadySeen;
    }

    // Score final
    const score =
      categoryAffinityScore * weights.categoryAffinity +
      freshnessScore * weights.freshness +
      engagementScore * weights.engagement +
      socialScore * weights.social +
      qualityScore * weights.quality +
      diversityScore * weights.diversity +
      explorationScore * weights.exploration -
      penalties;

    // Determiner la source principale pour le label
    const primarySource = candidate.sources.sort((a, b) => b.score - a.score)[0];
    const sourceLabel = getSourceLabel(primarySource.source, p.categorie);

    ranked.push({
      projetId: candidate.projetId,
      score: Math.round(score * 10000) / 10000,
      source: primarySource.source,
      sourceLabel,
      breakdown: {
        categoryAffinity: Math.round(categoryAffinityScore * 100) / 100,
        freshness: Math.round(freshnessScore * 100) / 100,
        engagement: Math.round(engagementScore * 100) / 100,
        social: Math.round(socialScore * 100) / 100,
        quality: Math.round(qualityScore * 100) / 100,
        diversity: Math.round(diversityScore * 100) / 100,
        exploration: Math.round(explorationScore * 100) / 100,
        penalties: Math.round(penalties * 100) / 100,
      },
    });
  }

  // Trier par score decroissant
  ranked.sort((a, b) => b.score - a.score);

  // Forcer le quota d'exploration: 25% du feed
  return enforceExplorationRate(ranked, limit);
}

/**
 * Assure que 25% du feed vient de l'exploration
 */
function enforceExplorationRate(ranked: RankedProject[], limit: number): RankedProject[] {
  const explorationCount = Math.ceil(limit * RECO_CONFIG.exploration.rate);
  const regularCount = limit - explorationCount;

  const explorationItems = ranked.filter(r => r.source === 'exploration');
  const regularItems = ranked.filter(r => r.source !== 'exploration');

  const finalExploration = explorationItems.slice(0, explorationCount);
  const finalRegular = regularItems.slice(0, regularCount);

  // Si pas assez d'exploration, completer avec du regular
  const finalList = [...finalRegular, ...finalExploration];
  if (finalList.length < limit) {
    const remaining = ranked.filter(r => !finalList.includes(r)).slice(0, limit - finalList.length);
    finalList.push(...remaining);
  }

  // Re-trier par score mais en gardant l'exploration intercalee
  return interleaveExploration(finalList.slice(0, limit));
}

/**
 * Intercale les items d'exploration dans le feed regulier
 * Evite un bloc d'exploration a la fin
 */
function interleaveExploration(items: RankedProject[]): RankedProject[] {
  const regular = items.filter(i => i.source !== 'exploration');
  const exploration = items.filter(i => i.source === 'exploration');

  if (exploration.length === 0) return regular;

  const result: RankedProject[] = [];
  const interval = Math.max(2, Math.floor(regular.length / (exploration.length + 1)));

  let regIdx = 0;
  let expIdx = 0;

  for (let i = 0; i < items.length; i++) {
    if (expIdx < exploration.length && i > 0 && i % interval === 0) {
      result.push(exploration[expIdx++]);
    } else if (regIdx < regular.length) {
      result.push(regular[regIdx++]);
    }
  }

  // Ajouter les restants
  while (expIdx < exploration.length) result.push(exploration[expIdx++]);
  while (regIdx < regular.length) result.push(regular[regIdx++]);

  return result;
}

/**
 * Genere un label lisible pour l'UX ("Parce que vous aimez Tech", etc.)
 */
function getSourceLabel(source: string, categorie?: string): string {
  const catLabels: Record<string, string> = {
    tech: 'Tech',
    food: 'Food & Agro',
    sante: 'Sante',
    education: 'Education',
    energie: 'Energie',
    culture: 'Culture',
    environnement: 'Environnement',
    autre: 'Innovation',
  };

  switch (source) {
    case 'interests':
      return `Parce que vous aimez ${catLabels[categorie || ''] || 'ce domaine'}`;
    case 'follows':
      return 'Similaire a vos projets suivis';
    case 'similar_users':
      return 'Des profils comme vous aiment';
    case 'trending':
      return 'Populaire cette semaine';
    case 'recency':
      return 'Nouveau sur LPP';
    case 'exploration':
      return 'A decouvrir';
    default:
      return 'Recommande pour vous';
  }
}
