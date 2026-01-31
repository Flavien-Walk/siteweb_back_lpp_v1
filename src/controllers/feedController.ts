import { Request, Response } from 'express';
import Publication from '../models/Publication.js';
import Projet from '../models/Projet.js';

/**
 * GET /api/feed
 * Fil d'actualité : publications des projets suivis + annonces
 */
export const getFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filtre: Record<string, unknown> = {};

    // Si l'utilisateur est connecté, montrer les publications de ses projets suivis + annonces
    if (req.utilisateur) {
      const projetsSuivis = await Projet.find({ followers: req.utilisateur._id }).select('_id');
      const projetIds = projetsSuivis.map((p) => p._id);

      if (type === 'suivis') {
        filtre.projet = { $in: projetIds };
      } else if (type === 'annonces') {
        filtre.type = 'annonce';
      } else {
        // Tout : projets suivis + annonces générales
        filtre.$or = [
          { projet: { $in: projetIds } },
          { type: 'annonce' },
          { type: 'editorial' },
        ];
      }
    } else {
      // Non connecté : annonces et éditoriaux uniquement
      filtre.type = { $in: ['annonce', 'editorial'] };
    }

    const [publications, total] = await Promise.all([
      Publication.find(filtre)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('auteur', 'prenom nom avatar')
        .populate('projet', 'nom image'),
      Publication.countDocuments(filtre),
    ]);

    res.json({
      succes: true,
      data: {
        publications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur getFeed:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
