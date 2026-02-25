/**
 * Story Controller — Feed & Viewing
 * getStoriesActives, getStoriesUtilisateur, marquerVue, getStoryViewers
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Story from '../../models/Story.js';
import Utilisateur from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';

/**
 * GET /api/stories
 * Recuperer les stories actives pour le feed
 * REGLE DE CONFIDENTIALITE: Seules mes stories + stories de mes amis
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

    // Si non connecte, retourner une liste vide
    if (!userId) {
      res.json({
        succes: true,
        data: {
          storiesParUtilisateur: [],
        },
      });
      return;
    }

    // Recuperer l'utilisateur connecte avec sa liste d'amis
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

    // Construire la liste des utilisateurs autorises: moi + mes amis (bidirectionnels)
    const amisIds = utilisateurConnecte.amis || [];

    // Verifier la bidirectionnalite des relations
    const amisBidirectionnels = await Utilisateur.find({
      _id: { $in: amisIds },
      amis: userId, // L'ami doit aussi m'avoir dans sa liste
    }).select('_id');

    const idsAmisValides = amisBidirectionnels.map(a => a._id);
    const utilisateursAutorises = [userId, ...idsAmisValides];

    // Recuperer les stories actives uniquement de moi et mes amis
    const storiesRaw = await Story.aggregate([
      // Filtrer: stories actives ET utilisateur autorise ET non masquees
      {
        $match: {
          dateExpiration: { $gt: maintenant },
          utilisateur: { $in: utilisateursAutorises },
          isHidden: { $ne: true }, // V2: Exclure les stories masquees
        },
      },
      // Trier par date de creation (plus recent d'abord)
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
              // V2: Nouveaux champs
              durationSec: '$durationSec',
              location: '$location',
              filterPreset: '$filterPreset',
            },
          },
          derniereStory: { $first: '$dateCreation' },
        },
      },
      // Trier les utilisateurs par leur derniere story (plus recent d'abord)
      { $sort: { derniereStory: -1 } },
      // Lookup pour recuperer les infos utilisateur
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
      // Unwind l'utilisateur (de tableau a objet)
      { $unwind: '$utilisateur' },
      // Restructurer le resultat
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
        // V2: Nouveaux champs
        durationSec: story.durationSec || 7, // Fallback pour stories existantes
        location: story.location,
        filterPreset: story.filterPreset || 'normal',
      }));

      // Verifier si TOUTES les stories du groupe ont ete vues
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
 * GET /api/stories/utilisateur/:id
 * Recuperer les stories actives d'un utilisateur specifique
 * REGLE DE CONFIDENTIALITE:
 * - Toujours retourner hasStories (indicateur visible)
 * - Retourner peutVoir: true si ami ou soi-meme
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

    // Verifier que l'utilisateur cible existe avec sa liste d'amis
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

    // Verifier si l'utilisateur peut voir les stories
    let peutVoir = false;

    if (userId) {
      const userIdStr = userId.toString();
      const targetIdStr = id.toString();

      // Cas 1: C'est moi
      if (userIdStr === targetIdStr) {
        peutVoir = true;
      } else {
        // Cas 2: Verifier amitie bidirectionnelle
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

    // Si non autorise, retourner hasStories mais pas les stories
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

    // Recuperer les stories si autorise (V2: exclure les masquees)
    const storiesRaw = await Story.find({
      utilisateur: id,
      dateExpiration: { $gt: maintenant },
      isHidden: { $ne: true }, // V2: Exclure les stories masquees
    }).sort({ dateCreation: -1 });

    // Ajouter estVue pour chaque story (V2: inclure nouveaux champs)
    const userIdStr = userId!.toString();
    const stories = storiesRaw.map((story) => ({
      _id: story._id,
      type: story.type,
      mediaUrl: story.mediaUrl,
      thumbnailUrl: story.thumbnailUrl,
      dateCreation: story.dateCreation,
      dateExpiration: story.dateExpiration,
      estVue: (story.viewers || []).some((v) => v.toString() === userIdStr),
      // V2: Nouveaux champs
      durationSec: story.durationSec || 7,
      location: story.location,
      filterPreset: story.filterPreset || 'normal',
    }));

    // Verifier si toutes les stories ont ete vues
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
 * POST /api/stories/:id/seen
 * Marquer une story comme vue par l'utilisateur connecte
 * Utilise $addToSet pour eviter les doublons
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

    // Verifier que la story existe et est active
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

    // Ajouter l'utilisateur aux viewers (atomic, evite doublons)
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

/**
 * GET /api/stories/:id/viewers
 * Recuperer la liste des utilisateurs ayant vu une story
 * SECURITE: Seul le proprietaire de la story peut voir cette information
 */
export const getStoryViewers = async (
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

    // Recuperer la story avec les viewers popules
    const story = await Story.findById(id)
      .populate('viewers', 'prenom nom avatar');

    if (!story) {
      throw new ErreurAPI('Story non trouvée.', 404);
    }

    // SECURITE: Seul le proprietaire peut voir les vues
    if (story.utilisateur.toString() !== userId.toString()) {
      throw new ErreurAPI('Accès non autorisé. Seul le créateur peut voir les vues.', 403);
    }

    res.json({
      succes: true,
      data: {
        nbVues: story.viewers.length,
        viewers: story.viewers,
      },
    });
  } catch (error) {
    next(error);
  }
};
