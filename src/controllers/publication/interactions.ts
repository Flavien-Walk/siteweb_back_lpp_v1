import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Publication from '../../models/Publication.js';
import { applyGamificationEvent } from '../../services/gamificationEngine.js';
import Commentaire from '../../models/Commentaire.js';
import Notification from '../../models/Notification.js';
import Utilisateur from '../../models/Utilisateur.js';
import Projet from '../../models/Projet.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { emitNewNotification } from '../../socket/index.js';

/**
 * POST /api/publications/:id/like
 * Liker/unliker une publication (opération atomique)
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

    // Vérifier d'abord si le like existe et récupérer l'auteur
    const publication = await Publication.findById(id).select('likes auteur');

    if (!publication) {
      throw new ErreurAPI('Publication non trouvée.', 404);
    }

    const dejaLike = publication.likes.some(
      (lid) => lid.toString() === userId.toString()
    );

    // Utiliser une opération atomique pour éviter les race conditions
    const updateResult = await Publication.findByIdAndUpdate(
      id,
      dejaLike
        ? { $pull: { likes: userId } }  // Retirer le like
        : { $addToSet: { likes: userId } },  // Ajouter le like (sans doublon)
      { new: true, select: 'likes' }
    );

    if (!updateResult) {
      throw new ErreurAPI('Publication non trouvée.', 404);
    }

    // Créer une notification pour l'auteur de la publication (uniquement lors d'un like, pas d'un unlike)
    const auteurPublicationId = publication.auteur.toString();
    if (!dejaLike && auteurPublicationId !== userId.toString()) {
      try {
        const likeur = await Utilisateur.findById(userId).select('prenom nom avatar');
        if (likeur) {
          // RED-14: Dedup — only create notification if one doesn't already exist
          const existingNotif = await Notification.findOne({
            destinataire: auteurPublicationId,
            type: 'nouveau_like',
            'data.userId': userId.toString(),
            'data.publicationId': id,
          });

          if (!existingNotif) {
            const notif = await Notification.create({
              destinataire: auteurPublicationId,
              type: 'nouveau_like',
              titre: 'Nouveau like',
              message: `${likeur.prenom} ${likeur.nom} a aimé votre publication.`,
              data: {
                userId: userId.toString(),
                userNom: likeur.nom,
                userPrenom: likeur.prenom,
                userAvatar: likeur.avatar || null,
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
        console.error('Erreur création notification like publication:', notifError);
      }
    }

    // Gamification: XP pour le like (seulement si like, pas unlike)
    let gamification = null;
    if (!dejaLike) {
      gamification = await applyGamificationEvent(userId.toString(), 'like_post', id).catch(() => null);
    }

    res.json({
      succes: true,
      data: {
        aLike: !dejaLike,
        nbLikes: updateResult.likes.length,
      },
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/publications/:pubId/commentaires/:comId/like
 * Liker/unliker un commentaire (opération atomique)
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

    // Vérifier d'abord si le like existe et récupérer l'auteur du commentaire
    const commentaire = await Commentaire.findById(comId).select('likes auteur publication');
    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouvé.', 404);
    }

    const dejaLike = commentaire.likes.some(
      (lid) => lid.toString() === userId.toString()
    );

    // Utiliser une opération atomique pour éviter les race conditions
    const updateResult = await Commentaire.findByIdAndUpdate(
      comId,
      dejaLike
        ? { $pull: { likes: userId } }
        : { $addToSet: { likes: userId } },
      { new: true, select: 'likes' }
    );

    if (!updateResult) {
      throw new ErreurAPI('Commentaire non trouvé.', 404);
    }

    // Créer une notification pour l'auteur du commentaire (uniquement lors d'un like, pas d'un unlike)
    const auteurCommentaireId = commentaire.auteur.toString();
    console.log('[LIKE_COMMENT_NOTIF] Debug:', {
      dejaLike,
      auteurCommentaireId,
      userId: userId.toString(),
      sameUser: auteurCommentaireId === userId.toString(),
      willCreateNotif: !dejaLike && auteurCommentaireId !== userId.toString(),
    });

    if (!dejaLike && auteurCommentaireId !== userId.toString()) {
      try {
        const likeur = await Utilisateur.findById(userId).select('prenom nom avatar');
        console.log('[LIKE_COMMENT_NOTIF] Likeur trouvé:', likeur ? `${likeur.prenom} ${likeur.nom}` : 'null');
        if (likeur) {
          const notifData = {
            destinataire: auteurCommentaireId,
            type: 'like_commentaire' as const,
            titre: 'Like sur votre commentaire',
            message: `${likeur.prenom} ${likeur.nom} a aimé votre commentaire.`,
            data: {
              userId: userId.toString(),
              userNom: likeur.nom,
              userPrenom: likeur.prenom,
              userAvatar: likeur.avatar || null,
              publicationId: commentaire.publication.toString(),
              commentaireId: comId,
            },
          };
          console.log('[LIKE_COMMENT_NOTIF] Création notification:', JSON.stringify(notifData, null, 2));
          const notif = await Notification.create(notifData);
          console.log('[LIKE_COMMENT_NOTIF] Notification créée avec succès, ID:', notif._id.toString());
          emitNewNotification(auteurCommentaireId, {
            _id: notif._id.toString(),
            type: notif.type,
            titre: notif.titre,
            message: notif.message,
            lu: false,
            dateCreation: notif.dateCreation.toISOString(),
          });
        }
      } catch (notifError) {
        // Ne pas bloquer si la notification échoue
        console.error('[LIKE_COMMENT_NOTIF] ERREUR création notification:', notifError);
      }
    } else {
      console.log('[LIKE_COMMENT_NOTIF] Notification non créée - raison:', dejaLike ? 'déjà liké' : 'même utilisateur');
    }

    res.json({
      succes: true,
      data: {
        aLike: !dejaLike,
        nbLikes: updateResult.likes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/publications/mentions/search?q=xxx&type=utilisateur|projet
 * Rechercher des utilisateurs (amis uniquement) et des projets pour l'autocomplete @mention
 */
export const rechercherMentions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const q = ((req.query.q as string) || '').trim();
    const type = (req.query.type as string) || 'all'; // 'utilisateur', 'projet', 'all'

    if (q.length < 1) {
      res.json({ succes: true, data: { utilisateurs: [], projets: [] } });
      return;
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    let utilisateurs: any[] = [];
    let projets: any[] = [];

    if (type === 'utilisateur' || type === 'all') {
      // Chercher uniquement parmi les amis bidirectionnels
      const user = await Utilisateur.findById(userId).select('amis').lean();
      const amisIds = (user?.amis || []).filter(
        (id: mongoose.Types.ObjectId) => id && mongoose.Types.ObjectId.isValid(id.toString())
      );

      if (amisIds.length > 0) {
        utilisateurs = await Utilisateur.find({
          _id: { $in: amisIds },
          amis: userId, // bidirectionnel
          $or: [
            { prenom: regex },
            { nom: regex },
          ],
        })
          .select('_id prenom nom avatar')
          .limit(10)
          .lean();
      }
    }

    if (type === 'projet' || type === 'all') {
      projets = await Projet.find({
        nom: regex,
        statut: { $ne: 'archive' },
      })
        .select('_id nom logo categorie')
        .limit(10)
        .lean();
    }

    res.json({
      succes: true,
      data: { utilisateurs, projets },
    });
  } catch (error) {
    next(error);
  }
};
