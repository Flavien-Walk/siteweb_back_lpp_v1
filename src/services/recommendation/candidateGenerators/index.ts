/**
 * Orchestrateur des Candidate Generators
 * Merge et dedup les candidats de toutes les sources
 */

import mongoose from 'mongoose';
import { IUserPreferences } from '../../../models/UserPreferences.js';
import { candidateFromInterests } from './fromInterests.js';
import { candidateFromFollows } from './fromFollows.js';
import { candidateFromSimilarUsers } from './fromSimilarUsers.js';
import { candidateFromRecency } from './fromRecency.js';
import { candidateFromTrending } from './fromTrending.js';
import { candidateFromExploration } from './fromExploration.js';

export interface MergedCandidate {
  projetId: string;
  sources: Array<{ source: string; score: number }>;
  bestSourceScore: number;
}

/**
 * Genere et merge les candidats de toutes les sources
 */
export async function generateCandidates(
  userId: mongoose.Types.ObjectId,
  prefs: IUserPreferences,
  followedProjetIds: Set<string>
): Promise<MergedCandidate[]> {
  // Exclure les projets deja suivis et recemment vus
  const excludeIds = new Set(followedProjetIds);
  for (const item of (prefs.recentlyViewed || []).slice(0, 50)) {
    excludeIds.add(item.projetId.toString());
  }

  // Lancer toutes les sources en parallele
  const [interests, follows, similarUsers, recency, trending, exploration] = await Promise.all([
    candidateFromInterests(prefs, excludeIds).catch(() => []),
    candidateFromFollows(userId, excludeIds).catch(() => []),
    candidateFromSimilarUsers(userId, excludeIds).catch(() => []),
    candidateFromRecency(excludeIds).catch(() => []),
    candidateFromTrending(prefs, excludeIds).catch(() => []),
    candidateFromExploration(prefs, excludeIds).catch(() => []),
  ]);

  // Merge et dedup par projetId
  const candidateMap = new Map<string, MergedCandidate>();

  const allCandidates = [
    ...interests,
    ...follows,
    ...similarUsers,
    ...recency,
    ...trending,
    ...exploration,
  ];

  for (const candidate of allCandidates) {
    const existing = candidateMap.get(candidate.projetId);
    if (existing) {
      existing.sources.push({ source: candidate.source, score: candidate.sourceScore });
      if (candidate.sourceScore > existing.bestSourceScore) {
        existing.bestSourceScore = candidate.sourceScore;
      }
    } else {
      candidateMap.set(candidate.projetId, {
        projetId: candidate.projetId,
        sources: [{ source: candidate.source, score: candidate.sourceScore }],
        bestSourceScore: candidate.sourceScore,
      });
    }
  }

  return [...candidateMap.values()];
}

/**
 * Genere des candidats pour le cold start (nouvel utilisateur)
 */
export async function generateColdStartCandidates(
  excludeIds: Set<string>
): Promise<MergedCandidate[]> {
  const dummyPrefs = { categoryAffinities: new Map(), tagAffinities: new Map() } as any;

  const [recency, trending, exploration] = await Promise.all([
    candidateFromRecency(excludeIds).catch(() => []),
    candidateFromTrending(null, excludeIds).catch(() => []),
    candidateFromExploration(null, excludeIds).catch(() => []),
  ]);

  const candidateMap = new Map<string, MergedCandidate>();
  const allCandidates = [...trending, ...recency, ...exploration];

  for (const candidate of allCandidates) {
    const existing = candidateMap.get(candidate.projetId);
    if (existing) {
      existing.sources.push({ source: candidate.source, score: candidate.sourceScore });
      if (candidate.sourceScore > existing.bestSourceScore) {
        existing.bestSourceScore = candidate.sourceScore;
      }
    } else {
      candidateMap.set(candidate.projetId, {
        projetId: candidate.projetId,
        sources: [{ source: candidate.source, score: candidate.sourceScore }],
        bestSourceScore: candidate.sourceScore,
      });
    }
  }

  return [...candidateMap.values()];
}

/**
 * Genere des candidats pour le warm start (onboarding complete, peu d'interactions)
 * Utilise interests + trending + recency + exploration (PAS follows ni similarUsers)
 */
export async function generateWarmStartCandidates(
  prefs: any,
  excludeIds: Set<string>
): Promise<MergedCandidate[]> {
  const [interests, recency, trending, exploration] = await Promise.all([
    candidateFromInterests(prefs, excludeIds).catch(() => []),
    candidateFromRecency(excludeIds).catch(() => []),
    candidateFromTrending(prefs, excludeIds).catch(() => []),
    candidateFromExploration(prefs, excludeIds).catch(() => []),
  ]);

  // Same merge/dedup logic as generateCandidates
  const candidateMap = new Map<string, MergedCandidate>();
  const allCandidates = [...interests, ...trending, ...recency, ...exploration];

  for (const candidate of allCandidates) {
    const existing = candidateMap.get(candidate.projetId);
    if (existing) {
      existing.sources.push({ source: candidate.source, score: candidate.sourceScore });
      if (candidate.sourceScore > existing.bestSourceScore) {
        existing.bestSourceScore = candidate.sourceScore;
      }
    } else {
      candidateMap.set(candidate.projetId, {
        projetId: candidate.projetId,
        sources: [{ source: candidate.source, score: candidate.sourceScore }],
        bestSourceScore: candidate.sourceScore,
      });
    }
  }

  return [...candidateMap.values()];
}
