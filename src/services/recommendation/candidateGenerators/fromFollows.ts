/**
 * Candidate Generator: From Follows
 * Projets similaires a ceux que l'utilisateur suit
 * (memes categories/tags)
 */

import mongoose from 'mongoose';
import Projet from '../../../models/Projet.js';
import { RECO_CONFIG } from '../config.js';

export interface Candidate {
  projetId: string;
  source: string;
  sourceScore: number;
}

export async function candidateFromFollows(
  userId: mongoose.Types.ObjectId,
  excludeIds: Set<string>
): Promise<Candidate[]> {
  // Trouver les projets suivis
  const followedProjets = await Projet.find({
    followers: userId,
    statut: 'published',
  })
    .select('categorie tags')
    .lean();

  if (followedProjets.length === 0) return [];

  // Collecter categories et tags des projets suivis
  const categories = new Set<string>();
  const tags = new Set<string>();
  for (const p of followedProjets) {
    categories.add((p as any).categorie);
    for (const tag of ((p as any).tags || [])) {
      tags.add(tag);
    }
  }

  // Trouver des projets similaires (memes categories/tags) mais non suivis
  const filter: any = {
    statut: 'published',
    isHidden: { $ne: true },
    followers: { $ne: userId }, // Pas deja suivi
    _id: { $nin: [...excludeIds].map(id => new mongoose.Types.ObjectId(id)) },
    $or: [
      { categorie: { $in: [...categories] } },
      { tags: { $in: [...tags] } },
    ],
  };

  const projets = await Projet.find(filter)
    .select('_id categorie tags')
    .sort({ dateMiseAJour: -1 })
    .limit(RECO_CONFIG.candidateLimits.fromFollows)
    .lean();

  return projets.map((p: any) => {
    // Score base sur le nombre de matches
    let matches = 0;
    if (categories.has(p.categorie)) matches += 2;
    for (const tag of (p.tags || [])) {
      if (tags.has(tag)) matches++;
    }
    const score = Math.min(1, matches / 5);

    return {
      projetId: p._id.toString(),
      source: 'follows',
      sourceScore: score,
    };
  });
}
