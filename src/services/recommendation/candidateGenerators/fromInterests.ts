/**
 * Candidate Generator: From Interests
 * Projets matchant les categories/tags preferes de l'utilisateur
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

export async function candidateFromInterests(
  prefs: IUserPreferences,
  excludeIds: Set<string>
): Promise<Candidate[]> {
  // Extraire les top categories (affinite > 0.2)
  const topCategories: string[] = [];
  if (prefs.categoryAffinities) {
    for (const [cat, score] of prefs.categoryAffinities.entries()) {
      if (score > 0.2) topCategories.push(cat);
    }
  }

  // Extraire les top tags (affinite > 0.3)
  const topTags: string[] = [];
  if (prefs.tagAffinities) {
    for (const [tag, score] of prefs.tagAffinities.entries()) {
      if (score > 0.3) topTags.push(tag);
    }
  }

  if (topCategories.length === 0 && topTags.length === 0) return [];

  const filter: any = {
    statut: 'published',
    isHidden: { $ne: true },
    _id: { $nin: [...excludeIds].map(id => new mongoose.Types.ObjectId(id)) },
  };

  // Match categories OU tags
  const orConditions: any[] = [];
  if (topCategories.length > 0) orConditions.push({ categorie: { $in: topCategories } });
  if (topTags.length > 0) orConditions.push({ tags: { $in: topTags } });
  filter.$or = orConditions;

  const projets = await Projet.find(filter)
    .select('_id categorie tags')
    .sort({ dateMiseAJour: -1 })
    .limit(RECO_CONFIG.candidateLimits.fromInterests)
    .lean();

  return projets.map((p: any) => {
    // Score = somme des affinites matchees
    let score = 0;
    const catAffinity = prefs.categoryAffinities?.get(p.categorie) || 0;
    score += catAffinity;
    for (const tag of (p.tags || [])) {
      score += prefs.tagAffinities?.get(tag) || 0;
    }

    return {
      projetId: p._id.toString(),
      source: 'interests',
      sourceScore: Math.min(1, score),
    };
  });
}
