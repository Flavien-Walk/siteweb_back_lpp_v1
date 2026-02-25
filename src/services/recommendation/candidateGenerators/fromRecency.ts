/**
 * Candidate Generator: From Recency
 * Projets recemment publies ou mis a jour
 */

import mongoose from 'mongoose';
import Projet from '../../../models/Projet.js';
import { RECO_CONFIG } from '../config.js';

export interface Candidate {
  projetId: string;
  source: string;
  sourceScore: number;
}

export async function candidateFromRecency(
  excludeIds: Set<string>
): Promise<Candidate[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const projets = await Projet.find({
    statut: 'published',
    isHidden: { $ne: true },
    dateMiseAJour: { $gte: sevenDaysAgo },
    _id: { $nin: [...excludeIds].map(id => new mongoose.Types.ObjectId(id)) },
  })
    .select('_id dateMiseAJour')
    .sort({ dateMiseAJour: -1 })
    .limit(RECO_CONFIG.candidateLimits.fromRecency)
    .lean();

  const now = Date.now();
  const halfLifeMs = RECO_CONFIG.freshness.halfLifeDays * 24 * 3600 * 1000;
  const ln2 = Math.log(2);

  return projets.map((p: any) => {
    const ageMs = now - new Date(p.dateMiseAJour).getTime();
    const freshness = Math.exp(-(ageMs / halfLifeMs) * ln2);

    return {
      projetId: p._id.toString(),
      source: 'recency',
      sourceScore: freshness,
    };
  });
}
