import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../models/Utilisateur.js';
import Notification from '../models/Notification.js';

/**
 * Echappe les caractères spéciaux regex pour éviter les injections ReDoS
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * GET /api/utilisateurs/recherche
 * Rechercher des utilisateurs par nom/prénom
 */
export const rechercherUtilisateurs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q, limit = '10' } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit as string, 10)));
    const userId = req.utilisateur?._id;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({
        succes: true,
        data: {
          utilisateurs: [],
        },
      });
      return;
    }

    // Limiter la longueur de recherche et échapper les caractères spéciaux regex (protection ReDoS)
    const recherche = escapeRegex(q.trim().slice(0, 100));

    // Recherche par prénom, nom ou combinaison
    const utilisateurs = await Utilisateur.find({
      $and: [
        // Exclure l'utilisateur actuel de la recherche
        ...(userId ? [{ _id: { $ne: userId } }] : []),
        {
          $or: [
            { prenom: { $regex: recherche, $options: 'i' } },
            { nom: { $regex: recherche, $options: 'i' } },
            // Recherche sur nom complet (prénom + nom)
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ['$prenom', ' ', '$nom'] },
                  regex: recherche,
                  options: 'i',
                },
              },
            },
          ],
        },
      ],
    })
      .select('prenom nom avatar role statut')
      .limit(limitNum);

    res.json({
      succes: true,
      data: {
        utilisateurs: utilisateurs.map((u) => ({
          _id: u._id,
          prenom: u.prenom,
          nom: u.nom,
          avatar: u.avatar,
          role: u.role,
          statut: u.statut,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/utilisateurs/:id
 * Obtenir le profil public d'un utilisateur
 * Inclut le statut d'amitié si l'utilisateur est connecté
 */
export const getUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur?._id;

    const utilisateur = await Utilisateur.findById(id)
      .select('prenom nom avatar bio role statut amis demandesAmisRecues demandesAmisEnvoyees dateCreation');

    if (!utilisateur) {
      res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouvé.',
      });
      return;
    }

    // Déterminer le statut d'amitié
    let estAmi = false;
    let demandeEnvoyee = false;
    let demandeRecue = false;

    if (userId) {
      const userIdStr = userId.toString();
      estAmi = utilisateur.amis?.some((a) => a.toString() === userIdStr) || false;
      demandeEnvoyee = utilisateur.demandesAmisRecues?.some((d) => d.toString() === userIdStr) || false;
      demandeRecue = utilisateur.demandesAmisEnvoyees?.some((d) => d.toString() === userIdStr) || false;
    }

    res.json({
      succes: true,
      data: {
        utilisateur: {
          _id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          avatar: utilisateur.avatar,
          bio: utilisateur.bio,
          role: utilisateur.role,
          statut: utilisateur.statut,
          dateInscription: utilisateur.dateCreation,
          nbAmis: utilisateur.amis?.length || 0,
          estAmi,
          demandeEnvoyee,
          demandeRecue,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

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

    // Vérifier si déjà amis
    if (utilisateur.amis?.some((a) => a.toString() === cibleId)) {
      res.status(400).json({ succes: false, message: 'Vous êtes déjà amis.' });
      return;
    }

    // Vérifier si demande déjà envoyée
    if (utilisateur.demandesAmisEnvoyees?.some((d) => d.toString() === cibleId)) {
      res.status(400).json({ succes: false, message: 'Demande déjà envoyée.' });
      return;
    }

    // Vérifier si l'autre a déjà envoyé une demande (accepter automatiquement)
    if (utilisateur.demandesAmisRecues?.some((d) => d.toString() === cibleId)) {
      // Accepter la demande existante
      utilisateur.amis = [...(utilisateur.amis || []), cible._id];
      utilisateur.demandesAmisRecues = utilisateur.demandesAmisRecues?.filter(
        (d) => d.toString() !== cibleId
      );
      cible.amis = [...(cible.amis || []), userId];
      cible.demandesAmisEnvoyees = cible.demandesAmisEnvoyees?.filter(
        (d) => d.toString() !== userId.toString()
      );

      await Promise.all([utilisateur.save(), cible.save()]);

      // Supprimer la notification de demande d'ami existante
      await Notification.deleteMany({
        destinataire: userId,
        type: 'demande_ami',
        'data.userId': cibleId,
      });

      // Créer une notification pour la cible (sa demande a été acceptée)
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

    // Envoyer la demande
    utilisateur.demandesAmisEnvoyees = [...(utilisateur.demandesAmisEnvoyees || []), cible._id];
    cible.demandesAmisRecues = [...(cible.demandesAmisRecues || []), userId];

    await Promise.all([utilisateur.save(), cible.save()]);

    // Vérifier si une notification de demande d'ami existe déjà (éviter les doublons)
    const notificationExistante = await Notification.findOne({
      destinataire: cible._id,
      type: 'demande_ami',
      'data.userId': userId.toString(),
    });

    if (!notificationExistante) {
      // Créer une notification pour le destinataire uniquement si elle n'existe pas
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
    }

    res.json({ succes: true, message: 'Demande d\'ami envoyée.' });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/utilisateurs/:id/demande-ami
 * Annuler une demande d'ami envoyée
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

    const [utilisateur, cible] = await Promise.all([
      Utilisateur.findById(userId),
      Utilisateur.findById(cibleId),
    ]);

    if (!utilisateur || !cible) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    // Retirer la demande
    utilisateur.demandesAmisEnvoyees = utilisateur.demandesAmisEnvoyees?.filter(
      (d) => d.toString() !== cibleId
    );
    cible.demandesAmisRecues = cible.demandesAmisRecues?.filter(
      (d) => d.toString() !== userId.toString()
    );

    await Promise.all([utilisateur.save(), cible.save()]);

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

    // Vérifier si la demande existe
    if (!utilisateur.demandesAmisRecues?.some((d) => d.toString() === demandeurId)) {
      res.status(400).json({ succes: false, message: 'Aucune demande de cet utilisateur.' });
      return;
    }

    // Ajouter aux amis
    utilisateur.amis = [...(utilisateur.amis || []), demandeur._id];
    utilisateur.demandesAmisRecues = utilisateur.demandesAmisRecues?.filter(
      (d) => d.toString() !== demandeurId
    );
    demandeur.amis = [...(demandeur.amis || []), userId];
    demandeur.demandesAmisEnvoyees = demandeur.demandesAmisEnvoyees?.filter(
      (d) => d.toString() !== userId.toString()
    );

    await Promise.all([utilisateur.save(), demandeur.save()]);

    // Supprimer la notification de demande d'ami correspondante
    await Notification.deleteMany({
      destinataire: userId,
      type: 'demande_ami',
      'data.userId': demandeurId,
    });

    // Créer une notification pour le demandeur (sa demande a été acceptée)
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

    // Retirer la demande
    utilisateur.demandesAmisRecues = utilisateur.demandesAmisRecues?.filter(
      (d) => d.toString() !== demandeurId
    );
    demandeur.demandesAmisEnvoyees = demandeur.demandesAmisEnvoyees?.filter(
      (d) => d.toString() !== userId.toString()
    );

    await Promise.all([utilisateur.save(), demandeur.save()]);

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

    const [utilisateur, ami] = await Promise.all([
      Utilisateur.findById(userId),
      Utilisateur.findById(amiId),
    ]);

    if (!utilisateur || !ami) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    // Retirer des amis
    utilisateur.amis = utilisateur.amis?.filter((a) => a.toString() !== amiId);
    ami.amis = ami.amis?.filter((a) => a.toString() !== userId.toString());

    // Nettoyer aussi les demandes d'amis résiduelles (éviter les incohérences)
    utilisateur.demandesAmisRecues = utilisateur.demandesAmisRecues?.filter(
      (d) => d.toString() !== amiId
    );
    utilisateur.demandesAmisEnvoyees = utilisateur.demandesAmisEnvoyees?.filter(
      (d) => d.toString() !== amiId
    );
    ami.demandesAmisRecues = ami.demandesAmisRecues?.filter(
      (d) => d.toString() !== userId.toString()
    );
    ami.demandesAmisEnvoyees = ami.demandesAmisEnvoyees?.filter(
      (d) => d.toString() !== userId.toString()
    );

    await Promise.all([utilisateur.save(), ami.save()]);

    // Nettoyer toutes les notifications d'amitié entre les deux utilisateurs
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
 * Récupérer mes demandes d'amis reçues
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
 * Récupérer ma liste d'amis
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

    const utilisateur = await Utilisateur.findById(userId)
      .populate('amis', 'prenom nom avatar statut');

    if (!utilisateur) {
      res.status(404).json({ succes: false, message: 'Utilisateur non trouvé.' });
      return;
    }

    const amis = (utilisateur.amis || []).map((ami: any) => ({
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
