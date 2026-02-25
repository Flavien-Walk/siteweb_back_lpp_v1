/**
 * Story Controller — CRUD Operations
 * creerStory, supprimerStory, getStory, getMesStories
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Story, { STORY_EXPIRATION_OPTIONS } from '../../models/Story.js';
import Utilisateur from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { isBase64MediaDataUrl, isHttpUrl } from '../../utils/cloudinary.js';
import { uploadStoryMedia } from '../../utils/cloudinary.js';
import { InMemoryRateLimit } from '../../utils/inMemoryRateLimit.js';

// SEC-STORY-01: Rate limit creation stories (10 par heure par utilisateur)
const storyRateLimiter = new InMemoryRateLimit(10, 60 * 60 * 1000);

// Schema de validation pour creer une story (V2)
const schemaCreerStory = z.object({
  media: z
    .string()
    .min(1, 'Le média est requis')
    .refine(
      (val) => isBase64MediaDataUrl(val) || isHttpUrl(val),
      { message: 'Le média doit être une URL valide ou une image/vidéo base64' }
    ),
  type: z.enum(['photo', 'video']),
  // V2 - Duree d'affichage (en secondes)
  durationSec: z
    .number()
    .min(3, 'La durée minimum est de 3 secondes')
    .max(20, 'La durée maximum est de 20 secondes')
    .default(7),
  // V2 - Localisation optionnelle
  location: z.object({
    label: z.string().max(100, 'Le label ne peut pas dépasser 100 caractères'),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }).optional(),
  // V2 - Filtre visuel
  filterPreset: z
    .enum(['normal', 'warm', 'cool', 'bw', 'contrast', 'vignette'])
    .default('normal'),
  // Duree de vie de la story (en minutes)
  expirationMinutes: z
    .number()
    .refine(
      (val) => STORY_EXPIRATION_OPTIONS.includes(val as any),
      { message: 'Durée de vie invalide. Options: 7, 15, 60, 360, 1440 minutes' }
    )
    .default(1440), // 24h par defaut
  // V4 - Widgets (liens, texte, emoji, etc.)
  widgets: z
    .array(
      z.object({
        id: z.string().min(1),
        type: z.enum(['link', 'location', 'emoji', 'text', 'time', 'mention']),
        transform: z.object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          scale: z.number().min(0.5).max(3).default(1),
          rotation: z.number().min(-180).max(180).default(0),
        }),
        zIndex: z.number().default(0),
        data: z.record(z.any()),
      })
    )
    .max(10, 'Maximum 10 widgets par story')
    .default([]),
});

/**
 * POST /api/stories
 * Creer une nouvelle story
 */
export const creerStory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaCreerStory.parse(req.body);
    const userId = req.utilisateur!._id;

    // SEC-STORY-01: Verifier rate limit creation stories
    const userKey = userId.toString();
    if (storyRateLimiter.isLimited(userKey)) {
      throw new ErreurAPI('Vous avez atteint la limite de creation de stories. Reessayez plus tard.', 429);
    }
    storyRateLimiter.record(userKey);

    // Generer un ID temporaire pour le nom du fichier Cloudinary
    const tempId = new mongoose.Types.ObjectId().toString();

    // Upload du media sur Cloudinary
    let mediaUrl = donnees.media;
    let thumbnailUrl: string | undefined;

    if (isBase64MediaDataUrl(donnees.media)) {
      try {
        const uploadResult = await uploadStoryMedia(donnees.media, tempId);
        mediaUrl = uploadResult.url;
        thumbnailUrl = uploadResult.thumbnailUrl;
      } catch (uploadError) {
        console.error('Erreur upload Cloudinary story:', uploadError);
        throw new ErreurAPI('Erreur lors de l\'upload du média. Veuillez réessayer.', 500);
      }
    }

    // Calculer la date d'expiration basee sur expirationMinutes
    const expirationMs = donnees.expirationMinutes * 60 * 1000;
    const dateExpiration = new Date(Date.now() + expirationMs);

    // Creer la story avec les champs V2 + V4
    const story = await Story.create({
      utilisateur: userId,
      type: donnees.type,
      mediaUrl,
      thumbnailUrl,
      dateExpiration,
      expirationMinutes: donnees.expirationMinutes,
      // V2 - Nouveaux champs
      durationSec: donnees.durationSec,
      location: donnees.location,
      filterPreset: donnees.filterPreset,
      // V4 - Widgets
      widgets: donnees.widgets,
    });

    // Recuperer avec les infos de l'utilisateur
    const storyComplete = await Story.findById(story._id)
      .populate('utilisateur', 'prenom nom avatar');

    res.status(201).json({
      succes: true,
      message: 'Story créée avec succès.',
      data: {
        story: storyComplete,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/stories/:id
 * Supprimer une story (auteur uniquement)
 */
export const supprimerStory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de story invalide.', 400);
    }

    const story = await Story.findById(id);

    if (!story) {
      throw new ErreurAPI('Story non trouvée.', 404);
    }

    // Verifier que l'utilisateur est l'auteur ou admin
    const isAuteur = story.utilisateur.toString() === userId.toString();
    const isAdmin = req.utilisateur!.isAdmin();

    if (!isAuteur && !isAdmin) {
      throw new ErreurAPI('Vous ne pouvez supprimer que vos propres stories.', 403);
    }

    await Story.findByIdAndDelete(id);

    res.json({
      succes: true,
      message: 'Story supprimée avec succès.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stories/:id
 * Recuperer une story specifique
 * REGLE DE CONFIDENTIALITE: Seul l'auteur ou un ami peut voir la story
 */
export const getStory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const maintenant = new Date();
    const userId = req.utilisateur?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de story invalide.', 400);
    }

    const story = await Story.findOne({
      _id: id,
      dateExpiration: { $gt: maintenant },
    }).populate('utilisateur', 'prenom nom avatar amis');

    if (!story) {
      throw new ErreurAPI('Story non trouvée ou expirée.', 404);
    }

    // Verifier l'autorisation
    const auteurId = story.utilisateur._id.toString();
    let peutVoir = false;

    if (userId) {
      const userIdStr = userId.toString();

      // Cas 1: C'est ma story
      if (userIdStr === auteurId) {
        peutVoir = true;
      } else {
        // Cas 2: Verifier amitie bidirectionnelle
        const utilisateurConnecte = await Utilisateur.findById(userId).select('amis');
        const auteur = await Utilisateur.findById(auteurId).select('amis');

        if (utilisateurConnecte && auteur) {
          const jeLeAiCommeAmi = utilisateurConnecte.amis?.some(
            (amiId) => amiId.toString() === auteurId
          );
          const ilMACommeAmi = auteur.amis?.some(
            (amiId) => amiId.toString() === userIdStr
          );
          peutVoir = Boolean(jeLeAiCommeAmi && ilMACommeAmi);
        }
      }
    }

    if (!peutVoir) {
      throw new ErreurAPI('Vous devez être ami avec cet utilisateur pour voir sa story.', 403);
    }

    res.json({
      succes: true,
      data: {
        story: {
          _id: story._id,
          type: story.type,
          mediaUrl: story.mediaUrl,
          thumbnailUrl: story.thumbnailUrl,
          dateCreation: story.dateCreation,
          dateExpiration: story.dateExpiration,
          utilisateur: {
            _id: story.utilisateur._id,
            prenom: (story.utilisateur as any).prenom,
            nom: (story.utilisateur as any).nom,
            avatar: (story.utilisateur as any).avatar,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stories/mes-stories
 * Recuperer mes stories actives
 */
export const getMesStories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const maintenant = new Date();

    const stories = await Story.find({
      utilisateur: userId,
      dateExpiration: { $gt: maintenant },
    })
      .sort({ dateCreation: -1 })
      .populate('utilisateur', 'prenom nom avatar');

    res.json({
      succes: true,
      data: {
        stories,
      },
    });
  } catch (error) {
    next(error);
  }
};
