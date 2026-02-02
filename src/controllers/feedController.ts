import { Request, Response } from 'express';
import Publication from '../models/Publication.js';
import Projet from '../models/Projet.js';

/**
 * Helper: Normalise les médias d'une publication pour rétrocompatibilité
 */
const normalizePublicationMedias = (pub: any): any => {
  const pubObj = typeof pub.toObject === 'function' ? pub.toObject() : pub;
  if (pubObj.medias && pubObj.medias.length > 0) return pubObj;
  if (pubObj.media && (!pubObj.medias || pubObj.medias.length === 0)) {
    const isVideo = /\.(mp4|mov|avi|webm|mkv)(\?.*)?$/i.test(pubObj.media);
    pubObj.medias = [{ type: isVideo ? 'video' : 'image', url: pubObj.media }];
  }
  if (!pubObj.medias) pubObj.medias = [];
  return pubObj;
};

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

    const filtre: Record<string, unknown> = {
      // Exclure les posts masqués par modération
      isHidden: { $ne: true },
    };

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

    // Normaliser medias pour rétrocompatibilité
    const publicationsNormalisees = publications.map((pub) => {
      const pubObj = normalizePublicationMedias(pub);
      return {
        ...pubObj,
        aLike: req.utilisateur
          ? pub.likes.some((id) => id.toString() === req.utilisateur!._id.toString())
          : false,
        nbLikes: pub.likes.length,
      };
    });

    res.json({
      succes: true,
      data: {
        publications: publicationsNormalisees,
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
