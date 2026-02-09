import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Projet, { IProjet, IMembreEquipe, IDocumentProjet, IMediaGalerie, IMetrique, ILienProjet } from '../models/Projet.js';
import Utilisateur from '../models/Utilisateur.js';
import Notification from '../models/Notification.js';
import Report from '../models/Report.js';
import { uploadPublicationMedias, uploadPublicationMedia, isBase64MediaDataUrl } from '../utils/cloudinary.js';
import AuditLog from '../models/AuditLog.js';

// =====================================================
// HELPERS
// =====================================================

/**
 * Echappe les caracteres speciaux regex pour eviter les injections ReDoS
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Vérifie si deux utilisateurs sont amis
 */
const isFriend = async (userIdA: mongoose.Types.ObjectId, userIdB: mongoose.Types.ObjectId): Promise<boolean> => {
  const user = await Utilisateur.findById(userIdA).select('amis');
  if (!user) return false;
  return user.amis.some((amiId) => amiId.equals(userIdB));
};

/**
 * Vérifie si l'utilisateur est membre de l'équipe du projet
 */
const isTeamMember = (projet: IProjet, userId: mongoose.Types.ObjectId): boolean => {
  return projet.equipe.some((m) => m.utilisateur && m.utilisateur.equals(userId));
};

/**
 * Vérifie si l'utilisateur peut modifier le projet (owner ou membre équipe)
 */
const canEditProject = (projet: IProjet, userId: mongoose.Types.ObjectId): boolean => {
  return projet.porteur.equals(userId) || isTeamMember(projet, userId);
};

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
        .populate('equipe.utilisateur', 'prenom nom avatar'),
      Projet.countDocuments(filtre),
    ]);

    // Ajouter estSuivi et nbFollowers pour chaque projet
    const userId = req.utilisateur?._id;
    const projetsAvecSuivi = projets.map((p) => {
      const projetObj = p.toObject() as any;
      projetObj.estSuivi = userId ? p.followers.some((f: any) => f.equals(userId)) : false;
      projetObj.nbFollowers = p.followers.length;
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
    const projet = await Projet.findById(req.params.id)
      .populate('porteur', 'prenom nom avatar statut')
      .populate('equipe.utilisateur', 'prenom nom avatar')
      .populate('followers', 'prenom nom avatar');

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

    // Indiquer si l'utilisateur suit le projet
    const estSuivi = userId ? projet.followers.some((f: any) => f._id.equals(userId)) : false;

    // Ajouter estSuivi et nbFollowers au projet pour le mobile
    projetData.estSuivi = estSuivi;
    projetData.nbFollowers = projet.followers.length;

    res.json({
      succes: true,
      data: {
        projet: projetData,
        suivi: estSuivi, // Pour compatibilité
        isOwner: userId ? projet.porteur._id.equals(userId) : false,
      },
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

    res.json({
      succes: true,
      data: {
        // Noms attendus par le mobile
        estSuivi: isNewFollow,
        nbFollowers,
        // Anciens noms pour compatibilite
        suivi: isNewFollow,
        totalFollowers: nbFollowers,
      },
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
      .populate('porteur', 'prenom nom avatar');

    // Ajouter nbFollowers et estSuivi pour chaque projet
    const projetsAvecStats = projets.map((p) => ({
      ...p.toObject(),
      nbFollowers: p.followers.length,
      estSuivi: true,
    }));

    res.json({ succes: true, data: { projets: projetsAvecStats } });
  } catch (error) {
    console.error('Erreur mesProjets:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

// =====================================================
// ENDPOINTS ENTREPRENEUR
// =====================================================

/**
 * GET /api/projets/entrepreneur/mes-projets
 * Liste des projets de l'entrepreneur connecté (brouillons + publiés)
 * Inclut les projets où l'utilisateur est porteur OU membre de l'équipe
 */
export const mesProjetsEntrepreneur = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const { statut } = req.query;

    // Chercher les projets où l'utilisateur est porteur OU membre de l'équipe
    const filtre: Record<string, unknown> = {
      $or: [
        { porteur: userId },
        { 'equipe.utilisateur': userId },
      ],
    };
    if (statut && ['draft', 'published'].includes(statut as string)) {
      filtre.statut = statut;
    }

    const projets = await Projet.find(filtre)
      .sort({ dateMiseAJour: -1 })
      .populate('porteur', 'prenom nom avatar')
      .populate('equipe.utilisateur', 'prenom nom avatar');

    // Séparer les projets où je suis porteur vs membre
    const mesProjetsOwner = projets.filter(p => p.porteur._id.equals(userId));
    const mesProjetsEquipe = projets.filter(p => !p.porteur._id.equals(userId));

    // Statistiques (basées sur mes projets en tant que porteur)
    const stats = {
      total: mesProjetsOwner.length,
      drafts: mesProjetsOwner.filter(p => p.statut === 'draft').length,
      published: mesProjetsOwner.filter(p => p.statut === 'published').length,
      totalFollowers: mesProjetsOwner.reduce((sum, p) => sum + p.followers.length, 0),
      projetsEquipe: mesProjetsEquipe.length,
    };

    res.json({ succes: true, data: { projets, stats } });
  } catch (error) {
    console.error('Erreur mesProjetsEntrepreneur:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/creer
 * Créer un nouveau projet (brouillon par défaut)
 */
export const creerProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    // Données minimales requises pour créer un brouillon
    const {
      nom,
      pitch,
      categorie,
      localisation,
    } = req.body;

    if (!nom || !pitch || !categorie || !localisation?.ville) {
      res.status(400).json({
        succes: false,
        message: 'Données manquantes: nom, pitch, categorie et localisation.ville sont requis.',
      });
      return;
    }

    // Créer le projet avec les champs de base
    const projetData: Partial<IProjet> = {
      nom: nom.trim(),
      description: req.body.description || '',
      pitch: pitch.trim(),
      categorie,
      secteur: req.body.secteur || '',
      tags: req.body.tags || [],
      localisation: {
        ville: localisation.ville,
        lat: localisation.lat || 0,
        lng: localisation.lng || 0,
      },
      porteur: userId,
      equipe: [],
      metriques: [],
      galerie: [],
      documents: [],
      liens: [],
      statut: 'draft',
      maturite: req.body.maturite || 'idee',
      progression: 0,
    };

    const projet = new Projet(projetData);
    await projet.save();

    res.status(201).json({
      succes: true,
      message: 'Projet créé en brouillon.',
      data: { projet },
    });
  } catch (error) {
    console.error('Erreur creerProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * PUT /api/projets/entrepreneur/:id
 * Modifier un projet existant (toutes les étapes du wizard)
 * Accessible au porteur ET aux membres de l'équipe
 */
export const modifierProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // Vérifier que l'utilisateur est le porteur OU membre de l'équipe
    if (!canEditProject(projet, userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    // Séparer les droits owner vs membre d'équipe
    const isOwner = projet.porteur.equals(userId);

    // Membres d'équipe: uniquement médias, documents, liens, métriques
    const champsMembre = [
      'galerie', 'documents', 'liens', 'metriques', 'pitchVideo',
    ];

    // Owner: tous les champs
    const champsOwner = [
      // Étape A - Identité
      'nom', 'description', 'pitch', 'logo', 'categorie', 'secteur', 'tags', 'localisation',
      // Étape C - Proposition de valeur
      'probleme', 'solution', 'avantageConcurrentiel', 'cible',
      // Étape D - Traction & business
      'maturite', 'businessModel', 'objectifFinancement', 'montantLeve', 'progression', 'objectif',
      // Étape E - Médias (partagé avec membres)
      ...champsMembre,
      // Gestion d'équipe (owner uniquement)
      'image', 'equipe',
    ];

    const champsModifiables = isOwner ? champsOwner : champsMembre;

    // Appliquer les modifications
    for (const champ of champsModifiables) {
      if (req.body[champ] !== undefined) {
        (projet as any)[champ] = req.body[champ];
      }
    }

    await projet.save();

    res.json({
      succes: true,
      message: 'Projet mis à jour.',
      data: { projet },
    });
  } catch (error) {
    console.error('Erreur modifierProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/:id/publier
 * Publier un projet (passe de draft à published)
 * Retourne une erreur détaillée avec les champs manquants
 */
export const publierProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    if (projet.statut === 'published') {
      res.status(400).json({ succes: false, message: 'Le projet est déjà publié.' });
      return;
    }

    // Validation avant publication - champs requis pour publier
    const missing: string[] = [];
    const details: Record<string, string> = {};

    // Étape A - Identité (obligatoires)
    if (!projet.nom || projet.nom.trim().length === 0) {
      missing.push('nom');
      details.nom = 'Le nom du projet est requis';
    }
    if (!projet.pitch || projet.pitch.trim().length === 0) {
      missing.push('pitch');
      details.pitch = 'Le pitch (slogan) est requis';
    }
    if (!projet.categorie) {
      missing.push('categorie');
      details.categorie = 'La catégorie est requise';
    }
    if (!projet.localisation?.ville || projet.localisation.ville.trim().length === 0) {
      missing.push('localisation');
      details.localisation = 'La ville est requise';
    }

    // Étape C - Proposition de valeur (au moins problème OU solution)
    // Optionnel pour publication mais recommandé

    // Étape E - Médias (image de couverture requise)
    if (!projet.image || projet.image.trim().length === 0) {
      missing.push('image');
      details.image = 'Une image de couverture est requise';
    }

    // Description optionnelle (pas de minimum requis pour publication)

    if (missing.length > 0) {
      res.status(400).json({
        succes: false,
        message: 'Projet incomplet',
        missing,
        details,
      });
      return;
    }

    projet.statut = 'published';
    projet.datePublication = new Date();
    await projet.save();

    // Log d'audit
    try {
      await AuditLog.create({
        action: 'content:other',
        targetType: 'publication',
        targetId: projet._id,
        performedBy: userId,
        metadata: { type: 'project_published', nom: projet.nom },
        source: 'api',
      });
    } catch (auditError) {
      console.error('Erreur audit log:', auditError);
    }

    res.json({
      succes: true,
      message: 'Projet publié avec succès.',
      data: { projet },
    });
  } catch (error) {
    console.error('Erreur publierProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/:id/depublier
 * Dépublier un projet (repasse en brouillon)
 */
export const depublierProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    if (projet.statut === 'draft') {
      res.status(400).json({ succes: false, message: 'Le projet est déjà en brouillon.' });
      return;
    }

    projet.statut = 'draft';
    await projet.save();

    res.json({
      succes: true,
      message: 'Projet dépublié.',
      data: { projet },
    });
  } catch (error) {
    console.error('Erreur depublierProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * PATCH /api/projets/entrepreneur/:id/equipe
 * Gérer l'équipe d'un projet (ajouter/retirer des membres)
 * Body: { add: [userId, ...], remove: [userId, ...] }
 * Règles:
 * - Seul le porteur peut gérer l'équipe
 * - Les membres ajoutés doivent être amis avec le porteur
 * - Les membres ajoutés doivent avoir statut === 'entrepreneur'
 */
export const gererEquipeProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;
    const { add = [], remove = [] } = req.body;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // Seul le porteur peut gérer l'équipe
    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Seul le porteur peut gérer l\'équipe.' });
      return;
    }

    const errors: string[] = [];
    const addedMembers: string[] = [];
    const removedMembers: string[] = [];

    // Traiter les suppressions d'abord (atomic)
    if (Array.isArray(remove) && remove.length > 0) {
      const validRemoveIds = remove.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
      for (const membreId of validRemoveIds) {
        const isInTeam = projet.equipe.some(
          (m) => m.utilisateur && m.utilisateur.toString() === membreId
        );
        if (isInTeam) {
          removedMembers.push(membreId);
        }
      }
      if (removedMembers.length > 0) {
        await Projet.findByIdAndUpdate(projetId, {
          $pull: { equipe: { utilisateur: { $in: removedMembers.map(id => new mongoose.Types.ObjectId(id)) } } },
        });
      }
    }

    // Traiter les ajouts — validate then atomic push
    const membersToAdd: IMembreEquipe[] = [];
    if (Array.isArray(add) && add.length > 0) {
      // Re-fetch projet to get current state after removals
      const projetCurrent = await Projet.findById(projetId);

      for (const membreId of add) {
        if (!mongoose.Types.ObjectId.isValid(membreId)) {
          errors.push(`ID invalide: ${membreId}`);
          continue;
        }

        const membreObjectId = new mongoose.Types.ObjectId(membreId);

        // Ne pas ajouter le porteur lui-même
        if (membreObjectId.equals(userId)) {
          errors.push('Vous ne pouvez pas vous ajouter vous-même');
          continue;
        }

        // Vérifier si déjà dans l'équipe
        const dejaPresent = projetCurrent?.equipe.some(
          (m) => m.utilisateur && m.utilisateur.equals(membreObjectId)
        );
        if (dejaPresent) {
          errors.push(`${membreId} est déjà dans l'équipe`);
          continue;
        }

        // Vérifier que c'est un ami
        const estAmi = await isFriend(userId, membreObjectId);
        if (!estAmi) {
          errors.push(`${membreId}: Vous devez être amis pour l'ajouter à l'équipe`);
          continue;
        }

        // Vérifier que c'est un entrepreneur
        const membre = await Utilisateur.findById(membreObjectId).select('statut prenom nom');
        if (!membre) {
          errors.push(`${membreId}: Utilisateur non trouvé`);
          continue;
        }
        if (membre.statut !== 'entrepreneur') {
          errors.push(`${membre.prenom} ${membre.nom}: Doit être entrepreneur pour rejoindre l'équipe`);
          continue;
        }

        membersToAdd.push({
          utilisateur: membreObjectId,
          nom: `${membre.prenom} ${membre.nom}`,
          role: 'other',
        } as IMembreEquipe);
        addedMembers.push(membreId);
      }

      if (membersToAdd.length > 0) {
        await Projet.findByIdAndUpdate(projetId, {
          $push: { equipe: { $each: membersToAdd } },
        });
      }
    }

    // Recharger avec populate
    const projetUpdated = await Projet.findById(projetId)
      .populate('equipe.utilisateur', 'prenom nom avatar statut');

    // Log d'audit
    if (addedMembers.length > 0 || removedMembers.length > 0) {
      try {
        await AuditLog.create({
          action: 'content:other',
          targetType: 'publication',
          targetId: projet._id,
          performedBy: userId,
          metadata: { type: 'project_team_updated', added: addedMembers, removed: removedMembers },
          source: 'api',
        });
      } catch (auditError) {
        console.error('Erreur audit log:', auditError);
      }
    }

    res.json({
      succes: true,
      message: 'Équipe mise à jour.',
      data: {
        projet: projetUpdated,
        added: addedMembers,
        removed: removedMembers,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('Erreur gererEquipeProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * DELETE /api/projets/entrepreneur/:id
 * Supprimer un projet
 */
export const supprimerProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    if (!projet.porteur.equals(userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    // RED-03: Cascade delete — clean up all references to this project
    await Promise.all([
      Projet.findByIdAndDelete(projetId),
      // Remove all notifications referencing this project
      Notification.deleteMany({ 'data.projetId': projetId }),
      // Remove all reports targeting this project
      Report.deleteMany({ targetType: 'projet', targetId: projetId }),
    ]);

    // Audit log
    try {
      await AuditLog.create({
        action: 'content:other',
        targetType: 'publication',
        targetId: projetId,
        performedBy: userId,
        metadata: { type: 'project_deleted', nom: projet.nom },
        source: 'api',
      });
    } catch (auditErr) {
      console.error('Erreur audit log suppression projet:', auditErr);
    }

    res.json({ succes: true, message: 'Projet supprimé.' });
  } catch (error) {
    console.error('Erreur supprimerProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/:id/upload-media
 * Upload de médias (images/vidéos) pour un projet
 * Body: { medias: string[] } - tableau de data URLs base64
 */
export const uploadMediaProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;
    const { medias, type } = req.body; // type: 'galerie' | 'logo' | 'cover' | 'pitchVideo'

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // IDOR fix: allow team members, not just owner
    if (!canEditProject(projet, userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    if (!medias || !Array.isArray(medias) || medias.length === 0) {
      res.status(400).json({ succes: false, message: 'Aucun média fourni.' });
      return;
    }

    // Filtrer les médias valides (base64 data URLs)
    const mediasValides = medias.filter((m: string) => isBase64MediaDataUrl(m));
    if (mediasValides.length === 0) {
      res.status(400).json({ succes: false, message: 'Aucun média valide fourni.' });
      return;
    }

    // Upload sur Cloudinary
    const uploadResults = await uploadPublicationMedias(mediasValides, projetId);

    // Mettre à jour le projet selon le type (atomic)
    if (type === 'logo' && uploadResults.length > 0) {
      await Projet.findByIdAndUpdate(projetId, { $set: { logo: uploadResults[0].url } });
    } else if (type === 'cover' && uploadResults.length > 0) {
      await Projet.findByIdAndUpdate(projetId, { $set: { image: uploadResults[0].url } });
    } else if (type === 'pitchVideo' && uploadResults.length > 0) {
      await Projet.findByIdAndUpdate(projetId, { $set: { pitchVideo: uploadResults[0].url } });
    } else {
      // Galerie - ajouter les médias atomiquement
      const nouveauxMedias: IMediaGalerie[] = uploadResults.map((r, index) => ({
        url: r.url,
        type: r.type,
        thumbnailUrl: r.thumbnailUrl,
        ordre: projet.galerie.length + index,
      }));
      await Projet.findByIdAndUpdate(projetId, { $push: { galerie: { $each: nouveauxMedias } } });
    }

    res.json({
      succes: true,
      message: 'Médias uploadés.',
      data: { urls: uploadResults.map(r => r.url) },
    });
  } catch (error) {
    console.error('Erreur uploadMediaProjet:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/projets/entrepreneur/:id/upload-document
 * Upload d'un document pour un projet
 * Body: { document: string (base64), nom: string, type: string, visibilite: string }
 */
export const uploadDocumentProjet = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const projetId = req.params.id;
    const { document, nom, type = 'other', visibilite = 'private' } = req.body;

    const projet = await Projet.findById(projetId);
    if (!projet) {
      res.status(404).json({ succes: false, message: 'Projet non trouvé.' });
      return;
    }

    // IDOR fix: allow team members, not just owner
    if (!canEditProject(projet, userId)) {
      res.status(403).json({ succes: false, message: 'Accès non autorisé.' });
      return;
    }

    if (!document || !nom) {
      res.status(400).json({ succes: false, message: 'Document et nom requis.' });
      return;
    }

    // Upload sur Cloudinary (traité comme média)
    const url = await uploadPublicationMedia(document, `${projetId}_doc`);

    const nouveauDocument: IDocumentProjet = {
      nom: nom.trim(),
      url,
      type: type as IDocumentProjet['type'],
      visibilite: visibilite as IDocumentProjet['visibilite'],
      dateAjout: new Date(),
    };

    // Atomic: push document without read-modify-write race
    await Projet.findByIdAndUpdate(projetId, { $push: { documents: nouveauDocument } });

    res.json({
      succes: true,
      message: 'Document uploadé.',
      data: { document: nouveauDocument },
    });
  } catch (error) {
    console.error('Erreur uploadDocumentProjet:', error);
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
