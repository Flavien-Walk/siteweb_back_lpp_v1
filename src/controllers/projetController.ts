import { Request, Response } from 'express';
import Projet from '../models/Projet.js';

/**
 * GET /api/projets
 * Liste des projets avec filtres
 */
export const listerProjets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categorie, secteur, maturite, q, page = '1', limit = '20' } = req.query;

    const filtre: Record<string, unknown> = {};
    if (categorie) filtre.categorie = categorie;
    if (secteur) filtre.secteur = secteur;
    if (maturite) filtre.maturite = maturite;
    if (q) {
      filtre.$text = { $search: q as string };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [projets, total] = await Promise.all([
      Projet.find(filtre)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('porteur', 'prenom nom avatar'),
      Projet.countDocuments(filtre),
    ]);

    res.json({
      succes: true,
      data: {
        projets,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur listerProjets:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/projets/:id
 * Détail d'un projet
 */
export const detailProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const projet = await Projet.findById(req.params.id)
      .populate('porteur', 'prenom nom avatar');

    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    res.json({ succes: true, data: { projet } });
  } catch (error) {
    console.error('Erreur detailProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/:id/suivre
 * Suivre / ne plus suivre un projet (toggle)
 */
export const toggleSuivreProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const projet = await Projet.findById(req.params.id);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    const userId = req.utilisateur!._id;
    const index = projet.followers.findIndex((id) => id.equals(userId));

    if (index === -1) {
      projet.followers.push(userId);
    } else {
      projet.followers.splice(index, 1);
    }

    await projet.save();

    res.json({
      succes: true,
      data: {
        suivi: index === -1,
        totalFollowers: projet.followers.length,
      },
    });
  } catch (error) {
    console.error('Erreur toggleSuivreProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/projets/suivis
 * Mes projets suivis
 */
export const mesProjets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projets = await Projet.find({ followers: userId })
      .sort({ dateMiseAJour: -1 })
      .populate('porteur', 'prenom nom avatar');

    res.json({ succes: true, data: { projets } });
  } catch (error) {
    console.error('Erreur mesProjets:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
