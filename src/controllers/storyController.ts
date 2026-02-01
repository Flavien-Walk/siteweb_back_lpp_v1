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
 * Récupérer les stories actives pour le feed
 * RÈGLE DE CONFIDENTIALITÉ: Seules mes stories + stories de mes amis
 * Regroupe les stories par utilisateur
 */
export const getStoriesActives = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const maintenant = new Date();
    const userId = req.utilisateur?._id;

    // Si non connecté, retourner une liste vide
    if (!userId) {
      res.json({
        succes: true,
        data: {
          storiesParUtilisateur: [],
        },
      });
      return;
    }

    // Récupérer l'utilisateur connecté avec sa liste d'amis
    const utilisateurConnecte = await Utilisateur.findById(userId).select('amis');
    if (!utilisateurConnecte) {
      res.json({
        succes: true,
        data: {
          storiesParUtilisateur: [],
        },
      });
      return;
    }

    // Construire la liste des utilisateurs autorisés: moi + mes amis (bidirectionnels)
    const amisIds = utilisateurConnecte.amis || [];

    // Vérifier la bidirectionnalité des relations
    const amisBidirectionnels = await Utilisateur.find({
      _id: { $in: amisIds },
      amis: userId, // L'ami doit aussi m'avoir dans sa liste
    }).select('_id');

    const idsAmisValides = amisBidirectionnels.map(a => a._id);
    const utilisateursAutorises = [userId, ...idsAmisValides];

    // Récupérer les stories actives uniquement de moi et mes amis
    const storiesRaw = await Story.aggregate([
      // Filtrer: stories actives ET utilisateur autorisé
      {
        $match: {
          dateExpiration: { $gt: maintenant },
          utilisateur: { $in: utilisateursAutorises },
        },
      },
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
              viewers: '$viewers',
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

    // Calculer estVue pour chaque story et toutesVues pour chaque groupe
    const userIdStr = userId.toString();
    const stories = storiesRaw.map((groupe: any) => {
      const storiesAvecEstVue = groupe.stories.map((story: any) => ({
        _id: story._id,
        type: story.type,
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        dateCreation: story.dateCreation,
        dateExpiration: story.dateExpiration,
        estVue: (story.viewers || []).some((v: any) => v.toString() === userIdStr),
      }));

      // Vérifier si TOUTES les stories du groupe ont été vues
      const toutesVues = storiesAvecEstVue.every((s: any) => s.estVue);

      return {
        utilisateur: groupe.utilisateur,
        stories: storiesAvecEstVue,
        derniereStory: groupe.derniereStory,
        toutesVues,
      };
    });

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
 * RÈGLE DE CONFIDENTIALITÉ:
 * - Toujours retourner hasStories (indicateur visible)
 * - Retourner peutVoir: true si ami ou soi-même
 * - Ne retourner les stories que si peutVoir: true
 */
export const getStoriesUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const maintenant = new Date();
    const userId = req.utilisateur?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID utilisateur invalide.', 400);
    }

    // Vérifier que l'utilisateur cible existe avec sa liste d'amis
    const utilisateurCible = await Utilisateur.findById(id).select('prenom nom avatar amis');
    if (!utilisateurCible) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    // Compter les stories actives (pour l'indicateur)
    const nbStories = await Story.countDocuments({
      utilisateur: id,
      dateExpiration: { $gt: maintenant },
    });
    const hasStories = nbStories > 0;

    // Vérifier si l'utilisateur peut voir les stories
    let peutVoir = false;

    if (userId) {
      const userIdStr = userId.toString();
      const targetIdStr = id.toString();

      // Cas 1: C'est moi
      if (userIdStr === targetIdStr) {
        peutVoir = true;
      } else {
        // Cas 2: Vérifier amitié bidirectionnelle
        const utilisateurConnecte = await Utilisateur.findById(userId).select('amis');
        if (utilisateurConnecte) {
          const jeLeAiCommeAmi = utilisateurConnecte.amis?.some(
            (amiId) => amiId.toString() === targetIdStr
          );
          const ilMACommeAmi = utilisateurCible.amis?.some(
            (amiId) => amiId.toString() === userIdStr
          );
          peutVoir = Boolean(jeLeAiCommeAmi && ilMACommeAmi);
        }
      }
    }

    // Si non autorisé, retourner hasStories mais pas les stories
    if (!peutVoir) {
      res.json({
        succes: true,
        data: {
          utilisateur: {
            _id: utilisateurCible._id,
            prenom: utilisateurCible.prenom,
            nom: utilisateurCible.nom,
            avatar: utilisateurCible.avatar,
          },
          hasStories,
          peutVoir: false,
          stories: [], // Pas de contenu si non-ami
        },
      });
      return;
    }

    // Récupérer les stories si autorisé
    const storiesRaw = await Story.find({
      utilisateur: id,
      dateExpiration: { $gt: maintenant },
    }).sort({ dateCreation: -1 });

    // Ajouter estVue pour chaque story
    const userIdStr = userId!.toString();
    const stories = storiesRaw.map((story) => ({
      _id: story._id,
      type: story.type,
      mediaUrl: story.mediaUrl,
      thumbnailUrl: story.thumbnailUrl,
      dateCreation: story.dateCreation,
      dateExpiration: story.dateExpiration,
      estVue: (story.viewers || []).some((v) => v.toString() === userIdStr),
    }));

    // Vérifier si toutes les stories ont été vues
    const toutesVues = stories.length > 0 && stories.every((s) => s.estVue);

    res.json({
      succes: true,
      data: {
        utilisateur: {
          _id: utilisateurCible._id,
          prenom: utilisateurCible.prenom,
          nom: utilisateurCible.nom,
          avatar: utilisateurCible.avatar,
        },
        hasStories,
        peutVoir: true,
        toutesVues,
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
 * RÈGLE DE CONFIDENTIALITÉ: Seul l'auteur ou un ami peut voir la story
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

    // Vérifier l'autorisation
    const auteurId = story.utilisateur._id.toString();
    let peutVoir = false;

    if (userId) {
      const userIdStr = userId.toString();

      // Cas 1: C'est ma story
      if (userIdStr === auteurId) {
        peutVoir = true;
      } else {
        // Cas 2: Vérifier amitié bidirectionnelle
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
 * POST /api/stories/:id/seen
 * Marquer une story comme vue par l'utilisateur connecté
 * Utilise $addToSet pour éviter les doublons
 */
export const marquerVue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur!._id;
    const maintenant = new Date();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de story invalide.', 400);
    }

    // Vérifier que la story existe et est active
    const story = await Story.findOne({
      _id: id,
      dateExpiration: { $gt: maintenant },
    });

    if (!story) {
      throw new ErreurAPI('Story non trouvée ou expirée.', 404);
    }

    // Ne pas marquer sa propre story comme vue
    if (story.utilisateur.toString() === userId.toString()) {
      res.json({
        succes: true,
        message: 'Story propre, pas de marquage nécessaire.',
      });
      return;
    }

    // Ajouter l'utilisateur aux viewers (atomic, évite doublons)
    await Story.findByIdAndUpdate(id, {
      $addToSet: { viewers: userId },
    });

    res.json({
      succes: true,
      message: 'Story marquée comme vue.',
    });
  } catch (error) {
    next(error);
  }
};
