import { Request, Response } from 'express';
import Evenement from '../models/Evenement.js';

/**
 * GET /api/evenements
 * Liste des événements (lives, replays, Q/R)
 */
export const listerEvenements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, statut, page = '1', limit = '20' } = req.query;
    const pageNum = Math.min(1000, Math.max(1, parseInt(page as string, 10)));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filtre: Record<string, unknown> = {};
    if (typeof type === 'string') filtre.type = type;
    if (typeof statut === 'string') filtre.statut = statut;

    const [evenements, total] = await Promise.all([
      Evenement.find(filtre)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('projet', 'nom image'),
      Evenement.countDocuments(filtre),
    ]);

    res.json({
      succes: true,
      data: {
        evenements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur listerEvenements:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
