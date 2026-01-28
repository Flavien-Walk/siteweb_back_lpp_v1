import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// Schéma de validation pour créer une publication
const schemaCreerPublication = z.object({
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(5000, 'Le contenu ne peut pas dépasser 5000 caractères')
    .trim(),
  media: z.string().url('URL média invalide').optional(),
  type: z.enum(['post', 'annonce', 'update', 'editorial', 'live-extrait']).default('post'),
});

// Schéma pour créer un commentaire
const schemaCreerCommentaire = z.object({
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .trim(),
  reponseA: z.string().optional(),
});

/**
 * GET /api/publications
 * Liste des publications (feed public)
 */
export const getPublications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = '1', limit = '20', type } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filtre: Record<string, unknown> = {};

    // Filtrer par type si spécifié
    if (type && ['post', 'annonce', 'update', 'editorial', 'live-extrait'].includes(type as string)) {
      filtre.type = type;
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

    // Transformer pour inclure si l'utilisateur a liké
    const publicationsFormatees = publications.map((pub) => {
      const pubObj = pub.toObject();
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
        publications: publicationsFormatees,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/publications/:id
 * Détail d'une publication
 */
export const getPublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de publication invalide.', 400);
    }

    const publication = await Publication.findById(id)
      .populate('auteur', 'prenom nom avatar')
      .populate('projet', 'nom image');

    if (!publication) {
      throw new ErreurAPI('Publication non trouvée.', 404);
    }

    const pubObj = publication.toObject();

    res.json({
      succes: true,
      data: {
        publication: {
          ...pubObj,
          aLike: req.utilisateur
            ? publication.likes.some((lid) => lid.toString() === req.utilisateur!._id.toString())
            : false,
          nbLikes: publication.likes.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/publications
 * Créer une publication
 */
export const creerPublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaCreerPublication.parse(req.body);
    const userId = req.utilisateur!._id;

    const publication = await Publication.create({
      auteur: userId,
      auteurType: 'Utilisateur',
      contenu: donnees.contenu,
      media: donnees.media,
      type: donnees.type,
      likes: [],
      nbCommentaires: 0,
    });

    // Récupérer avec les infos de l'auteur
    const publicationComplete = await Publication.findById(publication._id)
      .populate('auteur', 'prenom nom avatar');

    res.status(201).json({
      succes: true,
      message: 'Publication créée avec succès.',
      data: {
        publication: {
          ...publicationComplete!.toObject(),
          aLike: false,
          nbLikes: 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/publications/:id
 * Supprimer une publication
 */
export const supprimerPublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de publication invalide.', 400);
    }

    const publication = await Publication.findById(id);

    if (!publication) {
      throw new ErreurAPI('Publication non trouvée.', 404);
    }

    // Vérifier que l'utilisateur est l'auteur
    if (publication.auteur.toString() !== userId.toString()) {
      throw new ErreurAPI('Vous ne pouvez supprimer que vos propres publications.', 403);
    }

    // Supprimer les commentaires associés
    await Commentaire.deleteMany({ publication: id });

    // Supprimer la publication
    await Publication.findByIdAndDelete(id);

    res.json({
      succes: true,
      message: 'Publication supprimée avec succès.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/publications/:id/like
 * Liker/unliker une publication
 */
export const toggleLikePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de publication invalide.', 400);
    }

    const publication = await Publication.findById(id);

    if (!publication) {
      throw new ErreurAPI('Publication non trouvée.', 404);
    }

    const dejaLike = publication.likes.some(
      (lid) => lid.toString() === userId.toString()
    );

    if (dejaLike) {
      // Retirer le like
      publication.likes = publication.likes.filter(
        (lid) => lid.toString() !== userId.toString()
      );
    } else {
      // Ajouter le like
      publication.likes.push(userId);
    }

    await publication.save();

    res.json({
      succes: true,
      data: {
        aLike: !dejaLike,
        nbLikes: publication.likes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/publications/:id/commentaires
 * Liste des commentaires d'une publication
 */
export const getCommentaires = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de publication invalide.', 400);
    }

    // Récupérer les commentaires de premier niveau (pas de reponseA)
    const [commentaires, total] = await Promise.all([
      Commentaire.find({ publication: id, reponseA: null })
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('auteur', 'prenom nom avatar'),
      Commentaire.countDocuments({ publication: id, reponseA: null }),
    ]);

    // Pour chaque commentaire, récupérer ses réponses
    const commentairesAvecReponses = await Promise.all(
      commentaires.map(async (commentaire) => {
        const reponses = await Commentaire.find({ reponseA: commentaire._id })
          .sort({ dateCreation: 1 })
          .populate('auteur', 'prenom nom avatar');

        const commentaireObj = commentaire.toObject();
        return {
          ...commentaireObj,
          aLike: req.utilisateur
            ? commentaire.likes.some((lid) => lid.toString() === req.utilisateur!._id.toString())
            : false,
          nbLikes: commentaire.likes.length,
          reponses: reponses.map((rep) => ({
            ...rep.toObject(),
            aLike: req.utilisateur
              ? rep.likes.some((lid) => lid.toString() === req.utilisateur!._id.toString())
              : false,
            nbLikes: rep.likes.length,
          })),
        };
      })
    );

    res.json({
      succes: true,
      data: {
        commentaires: commentairesAvecReponses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/publications/:id/commentaires
 * Ajouter un commentaire
 */
export const ajouterCommentaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const donnees = schemaCreerCommentaire.parse(req.body);
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de publication invalide.', 400);
    }

    const publication = await Publication.findById(id);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvée.', 404);
    }

    // Si c'est une réponse, vérifier que le commentaire parent existe
    let reponseAId = null;
    if (donnees.reponseA) {
      if (!mongoose.Types.ObjectId.isValid(donnees.reponseA)) {
        throw new ErreurAPI('ID de commentaire parent invalide.', 400);
      }
      const commentaireParent = await Commentaire.findById(donnees.reponseA);
      if (!commentaireParent || commentaireParent.publication.toString() !== id) {
        throw new ErreurAPI('Commentaire parent non trouvé.', 404);
      }
      reponseAId = donnees.reponseA;
    }

    const commentaire = await Commentaire.create({
      publication: id,
      auteur: userId,
      contenu: donnees.contenu,
      likes: [],
      reponseA: reponseAId,
    });

    // Incrémenter le compteur de commentaires
    publication.nbCommentaires += 1;
    await publication.save();

    // Récupérer avec les infos de l'auteur
    const commentaireComplet = await Commentaire.findById(commentaire._id)
      .populate('auteur', 'prenom nom avatar');

    res.status(201).json({
      succes: true,
      message: 'Commentaire ajouté avec succès.',
      data: {
        commentaire: {
          ...commentaireComplet!.toObject(),
          aLike: false,
          nbLikes: 0,
          reponses: [],
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/publications/:pubId/commentaires/:comId
 * Supprimer un commentaire
 */
export const supprimerCommentaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pubId, comId } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(pubId) || !mongoose.Types.ObjectId.isValid(comId)) {
      throw new ErreurAPI('ID invalide.', 400);
    }

    const commentaire = await Commentaire.findById(comId);
    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouvé.', 404);
    }

    if (commentaire.publication.toString() !== pubId) {
      throw new ErreurAPI('Ce commentaire n\'appartient pas à cette publication.', 400);
    }

    // Vérifier que l'utilisateur est l'auteur
    if (commentaire.auteur.toString() !== userId.toString()) {
      throw new ErreurAPI('Vous ne pouvez supprimer que vos propres commentaires.', 403);
    }

    // Compter les réponses pour décrémenter correctement
    const nbReponses = await Commentaire.countDocuments({ reponseA: comId });

    // Supprimer les réponses au commentaire
    await Commentaire.deleteMany({ reponseA: comId });

    // Supprimer le commentaire
    await Commentaire.findByIdAndDelete(comId);

    // Décrémenter le compteur (commentaire + ses réponses)
    await Publication.findByIdAndUpdate(pubId, {
      $inc: { nbCommentaires: -(1 + nbReponses) },
    });

    res.json({
      succes: true,
      message: 'Commentaire supprimé avec succès.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/publications/:pubId/commentaires/:comId/like
 * Liker/unliker un commentaire
 */
export const toggleLikeCommentaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { comId } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(comId)) {
      throw new ErreurAPI('ID de commentaire invalide.', 400);
    }

    const commentaire = await Commentaire.findById(comId);
    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouvé.', 404);
    }

    const dejaLike = commentaire.likes.some(
      (lid) => lid.toString() === userId.toString()
    );

    if (dejaLike) {
      commentaire.likes = commentaire.likes.filter(
        (lid) => lid.toString() !== userId.toString()
      );
    } else {
      commentaire.likes.push(userId);
    }

    await commentaire.save();

    res.json({
      succes: true,
      data: {
        aLike: !dejaLike,
        nbLikes: commentaire.likes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
