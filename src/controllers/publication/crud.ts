import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Publication from '../../models/Publication.js';
import { IMention, IMedia } from '../../models/Publication.js';
import { applyGamificationEvent } from '../../services/gamificationEngine.js';
import Commentaire from '../../models/Commentaire.js';
import Notification from '../../models/Notification.js';
import Utilisateur from '../../models/Utilisateur.js';
import Projet from '../../models/Projet.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { emitNewNotification } from '../../socket/index.js';
import { isBase64MediaDataUrl, isHttpUrl, uploadPublicationMedia, uploadPublicationMedias } from '../../utils/cloudinary.js';

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
  // Mentions @utilisateur et @projet
  mentions: z.array(z.object({
    type: z.enum(['utilisateur', 'projet']),
    id: z.string(),
  })).max(20, 'Maximum 20 mentions par publication').optional(),
}).refine(
  (data) => data.contenu?.trim() || data.media || (data.medias && data.medias.length > 0),
  { message: 'Le contenu ou un média est requis' }
);

/**
 * Helper: Normalise les médias d'une publication pour rétrocompatibilité
 * Si medias[] est vide mais media existe (anciennes publications), crée medias[] à partir de media
 */
export const normalizePublicationMedias = (pub: any): any => {
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

// Schéma pour modifier une publication
const schemaModifierPublication = z.object({
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(5000, 'Le contenu ne peut pas dépasser 5000 caractères')
    .trim(),
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
        .populate('auteur', 'prenom nom avatar role statut lppPlus')
        .populate('projet', 'nom image')
        .lean(),
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
      .populate('auteur', 'prenom nom avatar role statut lppPlus')
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

    // === Validation des mentions ===
    let mentionsValidees: IMention[] = [];
    if (donnees.mentions && donnees.mentions.length > 0) {
      const auteur = await Utilisateur.findById(userId).select('amis prenom nom').lean();
      const amisSet = new Set((auteur?.amis || []).map((id: mongoose.Types.ObjectId) => id.toString()));

      const mentionUsers = donnees.mentions.filter(m => m.type === 'utilisateur');
      const mentionProjets = donnees.mentions.filter(m => m.type === 'projet');

      // Valider utilisateurs : uniquement des amis
      if (mentionUsers.length > 0) {
        const idsValides = mentionUsers
          .filter(m => mongoose.Types.ObjectId.isValid(m.id) && amisSet.has(m.id))
          .map(m => new mongoose.Types.ObjectId(m.id));
        if (idsValides.length > 0) {
          const users = await Utilisateur.find({ _id: { $in: idsValides } })
            .select('_id prenom nom').lean();
          for (const u of users) {
            mentionsValidees.push({
              type: 'utilisateur',
              id: u._id,
              display: `@${u.prenom}_${u.nom}`.toLowerCase().replace(/\s+/g, '_'),
            });
          }
        }
      }

      // Valider projets : tout projet existant
      if (mentionProjets.length > 0) {
        const idsValides = mentionProjets
          .filter(m => mongoose.Types.ObjectId.isValid(m.id))
          .map(m => new mongoose.Types.ObjectId(m.id));
        if (idsValides.length > 0) {
          const projets = await Projet.find({ _id: { $in: idsValides } })
            .select('_id nom').lean();
          for (const p of projets) {
            mentionsValidees.push({
              type: 'projet',
              id: p._id,
              display: `@${p.nom}`.toLowerCase().replace(/\s+/g, '_'),
            });
          }
        }
      }
    }

    const publication = await Publication.create({
      auteur: userId,
      auteurType: 'Utilisateur',
      contenu: donnees.contenu,
      media: legacyMediaUrl, // Legacy
      medias: mediasToSave,  // Nouveau format
      mentions: mentionsValidees,
      type: donnees.type,
      likes: [],
      nbCommentaires: 0,
    });

    // === Notifications de mention (fire-and-forget) ===
    if (mentionsValidees.length > 0) {
      const auteurInfo = await Utilisateur.findById(userId).select('prenom nom avatar').lean();

      for (const mention of mentionsValidees) {
        if (mention.type === 'utilisateur' && mention.id.toString() !== userId.toString()) {
          Notification.create({
            destinataire: mention.id,
            type: 'mention',
            titre: 'Vous avez ete mentionne',
            message: `${auteurInfo?.prenom || ''} ${auteurInfo?.nom || ''} vous a mentionne dans une publication.`,
            data: {
              userId: userId.toString(),
              userPrenom: auteurInfo?.prenom,
              userNom: auteurInfo?.nom,
              userAvatar: auteurInfo?.avatar,
              publicationId: publication._id.toString(),
            },
          }).then(notif => {
            emitNewNotification(mention.id.toString(), {
              _id: notif._id.toString(),
              type: notif.type,
              titre: notif.titre,
              message: notif.message,
              lu: false,
              dateCreation: notif.dateCreation.toISOString(),
              expediteur: auteurInfo ? {
                _id: userId.toString(),
                prenom: auteurInfo.prenom,
                nom: auteurInfo.nom,
                avatar: auteurInfo.avatar,
              } : undefined,
            });
          }).catch(err => console.error('Erreur notif mention:', err));
        }
      }
    }

    // Récupérer avec les infos de l'auteur
    const publicationComplete = await Publication.findById(publication._id)
      .populate('auteur', 'prenom nom avatar role statut lppPlus');

    // Gamification: XP pour creation de post
    const gamification = await applyGamificationEvent(userId.toString(), 'create_post', publication._id.toString()).catch(() => null);

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
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    next(error);
  }
};

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
      .populate('auteur', 'prenom nom avatar role statut lppPlus');

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
