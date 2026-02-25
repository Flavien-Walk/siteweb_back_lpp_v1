import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Projet, { IProjet, IMembreEquipe, IDocumentProjet, IMediaGalerie } from '../../models/Projet.js';
import Utilisateur from '../../models/Utilisateur.js';
import AuditLog from '../../models/AuditLog.js';
import { uploadPublicationMedias, uploadPublicationMedia, isBase64MediaDataUrl } from '../../utils/cloudinary.js';

// =====================================================
// HELPERS
// =====================================================

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
