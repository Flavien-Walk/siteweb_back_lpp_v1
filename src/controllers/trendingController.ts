/**
 * Trending Controller — Endpoints pour le systeme de tendances
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getTrendingProjects, getTrendingDebug } from '../services/trending/index.js';

/**
 * GET /api/trending/projects
 * Liste des projets trending avec pagination
 */
export const getTrending = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', categorie } = req.query;

    const result = await getTrendingProjects({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      categorie: typeof categorie === 'string' ? categorie : undefined,
    });

    // Ajouter estSuivi si user authentifie
    const userId = req.utilisateur?._id;
    if (userId && result.projets) {
      const userIdStr = userId.toString();
      result.projets = result.projets.map((p: any) => ({
        ...p,
        estSuivi: false, // sera enrichi quand on aura les followers
      }));
    }

    res.json({
      succes: true,
      data: result,
    });
  } catch (error) {
    console.error('[TrendingController] Erreur getTrending:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors de la recuperation des tendances.',
    });
  }
};

/**
 * GET /api/trending/projects/:id/debug
 * Debug du scoring d'un projet specifique (admin only)
 */
export const getTrendingProjectDebug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ succes: false, message: 'ID projet invalide.' });
      return;
    }

    const debug = await getTrendingDebug(id);

    if (!debug) {
      res.status(404).json({
        succes: false,
        message: 'Aucun signal trouve pour ce projet. Il n\'a peut-etre pas encore ete indexe.',
      });
      return;
    }

    res.json({
      succes: true,
      data: debug,
    });
  } catch (error) {
    console.error('[TrendingController] Erreur debug:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors du debug trending.',
    });
  }
};
