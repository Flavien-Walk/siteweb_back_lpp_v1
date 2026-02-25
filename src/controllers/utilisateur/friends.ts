/**
 * Utilisateur Controller — Friends & Followed Projects
 * envoyerDemandeAmi, annulerDemandeAmi, accepterDemandeAmi, refuserDemandeAmi,
 * supprimerAmi, getDemandesAmis, getMesAmis, getAmisUtilisateur, getProjetsSuivisUtilisateur
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Utilisateur from '../../models/Utilisateur.js';
import Notification from '../../models/Notification.js';
import { emitDemandeAmi } from '../../socket/index.js';
import { applyGamificationEvent } from '../../services/gamificationEngine.js';

/**
 * POST /api/utilisateurs/:id/demande-ami
 * Envoyer une demande d'ami
 */
export const envoyerDemandeAmi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: cibleId } = req.params;
    const userId = req.utilisateur?._id;

    if (!userId) {
      res.status(401).json({ succes: false, message: 'Non authentifié.' });
      return;
    }

    if (userId.toString() === cibleId) {
      res.status(400).json({ succes: false, message: 'Vous ne pouvez pas vous ajouter vous-même.' });
      return;
    }

    const [utilisateur, cible] = await Promise.all([
      Utilisateur.findById(userId),
      Utilisateur.findById(cibleId),
    ]);

    if (!utilisateur || !cible) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    // Verifier si deja amis
    if (utilisateur.amis?.some((a) => a.toString() === cibleId)) {
      res.status(400).json({ succes: false, message: 'Vous êtes déjà amis.' });
      return;
    }

    // Verifier si demande deja envoyee
    if (utilisateur.demandesAmisEnvoyees?.some((d) => d.toString() === cibleId)) {
      res.status(400).json({ succes: false, message: 'Demande déjà envoyée.' });
      return;
    }

    // Verifier si l'autre a deja envoye une demande (accepter automatiquement)
    if (utilisateur.demandesAmisRecues?.some((d) => d.toString() === cibleId)) {
      // RED-02: Atomic accept — $addToSet for amis, $pull for demandes
      await Promise.all([
        Utilisateur.findByIdAndUpdate(userId, {
          $addToSet: { amis: cible._id },
          $pull: { demandesAmisRecues: cible._id },
        }),
        Utilisateur.findByIdAndUpdate(cibleId, {
          $addToSet: { amis: userId },
          $pull: { demandesAmisEnvoyees: userId },
        }),
      ]);

      // Supprimer la notification de demande d'ami existante
      await Notification.deleteMany({
        destinataire: userId,
        type: 'demande_ami',
        'data.userId': cibleId,
      });

      // Creer une notification pour la cible (sa demande a ete acceptee)
      await Notification.create({
        destinataire: cible._id,
        type: 'ami_accepte',
        titre: 'Demande d\'ami acceptée',
        message: `${utilisateur.prenom} ${utilisateur.nom} a accepté votre demande d'ami.`,
        lien: `/profil/${utilisateur._id}`,
        data: {
          userId: utilisateur._id.toString(),
          userNom: utilisateur.nom,
          userPrenom: utilisateur.prenom,
          userAvatar: utilisateur.avatar || null,
        },
      });

      res.json({ succes: true, message: 'Vous êtes maintenant amis !' });
      return;
    }

    // RED-02: Atomic send — $addToSet prevents duplicates under concurrency
    await Promise.all([
      Utilisateur.findByIdAndUpdate(userId, {
        $addToSet: { demandesAmisEnvoyees: cible._id },
      }),
      Utilisateur.findByIdAndUpdate(cibleId, {
        $addToSet: { demandesAmisRecues: userId },
      }),
    ]);

    // Verifier si une notification de demande d'ami existe deja (eviter les doublons)
    const notificationExistante = await Notification.findOne({
      destinataire: cible._id,
      type: 'demande_ami',
      'data.userId': userId.toString(),
    });

    if (!notificationExistante) {
      // Creer une notification pour le destinataire uniquement si elle n'existe pas
      await Notification.create({
        destinataire: cible._id,
        type: 'demande_ami',
        titre: 'Nouvelle demande d\'ami',
        message: `${utilisateur.prenom} ${utilisateur.nom} vous a envoyé une demande d'ami.`,
        lien: `/profil/${utilisateur._id}`,
        data: {
          userId: utilisateur._id.toString(),
          userNom: utilisateur.nom,
          userPrenom: utilisateur.prenom,
          userAvatar: utilisateur.avatar || null,
        },
      });

      // Emettre via Socket.io
      emitDemandeAmi(cible._id.toString(), {
        _id: utilisateur._id.toString(),
        type: 'received',
        utilisateur: {
          _id: utilisateur._id.toString(),
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          avatar: utilisateur.avatar,
        },
      });
    }

    // Gamification: XP pour demande d'ami
    const gamification = await applyGamificationEvent(utilisateur._id.toString(), 'add_friend', cibleId).catch(() => null);

    res.json({
      succes: true,
      message: 'Demande d\'ami envoyée.',
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/utilisateurs/:id/demande-ami
 * Annuler une demande d'ami envoyee
 */
export const annulerDemandeAmi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: cibleId } = req.params;
    const userId = req.utilisateur?._id;

    if (!userId) {
      res.status(401).json({ succes: false, message: 'Non authentifié.' });
      return;
    }

    // Atomic $pull pour eviter les race conditions
    await Promise.all([
      Utilisateur.findByIdAndUpdate(userId, {
        $pull: { demandesAmisEnvoyees: new mongoose.Types.ObjectId(cibleId) },
      }),
      Utilisateur.findByIdAndUpdate(cibleId, {
        $pull: { demandesAmisRecues: userId },
      }),
    ]);

    // Supprimer la notification de demande d'ami chez la cible
    await Notification.deleteMany({
      destinataire: cibleId,
      type: 'demande_ami',
      'data.userId': userId.toString(),
    });

    res.json({ succes: true, message: 'Demande annulée.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/utilisateurs/:id/accepter-ami
 * Accepter une demande d'ami
 */
export const accepterDemandeAmi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: demandeurId } = req.params;
    const userId = req.utilisateur?._id;

    if (!userId) {
      res.status(401).json({ succes: false, message: 'Non authentifié.' });
      return;
    }

    const [utilisateur, demandeur] = await Promise.all([
      Utilisateur.findById(userId),
      Utilisateur.findById(demandeurId),
    ]);

    if (!utilisateur || !demandeur) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    // RED-02: Atomic accept with condition — prevents race with simultaneous reject
    // Only proceed if the request still exists (atomic pull + check)
    const pullResult = await Utilisateur.findOneAndUpdate(
      { _id: userId, demandesAmisRecues: demandeur._id },
      {
        $addToSet: { amis: demandeur._id },
        $pull: { demandesAmisRecues: demandeur._id },
      },
      { new: true }
    );

    if (!pullResult) {
      res.status(400).json({ succes: false, message: 'Aucune demande de cet utilisateur.' });
      return;
    }

    // Atomic update on the other side too
    await Utilisateur.findByIdAndUpdate(demandeurId, {
      $addToSet: { amis: userId },
      $pull: { demandesAmisEnvoyees: userId },
    });

    // Supprimer la notification de demande d'ami correspondante
    await Notification.deleteMany({
      destinataire: userId,
      type: 'demande_ami',
      'data.userId': demandeurId,
    });

    // Creer une notification pour le demandeur (sa demande a ete acceptee)
    await Notification.create({
      destinataire: demandeur._id,
      type: 'ami_accepte',
      titre: 'Demande d\'ami acceptée',
      message: `${utilisateur.prenom} ${utilisateur.nom} a accepté votre demande d'ami.`,
      lien: `/profil/${utilisateur._id}`,
      data: {
        userId: utilisateur._id.toString(),
        userNom: utilisateur.nom,
        userPrenom: utilisateur.prenom,
        userAvatar: utilisateur.avatar || null,
      },
    });

    // Emettre via Socket.io
    emitDemandeAmi(demandeur._id.toString(), {
      _id: utilisateur._id.toString(),
      type: 'accepted',
      utilisateur: {
        _id: utilisateur._id.toString(),
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        avatar: utilisateur.avatar,
      },
    });

    res.json({ succes: true, message: 'Demande acceptée. Vous êtes maintenant amis !' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/utilisateurs/:id/refuser-ami
 * Refuser une demande d'ami
 */
export const refuserDemandeAmi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: demandeurId } = req.params;
    const userId = req.utilisateur?._id;

    if (!userId) {
      res.status(401).json({ succes: false, message: 'Non authentifié.' });
      return;
    }

    const [utilisateur, demandeur] = await Promise.all([
      Utilisateur.findById(userId),
      Utilisateur.findById(demandeurId),
    ]);

    if (!utilisateur || !demandeur) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    // RED-02: Atomic reject — $pull prevents race with simultaneous accept
    await Promise.all([
      Utilisateur.findByIdAndUpdate(userId, {
        $pull: { demandesAmisRecues: new mongoose.Types.ObjectId(demandeurId) },
      }),
      Utilisateur.findByIdAndUpdate(demandeurId, {
        $pull: { demandesAmisEnvoyees: userId },
      }),
    ]);

    // Supprimer la notification de demande d'ami correspondante
    await Notification.deleteMany({
      destinataire: userId,
      type: 'demande_ami',
      'data.userId': demandeurId,
    });

    res.json({ succes: true, message: 'Demande refusée.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/utilisateurs/:id/ami
 * Supprimer un ami
 */
export const supprimerAmi = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: amiId } = req.params;
    const userId = req.utilisateur?._id;

    if (!userId) {
      res.status(401).json({ succes: false, message: 'Non authentifié.' });
      return;
    }

    const amiObjectId = new mongoose.Types.ObjectId(amiId);

    // Atomic $pull pour eviter les race conditions
    // Retire amis + demandes residuelles en une seule operation par document
    await Promise.all([
      Utilisateur.findByIdAndUpdate(userId, {
        $pull: {
          amis: amiObjectId,
          demandesAmisRecues: amiObjectId,
          demandesAmisEnvoyees: amiObjectId,
        },
      }),
      Utilisateur.findByIdAndUpdate(amiId, {
        $pull: {
          amis: userId,
          demandesAmisRecues: userId,
          demandesAmisEnvoyees: userId,
        },
      }),
    ]);

    // Nettoyer toutes les notifications d'amitie entre les deux utilisateurs
    // (demande_ami et ami_accepte dans les deux sens)
    await Notification.deleteMany({
      $or: [
        { destinataire: userId, type: { $in: ['demande_ami', 'ami_accepte'] }, 'data.userId': amiId },
        { destinataire: amiId, type: { $in: ['demande_ami', 'ami_accepte'] }, 'data.userId': userId.toString() },
      ],
    });

    res.json({ succes: true, message: 'Ami supprimé.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/utilisateurs/demandes-amis
 * Recuperer mes demandes d'amis recues
 */
export const getDemandesAmis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur?._id;

    if (!userId) {
      res.status(401).json({ succes: false, message: 'Non authentifié.' });
      return;
    }

    const utilisateur = await Utilisateur.findById(userId)
      .populate('demandesAmisRecues', 'prenom nom avatar');

    if (!utilisateur) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    const demandes = (utilisateur.demandesAmisRecues || []).map((demandeur: any) => ({
      _id: demandeur._id.toString(),
      expediteur: {
        _id: demandeur._id,
        prenom: demandeur.prenom,
        nom: demandeur.nom,
        avatar: demandeur.avatar,
      },
      dateCreation: new Date().toISOString(),
    }));

    res.json({
      succes: true,
      data: {
        demandes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/utilisateurs/mes-amis
 * Recuperer ma liste d'amis (avec verification bidirectionnelle stricte)
 */
export const getMesAmis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur?._id;

    if (!userId) {
      res.status(401).json({ succes: false, message: 'Non authentifié.' });
      return;
    }

    // Recuperer les donnees brutes de l'utilisateur (sans populate)
    const utilisateur = await Utilisateur.findById(userId).select('amis').lean();

    if (!utilisateur) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    // Si pas d'amis dans le tableau, retourner une liste vide
    if (!utilisateur.amis || utilisateur.amis.length === 0) {
      res.json({
        succes: true,
        data: {
          amis: [],
        },
      });
      return;
    }

    // Filtrer les IDs valides
    const amisIdsValides = utilisateur.amis.filter(
      (amiId) => amiId && mongoose.Types.ObjectId.isValid(amiId.toString())
    );

    if (amisIdsValides.length === 0) {
      res.json({
        succes: true,
        data: {
          amis: [],
        },
      });
      return;
    }

    // Verification bidirectionnelle STRICTE :
    // Recuperer directement les amis qui ont AUSSI l'utilisateur dans leur liste
    // PENTEST-09: Ne pas exposer le role dans la liste d'amis
    const amisBidirectionnels = await Utilisateur.find({
      _id: { $in: amisIdsValides },
      amis: userId, // L'ami doit avoir l'utilisateur dans sa liste
    }).select('_id prenom nom avatar statut').lean();

    // Si aucun ami bidirectionnel, retourner liste vide
    if (!amisBidirectionnels || amisBidirectionnels.length === 0) {
      res.json({
        succes: true,
        data: {
          amis: [],
        },
      });
      return;
    }

    // Formater la reponse
    const amis = amisBidirectionnels.map((ami) => ({
      _id: ami._id,
      prenom: ami.prenom,
      nom: ami.nom,
      avatar: ami.avatar,
      statut: ami.statut,
    }));

    res.json({
      succes: true,
      data: {
        amis,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/utilisateurs/:id/amis
 * Recuperer la liste d'amis d'un utilisateur
 * Accessible uniquement si on est ami avec cet utilisateur ou si c'est soi-meme
 */
export const getAmisUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur?._id;

    if (!userId) {
      res.status(401).json({ succes: false, message: 'Non authentifié.' });
      return;
    }

    // Valider que l'ID est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ succes: false, message: 'ID utilisateur invalide.' });
      return;
    }

    const targetObjectId = new mongoose.Types.ObjectId(id);
    const userIdStr = userId.toString();
    const estSoiMeme = userIdStr === id;

    // Si ce n'est pas son propre profil, verifier l'acces
    if (!estSoiMeme) {
      // Verifier si le profil cible est public
      const cible = await Utilisateur.findById(id).select('profilPublic').lean();
      const profilEstPublic = cible?.profilPublic !== false;

      if (!profilEstPublic) {
        // Profil prive : verifier l'amitie
        const utilisateurConnecte = await Utilisateur.findById(userIdStr).select('amis');
        if (!utilisateurConnecte) {
          res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
          return;
        }
        const amisIds = (utilisateurConnecte.amis || []).map((a) => a.toString());
        const estAmi = amisIds.includes(id);

        if (!estAmi) {
          res.status(403).json({ succes: false, message: 'Ce profil est privé.' });
          return;
        }
      }
    }

    // Recuperer l'utilisateur cible SANS populate d'abord pour verifier les donnees brutes
    const utilisateurBrut = await Utilisateur.findById(id).select('prenom nom amis').lean();

    if (!utilisateurBrut) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    // Reponse vide par defaut
    const reponseVide = {
      succes: true,
      data: {
        utilisateur: {
          _id: utilisateurBrut._id,
          prenom: utilisateurBrut.prenom,
          nom: utilisateurBrut.nom,
        },
        amis: [],
      },
    };

    // Si le tableau amis est vide ou inexistant, retourner liste vide
    if (!utilisateurBrut.amis || utilisateurBrut.amis.length === 0) {
      res.json(reponseVide);
      return;
    }

    // Filtrer les IDs valides (ObjectIds existants)
    const amisIdsValides = utilisateurBrut.amis.filter(
      (amiId) => amiId && mongoose.Types.ObjectId.isValid(amiId.toString())
    );

    // Si aucun ID valide, retourner liste vide
    if (amisIdsValides.length === 0) {
      res.json(reponseVide);
      return;
    }

    // Verification bidirectionnelle STRICTE avec ObjectId explicite :
    // Trouver les utilisateurs qui :
    // 1. Sont dans la liste des amis potentiels
    // 2. ET ont l'utilisateur cible dans LEUR propre liste d'amis
    // PENTEST-09: Ne pas exposer le role dans la liste d'amis
    const amisBidirectionnels = await Utilisateur.find({
      _id: { $in: amisIdsValides },
      amis: targetObjectId, // Utiliser ObjectId explicite pour la comparaison
    }).select('_id prenom nom avatar statut').lean();

    // Si aucun ami bidirectionnel, retourner liste vide
    if (!amisBidirectionnels || amisBidirectionnels.length === 0) {
      res.json(reponseVide);
      return;
    }

    // Formater la reponse avec uniquement les amis bidirectionnels confirmes
    const amis = amisBidirectionnels.map((ami) => ({
      _id: ami._id,
      prenom: ami.prenom,
      nom: ami.nom,
      avatar: ami.avatar,
      statut: ami.statut,
    }));

    res.json({
      succes: true,
      data: {
        utilisateur: {
          _id: utilisateurBrut._id,
          prenom: utilisateurBrut.prenom,
          nom: utilisateurBrut.nom,
        },
        amis,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/utilisateurs/:id/projets-suivis
 * Recuperer les projets suivis par un utilisateur
 */
export const getProjetsSuivisUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur?._id;

    // Verifier si le profil cible est prive
    const cible = await Utilisateur.findById(id).select('profilPublic amis');
    if (!cible) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    if (cible.profilPublic === false) {
      const estSoiMeme = userId ? userId.toString() === id : false;
      const estAmi = userId ? cible.amis?.some((a) => a.toString() === userId.toString()) || false : false;
      const estStaff = userId ? await (async () => {
        const u = await Utilisateur.findById(userId).select('role');
        return u ? u.isStaff() : false;
      })() : false;

      if (!estSoiMeme && !estAmi && !estStaff) {
        res.status(403).json({ succes: false, message: 'Ce profil est privé.' });
        return;
      }
    }

    // Import dynamique pour eviter les dependances circulaires
    const ProjetModel = (await import('../../models/Projet.js')).default as any;

    // Recuperer les projets que cet utilisateur suit
    const projets = await ProjetModel.find({
      followers: id,
      statut: 'published',
    })
      .select('nom description pitch logo image categorie secteur maturite localisation followers datePublication')
      .populate('porteur', 'prenom nom avatar')
      .sort({ datePublication: -1 })
      .limit(50)
      .lean();

    // Ajouter nbFollowers, retirer le tableau followers brut
    const projetsAvecStats = projets.map((projet: any) => {
      const { followers, ...rest } = projet;
      return {
        ...rest,
        nbFollowers: followers?.length || 0,
      };
    });

    res.json({
      succes: true,
      data: {
        projets: projetsAvecStats,
      },
    });
  } catch (error) {
    next(error);
  }
};
