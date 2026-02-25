/**
 * Candidate Generator: From Exploration
 * Projets aleatoires HORS affinites user pour diversite (anti-bulle)
 */

import mongoose from 'mongoose';
import Projet from '../../../models/Projet.js';
import { IUserPreferences } from '../../../models/UserPreferences.js';
import { RECO_CONFIG } from '../config.js';

export interface Candidate {
  projetId: string;
  source: string;
  sourceScore: number;
}

export async function candidateFromExploration(
  prefs: IUserPreferences | null,
  excludeIds: Set<string>
): Promise<Candidate[]> {
  // Determiner les categories a EVITER (celles deja fortes en affinite)
  const avoidCategories: string[] = [];
  if (prefs?.categoryAffinities) {
    for (const [cat, score] of prefs.categoryAffinities.entries()) {
      if (score > 0.5) avoidCategories.push(cat);
    }
  }

  const filter: any = {
    statut: 'published',
    isHidden: { $ne: true },
    _id: { $nin: [...excludeIds].map(id => new mongoose.Types.ObjectId(id)) },
  };

  // Si on a des categories a eviter, exclure
  if (avoidCategories.length > 0 && avoidCategories.length < 7) {
    filter.categorie = { $nin: avoidCategories };
  }

  // Utiliser $sample pour un tirage aleatoire
  const projets = await Projet.aggregate([
    { $match: filter },
    { $sample: { size: RECO_CONFIG.candidateLimits.fromExploration } },
    { $project: { _id: 1 } },
  ]);

  return projets.map((p: any) => ({
    projetId: p._id.toString(),
    source: 'exploration',
    sourceScore: 0.5, // Score neutre
  }));
}
