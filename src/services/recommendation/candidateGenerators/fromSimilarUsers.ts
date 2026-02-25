/**
 * Candidate Generator: From Similar Users
 * Collaborative filtering leger: users qui suivent les memes projets → leurs autres follows
 */

import mongoose from 'mongoose';
import Projet from '../../../models/Projet.js';
import { RECO_CONFIG } from '../config.js';

export interface Candidate {
  projetId: string;
  source: string;
  sourceScore: number;
}

export async function candidateFromSimilarUsers(
  userId: mongoose.Types.ObjectId,
  excludeIds: Set<string>
): Promise<Candidate[]> {
  // Trouver les projets suivis par l'utilisateur
  const myFollowedProjets = await Projet.find({
    followers: userId,
    statut: 'published',
  })
    .select('_id followers')
    .lean();

  if (myFollowedProjets.length === 0) return [];

  // Collecter les users qui suivent les memes projets
  const similarUserIds = new Map<string, number>(); // userId → nombre de projets en commun
  for (const p of myFollowedProjets) {
    for (const followerId of ((p as any).followers || [])) {
      const fId = followerId.toString();
      if (fId !== userId.toString()) {
        similarUserIds.set(fId, (similarUserIds.get(fId) || 0) + 1);
      }
    }
  }

  if (similarUserIds.size === 0) return [];

  // Garder les top 20 users les plus similaires
  const topSimilarUsers = [...similarUserIds.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([uid]) => new mongoose.Types.ObjectId(uid));

  // Trouver les projets que ces users suivent et que l'utilisateur ne suit pas
  const candidateProjets = await Projet.aggregate([
    {
      $match: {
        statut: 'published',
        isHidden: { $ne: true },
        followers: { $in: topSimilarUsers },
        _id: { $nin: [...excludeIds].map(id => new mongoose.Types.ObjectId(id)) },
      },
    },
    {
      $project: {
        _id: 1,
        // Compter combien de similar users suivent ce projet
        similarFollowCount: {
          $size: {
            $setIntersection: ['$followers', topSimilarUsers],
          },
        },
      },
    },
    { $sort: { similarFollowCount: -1 } },
    { $limit: RECO_CONFIG.candidateLimits.fromSimilarUsers },
  ]);

  // Filtrer ceux deja suivis par l'user
  const myFollowedIds = new Set(myFollowedProjets.map((p: any) => p._id.toString()));

  return candidateProjets
    .filter((p: any) => !myFollowedIds.has(p._id.toString()))
    .map((p: any) => ({
      projetId: p._id.toString(),
      source: 'similar_users',
      sourceScore: Math.min(1, p.similarFollowCount / 5),
    }));
}
