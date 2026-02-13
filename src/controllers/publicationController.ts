import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import Notification from '../models/Notification.js';
import Utilisateur from '../models/Utilisateur.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';
import { emitNewNotification } from '../socket/index.js';
import { isBase64MediaDataUrl, isHttpUrl, uploadPublicationMedia, uploadPublicationMedias, MediaUploadResult } from '../utils/cloudinary.js';
import { IMedia } from '../models/Publication.js';

// Schéma de validation pour créer une publication
const schemaCreerPublication = z.object({
  contenu: z
    .string()
    .max(5000, 'Le contenu ne peut pas dépasser 5000 caractères')
    .trim()
    .optional()
    .default(''),
  // LEGACY: single media (rétrocompatibilité)
  media: z
    .string()
    .refine(
      (val) => !val || isBase64MediaDataUrl(val) || isHttpUrl(val),
      { message: 'Média doit être une URL valide ou une image/vidéo base64' }
    )
    .optional(),
  // NEW: multiple medias (max 10)
  medias: z
    .array(
      z.string().refine(
        (val) => isBase64MediaDataUrl(val) || isHttpUrl(val),
        { message: 'Chaque média doit être une URL valide ou une image/vidéo base64' }
      )
    )
    .max(10, 'Maximum 10 médias par publication')
    .optional(),
  type: z.enum(['post', 'annonce', 'update', 'editorial', 'live-extrait']).default('post'),
}).refine(
  (data) => data.contenu?.trim() || data.media || (data.medias && data.medias.length > 0),
  { message: 'Le contenu ou un média est requis' }
);

/**
 * Helper: Normalise les médias d'une publication pour rétrocompatibilité
 * Si medias[] est vide mais media existe (anciennes publications), crée medias[] à partir de media
 */
const normalizePublicationMedias = (pub: any): any => {
  const pubObj = typeof pub.toObject === 'function' ? pub.toObject() : pub;

  // Si medias est déjà rempli, on ne fait rien
  if (pubObj.medias && pubObj.medias.length > 0) {
    return pubObj;
  }

  // Si media existe mais medias est vide (ancienne publication)
  if (pubObj.media && (!pubObj.medias || pubObj.medias.length === 0)) {
    const isVideo = /\.(mp4|mov|avi|webm|mkv)(\?.*)?$/i.test(pubObj.media);
    pubObj.medias = [{
      type: isVideo ? 'video' : 'image',
      url: pubObj.media,
    }];
  }

  // Assurer que medias est toujours un tableau
  if (!pubObj.medias) {
    pubObj.medias = [];
  }

  return pubObj;
};

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
    const pageNum = Math.min(1000, Math.max(1, parseInt(page as string, 10)));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filtre: Record<string, unknown> = {
      // Exclure les posts masqués par modération
      isHidden: { $ne: true },
    };

    // Filtrer par type si spécifié
    if (type && ['post', 'annonce', 'update', 'editorial', 'live-extrait'].includes(type as string)) {
      filtre.type = type;
    }

    const [publications, total] = await Promise.all([
      Publication.find(filtre)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('auteur', 'prenom nom avatar role statut')
        .populate('projet', 'nom image'),
      Publication.countDocuments(filtre),
    ]);

    // Transformer pour inclure si l'utilisateur a liké + normaliser medias
    const publicationsFormatees = publications.map((pub) => {
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
      .populate('auteur', 'prenom nom avatar role statut')
      .populate('projet', 'nom image');

    if (!publication) {
      throw new ErreurAPI('Publication non trouvée.', 404);
    }

    // Vérifier si le post est masqué (sauf pour l'auteur ou un admin)
    if (publication.isHidden) {
      const isAuteur = req.utilisateur && publication.auteur._id.toString() === req.utilisateur._id.toString();
      const isAdmin = req.utilisateur && req.utilisateur.isAdmin();
      if (!isAuteur && !isAdmin) {
        throw new ErreurAPI('Cette publication n\'est plus disponible.', 404);
      }
    }

    const pubObj = normalizePublicationMedias(publication);

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

    // Générer un ID temporaire pour le nom du fichier Cloudinary
    const tempId = new mongoose.Types.ObjectId().toString();

    let mediasToSave: IMedia[] = [];
    let legacyMediaUrl: string | undefined;

    // Priorité: medias[] > media (legacy)
    if (donnees.medias && donnees.medias.length > 0) {
      // Nouveau format: tableau de médias
      const mediasBase64 = donnees.medias.filter((m) => isBase64MediaDataUrl(m));
      const mediasUrls = donnees.medias.filter((m) => isHttpUrl(m));

      // Upload les base64 sur Cloudinary
      if (mediasBase64.length > 0) {
        try {
          const uploadResults = await uploadPublicationMedias(mediasBase64, tempId);
          mediasToSave = uploadResults.map((r) => ({
            type: r.type,
            url: r.url,
            thumbnailUrl: r.thumbnailUrl,
          }));
          console.log(`${uploadResults.length} médias uploadés sur Cloudinary`);
        } catch (uploadError) {
          console.error('Erreur upload multi-média Cloudinary:', uploadError);
          throw new ErreurAPI('Erreur lors de l\'upload des médias. Veuillez réessayer.', 500);
        }
      }

      // Ajouter les URLs déjà existantes (déterminer le type par extension)
      for (const url of mediasUrls) {
        const isVideo = /\.(mp4|mov|avi|webm|mkv)(\?.*)?$/i.test(url);
        mediasToSave.push({
          type: isVideo ? 'video' : 'image',
          url,
        });
      }

      // Legacy: première URL pour rétrocompatibilité
      if (mediasToSave.length > 0) {
        legacyMediaUrl = mediasToSave[0].url;
      }
    } else if (donnees.media) {
      // Format legacy: single media
      let mediaUrl = donnees.media;
      if (isBase64MediaDataUrl(donnees.media)) {
        try {
          mediaUrl = await uploadPublicationMedia(donnees.media, tempId);
          console.log('Média uploadé sur Cloudinary:', mediaUrl);
        } catch (uploadError) {
          console.error('Erreur upload Cloudinary:', uploadError);
          throw new ErreurAPI('Erreur lors de l\'upload du média. Veuillez réessayer.', 500);
        }
      }
      legacyMediaUrl = mediaUrl;
      // Convertir en format medias[] pour cohérence
      const isVideo = donnees.media.startsWith('data:video/') || /\.(mp4|mov|avi|webm|mkv)(\?.*)?$/i.test(mediaUrl);
      mediasToSave = [{
        type: isVideo ? 'video' : 'image',
        url: mediaUrl,
      }];
    }

    const publication = await Publication.create({
      auteur: userId,
      auteurType: 'Utilisateur',
      contenu: donnees.contenu,
      media: legacyMediaUrl, // Legacy
      medias: mediasToSave,  // Nouveau format
      type: donnees.type,
      likes: [],
      nbCommentaires: 0,
    });

    // Récupérer avec les infos de l'auteur
    const publicationComplete = await Publication.findById(publication._id)
      .populate('auteur', 'prenom nom avatar role statut');

    res.status(201).json({
      succes: true,
      message: 'Publication créée avec succès.',
      data: {
        publication: {
          ...normalizePublicationMedias(publicationComplete),
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

    // Vérifier que l'utilisateur est l'auteur ou admin
    const isAuteur = publication.auteur.toString() === userId.toString();
    const isAdmin = req.utilisateur!.isAdmin();

    if (!isAuteur && !isAdmin) {
      throw new ErreurAPI('Vous ne pouvez supprimer que vos propres publications.', 403);
    }

    // Supprimer les commentaires associés
    await Commentaire.deleteMany({ publication: id });

    // Supprimer la publication
    await Publication.findByIdAndDelete(id);

    res.json({
      succes: true,
      message: isAdmin && !isAuteur ? 'Publication supprimée par un administrateur.' : 'Publication supprimée avec succès.',
    });
  } catch (error) {
    next(error);
  }
};

// Schéma pour modifier une publication
const schemaModifierPublication = z.object({
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(5000, 'Le contenu ne peut pas dépasser 5000 caractères')
    .trim(),
});

/**
 * PATCH /api/publications/:id
 * Modifier une publication (auteur uniquement)
 */
export const modifierPublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const donnees = schemaModifierPublication.parse(req.body);
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de publication invalide.', 400);
    }

    const publication = await Publication.findById(id);

    if (!publication) {
      throw new ErreurAPI('Publication non trouvée.', 404);
    }

    // Vérifier que l'utilisateur est l'auteur ou admin
    const isAuteur = publication.auteur.toString() === userId.toString();
    const isAdmin = req.utilisateur!.isAdmin();

    if (!isAuteur && !isAdmin) {
      throw new ErreurAPI('Vous ne pouvez modifier que vos propres publications.', 403);
    }

    // Mettre à jour le contenu
    publication.contenu = donnees.contenu;
    await publication.save();

    // Récupérer avec les infos de l'auteur
    const publicationComplete = await Publication.findById(id)
      .populate('auteur', 'prenom nom avatar role statut');

    res.json({
      succes: true,
      message: 'Publication modifiée avec succès.',
      data: {
        publication: {
          ...normalizePublicationMedias(publicationComplete),
          aLike: publication.likes.some((lid) => lid.toString() === userId.toString()),
          nbLikes: publication.likes.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

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
        .populate('auteur', 'prenom nom avatar role statut'),
      Commentaire.countDocuments({ publication: id, reponseA: null }),
    ]);

    // Pour chaque commentaire, récupérer ses réponses
    const commentairesAvecReponses = await Promise.all(
      commentaires.map(async (commentaire) => {
        const reponses = await Commentaire.find({ reponseA: commentaire._id })
          .sort({ dateCreation: 1 })
          .populate('auteur', 'prenom nom avatar role statut');

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
      .populate('auteur', 'prenom nom avatar role statut');

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

// Schéma pour modifier un commentaire
const schemaModifierCommentaire = z.object({
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(1000, 'Le commentaire ne peut pas dépasser 1000 caractères')
    .trim(),
});

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
      .populate('auteur', 'prenom nom avatar role statut');

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
