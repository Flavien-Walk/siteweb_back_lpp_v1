import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Projet from '../../models/Projet.js';
import Utilisateur from '../../models/Utilisateur.js';
import Notification from '../../models/Notification.js';
import { applyGamificationEvent } from '../../services/gamificationEngine.js';
import { escapeRegex } from '../../utils/strings.js';

/**
 * GET /api/projets
 * Liste des projets publiés avec filtres (endpoint public)
 */
export const listerProjets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categorie, secteur, maturite, q, page = '1', limit = '20' } = req.query;

    // Par défaut, ne montrer que les projets publiés
    const filtre: Record<string, unknown> = { statut: 'published' };
    // Sanitize: n'accepter que des strings (bloquer les opérateurs MongoDB $ne, $gt, etc.)
    if (typeof categorie === 'string') filtre.categorie = categorie;
    if (typeof secteur === 'string') filtre.secteur = secteur;
    if (typeof maturite === 'string') filtre.maturite = maturite;
    const incubateur = req.query.incubateur;
    if (typeof incubateur === 'string') filtre.incubateur = incubateur;
    if (typeof q === 'string' && q.trim()) {
      const searchRegex = new RegExp(escapeRegex(q.trim().slice(0, 100)), 'i');
      filtre.$or = [
        { nom: searchRegex },
        { pitch: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ];
    }

    const pageNum = Math.min(1000, Math.max(1, parseInt(page as string, 10)));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [projets, total] = await Promise.all([
      Projet.find(filtre)
        .sort({ datePublication: -1, dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('porteur', 'prenom nom avatar')
        .populate('equipe.utilisateur', 'prenom nom avatar')
        .lean(),
      Projet.countDocuments(filtre),
    ]);

    // Ajouter estSuivi et nbFollowers pour chaque projet
    const userId = req.utilisateur?._id;
    const projetsAvecSuivi = projets.map((p: any) => {
      const projetObj = typeof p.toObject === 'function' ? p.toObject() : { ...p };
      const userIdStr = userId?.toString();
      projetObj.estSuivi = userIdStr ? (p.followers || []).some((f: any) => f.toString() === userIdStr) : false;
      projetObj.nbFollowers = (p.followers || []).length;
      // PENTEST-10: Ne pas exposer le tableau followers brut
      delete projetObj.followers;
      // PENTEST-05: Filtrer documents prives dans la liste publique
      if (projetObj.documents) {
        const isPorteur = userId && projetObj.porteur?._id?.toString() === userId.toString();
        if (!isPorteur) {
          projetObj.documents = projetObj.documents.filter((d: any) => d.visibilite === 'public');
        }
      }
      return projetObj;
    });

    res.json({
      succes: true,
      data: {
        projets: projetsAvecSuivi,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur listerProjets:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/projets/:id
 * Détail d'un projet (brouillons visibles uniquement par le porteur)
 */
export const detailProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    // PENTEST-10: Ne pas populate followers (expose la liste complete des followers)
    const projet = await Projet.findById(req.params.id)
      .populate('porteur', 'prenom nom avatar statut')
      .populate('equipe.utilisateur', 'prenom nom avatar');

    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // Si le projet est en brouillon, seul le porteur ou un membre de l'équipe peut le voir
    const userId = req.utilisateur?._id;
    if (projet.statut === 'draft') {
      const isOwner = userId && projet.porteur._id.equals(userId);
      const isMember = userId && projet.equipe.some((m: any) => m.utilisateur && m.utilisateur._id?.equals(userId));
      if (!isOwner && !isMember) {
        res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
        return;
      }
    }

    // Filtrer les documents privés si l'utilisateur n'est pas le porteur ou membre
    const isOwnerOrMember = userId && (projet.porteur._id.equals(userId) ||
      projet.equipe.some((m: any) => m.utilisateur && m.utilisateur._id?.equals(userId)));
    let documentsFiltered = projet.documents;
    if (!isOwnerOrMember) {
      documentsFiltered = projet.documents.filter(d => d.visibilite === 'public');
    }

    const projetData = projet.toObject() as any;
    projetData.documents = documentsFiltered;

    // Indiquer si l'utilisateur suit le projet (followers = ObjectIds non peuplés)
    const estSuivi = userId ? projet.followers.some((f: any) => f.equals(userId)) : false;

    // Ajouter estSuivi et nbFollowers, supprimer le tableau followers brut
    projetData.estSuivi = estSuivi;
    projetData.nbFollowers = projet.followers.length;
    delete projetData.followers;

    const isOwner = userId ? projet.porteur._id.equals(userId) : false;

    // Gamification: XP pour visite de projet (seulement si connecte et pas owner)
    let gamification = null;
    if (userId && !isOwner) {
      gamification = await applyGamificationEvent(userId.toString(), 'view_project', req.params.id).catch(() => null);
    }

    res.json({
      succes: true,
      data: {
        projet: projetData,
        suivi: estSuivi,
        isOwner,
      },
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    console.error('Erreur detailProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/:id/suivre
 * Suivre / ne plus suivre un projet (toggle)
 * Crée des notifications pour tous les membres du projet lors d'un nouveau follow
 */
export const toggleSuivreProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const projet = await Projet.findById(req.params.id)
      .populate('porteur', 'prenom nom');
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // Seuls les projets publiés peuvent être suivis
    if (projet.statut !== 'published') {
      res.status(400).json({ succes: false, message: 'Ce projet n\'est pas disponible.' });
      return;
    }

    const userId = req.utilisateur!._id;
    const user = req.utilisateur!;
    const isCurrentlyFollowing = projet.followers.some((id) => id.equals(userId));

    if (!isCurrentlyFollowing) {
      // Ne pas permettre de se suivre soi-même (si owner ou membre)
      const isOwner = projet.porteur._id.equals(userId);
      const isMember = projet.equipe.some((m) => m.utilisateur && m.utilisateur.equals(userId));
      if (isOwner || isMember) {
        res.status(400).json({ succes: false, message: 'Vous ne pouvez pas suivre votre propre projet.' });
        return;
      }

      // RED-01: Atomic $addToSet — prevents duplicates even under concurrent requests
      await Projet.findByIdAndUpdate(req.params.id, {
        $addToSet: { followers: userId },
      });
    } else {
      // RED-01: Atomic $pull — safe concurrent unfollow
      await Projet.findByIdAndUpdate(req.params.id, {
        $pull: { followers: userId },
      });
    }

    const isNewFollow = !isCurrentlyFollowing;

    // Re-fetch to get accurate count after atomic update
    const updatedProjet = await Projet.findById(req.params.id).select('followers');
    const nbFollowers = updatedProjet?.followers.length || 0;

    // Créer des notifications pour tous les membres du projet (uniquement sur nouveau follow)
    if (isNewFollow) {
      try {
        // Collecter tous les destinataires (owner + membres équipe)
        const destinataires: mongoose.Types.ObjectId[] = [projet.porteur._id];
        for (const membre of projet.equipe) {
          if (membre.utilisateur && !membre.utilisateur.equals(projet.porteur._id)) {
            destinataires.push(membre.utilisateur as mongoose.Types.ObjectId);
          }
        }

        // Créer les notifications (avec gestion des doublons via l'index unique)
        const notificationPromises = destinataires.map((destinataireId) =>
          Notification.create({
            destinataire: destinataireId,
            type: 'project_follow',
            titre: 'Nouveau follower',
            message: `${user.prenom} ${user.nom} suit maintenant votre projet ${projet.nom}`,
            lien: `/projets/${projet._id}`,
            data: {
              userId: userId.toString(),
              userNom: user.nom,
              userPrenom: user.prenom,
              userAvatar: user.avatar,
              projetId: projet._id.toString(),
              projetNom: projet.nom,
            },
          }).catch((err: any) => {
            // Ignorer les erreurs de doublon (index unique)
            if (err.code !== 11000) {
              console.error('Erreur création notification project_follow:', err);
            }
          })
        );

        await Promise.all(notificationPromises);
      } catch (notifError) {
        console.error('Erreur notifications project_follow:', notifError);
        // Ne pas bloquer le follow si les notifications échouent
      }
    }

    // Gamification: XP pour follow projet (seulement si nouveau follow, pas unfollow)
    let gamification = null;
    if (isNewFollow) {
      gamification = await applyGamificationEvent(userId.toString(), 'follow_project', req.params.id).catch(() => null);
    }

    res.json({
      succes: true,
      data: {
        estSuivi: isNewFollow,
        nbFollowers,
        suivi: isNewFollow,
        totalFollowers: nbFollowers,
      },
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    console.error('Erreur toggleSuivreProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/projets/suivis
 * Mes projets suivis
 */
export const mesProjets = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projets = await Projet.find({ followers: userId, statut: 'published' })
      .sort({ dateMiseAJour: -1 })
      .populate('porteur', 'prenom nom avatar')
      .lean();

    // Ajouter nbFollowers et estSuivi, retirer followers brut
    const projetsAvecStats = projets.map((p: any) => {
      const obj = { ...p };
      obj.nbFollowers = (p.followers || []).length;
      obj.estSuivi = true;
      delete obj.followers;
      return obj;
    });

    res.json({ succes: true, data: { projets: projetsAvecStats } });
  } catch (error) {
    console.error('Erreur mesProjets:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/projets/:id/representants
 * Liste des personnes contactables pour un projet
 * Retourne le porteur + membres de l'équipe
 */
export const getRepresentantsProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const projet = await Projet.findById(req.params.id)
      .select('nom porteur equipe statut')
      .populate('porteur', '_id prenom nom avatar statut')
      .populate('equipe.utilisateur', '_id prenom nom avatar statut');

    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // Seuls les projets publiés sont accessibles publiquement
    if (projet.statut !== 'published') {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // Construire la liste des représentants
    const representants: Array<{
      _id: string;
      prenom: string;
      nom: string;
      avatar?: string;
      role: string;
      isOwner: boolean;
    }> = [];

    // Ajouter le porteur
    const porteur = projet.porteur as any;
    if (porteur) {
      representants.push({
        _id: porteur._id.toString(),
        prenom: porteur.prenom,
        nom: porteur.nom,
        avatar: porteur.avatar,
        role: 'Porteur du projet',
        isOwner: true,
      });
    }

    // Ajouter les membres de l'équipe
    for (const membre of projet.equipe) {
      const user = membre.utilisateur as any;
      if (user && !user._id.equals(porteur._id)) {
        representants.push({
          _id: user._id.toString(),
          prenom: user.prenom,
          nom: user.nom,
          avatar: user.avatar,
          role: membre.titre || membre.role || 'Membre de l\'équipe',
          isOwner: false,
        });
      }
    }

    res.json({
      succes: true,
      data: {
        projetNom: projet.nom,
        representants,
      },
    });
  } catch (error) {
    console.error('Erreur getRepresentantsProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/projets/incubateurs
 * Liste des incubateurs ayant au moins un projet publié, avec le nombre de projets
 */
export const getIncubateursActifs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultats = await Projet.aggregate([
      { $match: { statut: 'published', incubateur: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$incubateur', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, nom: '$_id', count: 1 } },
    ]);

    res.json({ succes: true, data: { incubateurs: resultats } });
  } catch (error) {
    console.error('Erreur getIncubateursActifs:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
