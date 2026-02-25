/**
 * Recommendation Controller — Endpoints pour le systeme "Pour Toi"
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRecommendations, getRecommendationsDebug } from '../services/recommendation/index.js';

/**
 * GET /api/recommendations/projects
 * Feed personnalise "Pour Toi" (auth requise)
 */
export const getRecommendedProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur?._id;
    if (!userId) {
      res.status(401).json({ succes: false, message: 'Authentification requise.' });
      return;
    }

    const { page = '1', limit = '20' } = req.query;

    const result = await getRecommendations(userId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    // Ajouter estSuivi pour chaque projet
    const userIdStr = userId.toString();
    result.projets = result.projets.map((p: any) => ({
      ...p,
      estSuivi: (p.followers || []).some((f: any) => f.toString() === userIdStr),
      followers: undefined, // Ne pas exposer la liste des followers
    }));

    res.json({
      succes: true,
      data: result,
    });
  } catch (error) {
    console.error('[RecommendationController] Erreur getRecommendedProjects:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors de la recuperation des recommandations.',
    });
  }
};

/**
 * GET /api/recommendations/debug
 * Debug du feed d'un utilisateur (admin only)
 * Query param: ?userId=xxx (optionnel, defaut = user connecte)
 */
export const getRecommendationDebug = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.query.userId
      ? new mongoose.Types.ObjectId(req.query.userId as string)
      : req.utilisateur?._id;

    if (!targetUserId) {
      res.status(400).json({ succes: false, message: 'userId requis.' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ succes: false, message: 'userId invalide.' });
      return;
    }

    const debug = await getRecommendationsDebug(targetUserId);

    if (!debug) {
      res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouve.',
      });
      return;
    }

    res.json({
      succes: true,
      data: debug,
    });
  } catch (error) {
    console.error('[RecommendationController] Erreur debug:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors du debug des recommandations.',
    });
  }
};
