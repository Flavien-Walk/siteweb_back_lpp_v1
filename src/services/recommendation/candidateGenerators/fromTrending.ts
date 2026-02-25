/**
 * Candidate Generator: From Trending
 * Top trending projets, filtres par affinites user
 */

import ProjectSignals from '../../../models/ProjectSignals.js';
import { IUserPreferences } from '../../../models/UserPreferences.js';
import { RECO_CONFIG } from '../config.js';

export interface Candidate {
  projetId: string;
  source: string;
  sourceScore: number;
}

export async function candidateFromTrending(
  prefs: IUserPreferences | null,
  excludeIds: Set<string>
): Promise<Candidate[]> {
  const signals = await ProjectSignals.find({ trendingScore: { $gt: 0 } })
    .sort({ trendingScore: -1 })
    .limit(RECO_CONFIG.candidateLimits.fromTrending)
    .select('projet trendingScore')
    .lean();

  return signals
    .filter((s: any) => !excludeIds.has(s.projet.toString()))
    .map((s: any) => ({
      projetId: s.projet.toString(),
      source: 'trending',
      sourceScore: Math.min(1, s.trendingScore / 100), // Normalise
    }));
}
