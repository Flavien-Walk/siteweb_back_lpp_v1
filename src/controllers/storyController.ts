import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Story, { STORY_DURATION_MS } from '../models/Story.js';
import Utilisateur from '../models/Utilisateur.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';
import { isBase64MediaDataUrl, isHttpUrl } from '../utils/cloudinary.js';
import { uploadStoryMedia } from '../utils/cloudinary.js';

// Schema de validation pour créer une story
const schemaCreerStory = z.object({
  media: z
    .string()
    .min(1, 'Le média est requis')
    .refine(
      (val) => isBase64MediaDataUrl(val) || isHttpUrl(val),
      { message: 'Le média doit être une URL valide ou une image/vidéo base64' }
    ),
  type: z.enum(['photo', 'video']),
});

/**
 * POST /api/stories
 * Créer une nouvelle story
 */
export const creerStory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaCreerStory.parse(req.body);
    const userId = req.utilisateur!._id;

    // Générer un ID temporaire pour le nom du fichier Cloudinary
    const tempId = new mongoose.Types.ObjectId().toString();

    // Upload du média sur Cloudinary
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

    // Créer la story
    const story = await Story.create({
      utilisateur: userId,
      type: donnees.type,
      mediaUrl,
      thumbnailUrl,
    });

    // Récupérer avec les infos de l'utilisateur
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
 * GET /api/stories
 * Récupérer toutes les stories actives (pour le feed)
 * Regroupe les stories par utilisateur
 */
export const getStoriesActives = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const maintenant = new Date();

    // Récupérer toutes les stories actives, groupées par utilisateur
    const stories = await Story.aggregate([
      // Filtrer les stories actives
      { $match: { dateExpiration: { $gt: maintenant } } },
      // Trier par date de création (plus récent d'abord)
      { $sort: { dateCreation: -1 } },
      // Grouper par utilisateur
      {
        $group: {
          _id: '$utilisateur',
          stories: {
            $push: {
              _id: '$_id',
              type: '$type',
              mediaUrl: '$mediaUrl',
              thumbnailUrl: '$thumbnailUrl',
              dateCreation: '$dateCreation',
              dateExpiration: '$dateExpiration',
            },
          },
          derniereStory: { $first: '$dateCreation' },
        },
      },
      // Trier les utilisateurs par leur dernière story (plus récent d'abord)
      { $sort: { derniereStory: -1 } },
      // Lookup pour récupérer les infos utilisateur
      {
        $lookup: {
          from: 'utilisateurs',
          localField: '_id',
          foreignField: '_id',
          as: 'utilisateur',
          pipeline: [
            { $project: { prenom: 1, nom: 1, avatar: 1 } },
          ],
        },
      },
      // Unwind l'utilisateur (de tableau à objet)
      { $unwind: '$utilisateur' },
      // Restructurer le résultat
      {
        $project: {
          _id: 0,
          utilisateur: 1,
          stories: 1,
          derniereStory: 1,
        },
      },
    ]);

    res.json({
      succes: true,
      data: {
        storiesParUtilisateur: stories,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stories/mes-stories
 * Récupérer mes stories actives
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

/**
 * GET /api/stories/utilisateur/:id
 * Récupérer les stories actives d'un utilisateur spécifique
 */
export const getStoriesUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const maintenant = new Date();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID utilisateur invalide.', 400);
    }

    // Vérifier que l'utilisateur existe
    const utilisateur = await Utilisateur.findById(id).select('prenom nom avatar');
    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    const stories = await Story.find({
      utilisateur: id,
      dateExpiration: { $gt: maintenant },
    })
      .sort({ dateCreation: -1 });

    res.json({
      succes: true,
      data: {
        utilisateur,
        stories,
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

    // Vérifier que l'utilisateur est l'auteur ou admin
    const isAuteur = story.utilisateur.toString() === userId.toString();
    const isAdmin = req.utilisateur!.role === 'admin';

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
 * Récupérer une story spécifique
 */
export const getStory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const maintenant = new Date();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de story invalide.', 400);
    }

    const story = await Story.findOne({
      _id: id,
      dateExpiration: { $gt: maintenant },
    }).populate('utilisateur', 'prenom nom avatar');

    if (!story) {
      throw new ErreurAPI('Story non trouvée ou expirée.', 404);
    }

    res.json({
      succes: true,
      data: {
        story,
      },
    });
  } catch (error) {
    next(error);
  }
};
