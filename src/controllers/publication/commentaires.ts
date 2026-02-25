import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Publication from '../../models/Publication.js';
import { applyGamificationEvent } from '../../services/gamificationEngine.js';
import Commentaire from '../../models/Commentaire.js';
import Notification from '../../models/Notification.js';
import Utilisateur from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { emitNewNotification } from '../../socket/index.js';

// Schéma pour créer un commentaire
const schemaCreerCommentaire = z.object({
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .trim(),
  reponseA: z.string().optional(),
});

// Schéma pour modifier un commentaire
const schemaModifierCommentaire = z.object({
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .trim(),
});

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
    const pageNum = Math.min(1000, Math.max(1, parseInt(page as string, 10)));
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
        .populate('auteur', 'prenom nom avatar role statut lppPlus')
        .lean(),
      Commentaire.countDocuments({ publication: id, reponseA: null }),
    ]);

    // Pour chaque commentaire, récupérer ses réponses
    const commentairesAvecReponses = await Promise.all(
      commentaires.map(async (commentaire) => {
        const reponses = await Commentaire.find({ reponseA: commentaire._id })
          .sort({ dateCreation: 1 })
          .populate('auteur', 'prenom nom avatar role statut lppPlus')
          .lean();

        const commentaireObj = typeof commentaire.toObject === 'function' ? commentaire.toObject() : commentaire;
        return {
          ...commentaireObj,
          aLike: req.utilisateur
            ? (commentaire.likes || []).some((lid: any) => lid.toString() === req.utilisateur!._id.toString())
            : false,
          nbLikes: (commentaire.likes || []).length,
          reponses: reponses.map((rep: any) => ({
            ...(typeof rep.toObject === 'function' ? rep.toObject() : rep),
            aLike: req.utilisateur
              ? rep.likes.some((lid: any) => lid.toString() === req.utilisateur!._id.toString())
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

    // RED-09: Block comments on hidden/moderated publications
    if (publication.isHidden) {
      throw new ErreurAPI('Impossible de commenter une publication modérée.', 403);
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

    // Incrémenter le compteur de commentaires (opération atomique)
    await Publication.findByIdAndUpdate(id, { $inc: { nbCommentaires: 1 } });

    // Récupérer avec les infos de l'auteur
    const commentaireComplet = await Commentaire.findById(commentaire._id)
      .populate('auteur', 'prenom nom avatar role statut lppPlus');

    // Créer une notification pour l'auteur de la publication (si ce n'est pas lui-même qui commente)
    const auteurPublicationId = publication.auteur.toString();
    if (auteurPublicationId !== userId.toString()) {
      try {
        const commentateur = await Utilisateur.findById(userId).select('prenom nom avatar');
        if (commentateur) {
          // SEC-NOTIF-01: Dedup — un seul commentaire-notif par user par publication par 5 min
          const cinqMinAvant = new Date(Date.now() - 5 * 60 * 1000);
          const existingNotif = await Notification.findOne({
            destinataire: auteurPublicationId,
            type: 'nouveau_commentaire',
            'data.userId': userId.toString(),
            'data.publicationId': id,
            dateCreation: { $gte: cinqMinAvant },
          });

          if (!existingNotif) {
            const notif = await Notification.create({
              destinataire: auteurPublicationId,
              type: 'nouveau_commentaire',
              titre: 'Nouveau commentaire',
              message: `${commentateur.prenom} ${commentateur.nom} a commenté votre publication.`,
              data: {
                userId: userId.toString(),
                userNom: commentateur.nom,
                userPrenom: commentateur.prenom,
                userAvatar: commentateur.avatar || null,
                publicationId: id,
              },
            });
            emitNewNotification(auteurPublicationId, {
              _id: notif._id.toString(),
              type: notif.type,
              titre: notif.titre,
              message: notif.message,
              lu: false,
              dateCreation: notif.dateCreation.toISOString(),
            });
          }
        }
      } catch (notifError) {
        // Ne pas bloquer si la notification échoue
        console.error('Erreur création notification commentaire:', notifError);
      }
    }

    // Gamification: XP pour commentaire
    const gamification = await applyGamificationEvent(userId.toString(), 'comment_post', id).catch(() => null);

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
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/publications/:pubId/commentaires/:comId
 * Modifier un commentaire (auteur uniquement)
 */
export const modifierCommentaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pubId, comId } = req.params;
    const donnees = schemaModifierCommentaire.parse(req.body);
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(pubId) || !mongoose.Types.ObjectId.isValid(comId)) {
      throw new ErreurAPI('ID invalide.', 400);
    }

    const commentaire = await Commentaire.findById(comId);
    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouvé.', 404);
    }

    if (commentaire.publication.toString() !== pubId) {
      throw new ErreurAPI("Ce commentaire n'appartient pas à cette publication.", 400);
    }

    // Vérifier que l'utilisateur est l'auteur ou admin
    const isAuteur = commentaire.auteur.toString() === userId.toString();
    const isAdmin = req.utilisateur!.isAdmin();

    if (!isAuteur && !isAdmin) {
      throw new ErreurAPI('Vous ne pouvez modifier que vos propres commentaires.', 403);
    }

    // Mettre à jour le commentaire
    commentaire.contenu = donnees.contenu;
    commentaire.modifie = true;
    await commentaire.save();

    // Récupérer avec les infos de l'auteur
    const commentaireComplet = await Commentaire.findById(comId)
      .populate('auteur', 'prenom nom avatar role statut lppPlus');

    res.json({
      succes: true,
      message: 'Commentaire modifié avec succès.',
      data: {
        commentaire: {
          ...commentaireComplet!.toObject(),
          aLike: commentaire.likes.some((lid) => lid.toString() === userId.toString()),
          nbLikes: commentaire.likes.length,
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

    // Vérifier que l'utilisateur est l'auteur ou admin
    const isAuteur = commentaire.auteur.toString() === userId.toString();
    const isAdmin = req.utilisateur!.isAdmin();

    if (!isAuteur && !isAdmin) {
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
