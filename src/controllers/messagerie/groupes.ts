import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Message, Conversation, chiffrerMessage } from '../../models/Message.js';
import Utilisateur from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { forceLeaveConversation } from '../../socket/index.js';

// Schéma pour créer un groupe
const schemaCreerGroupe = z.object({
  nom: z
    .string()
    .min(1, 'Le nom du groupe est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
  participants: z.array(z.string()).min(1, 'Au moins un participant requis').max(50, 'Maximum 50 participants'),
  imageGroupe: z.string().url().optional(),
});

// Schéma pour modifier un groupe
const schemaModifierGroupe = z.object({
  nom: z.string().max(100).optional(),
  imageGroupe: z.string().url().nullable().optional(),
});

/**
 * POST /api/messagerie/groupes
 * Créer un groupe
 */
export const creerGroupe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaCreerGroupe.parse(req.body);
    const userId = req.utilisateur!._id;

    // Vérifier que tous les participants existent
    const participantsIds = donnees.participants.filter(
      (id) => mongoose.Types.ObjectId.isValid(id) && id !== userId.toString()
    );

    const participantsExistants = await Utilisateur.find({
      _id: { $in: participantsIds },
    }).select('_id');

    if (participantsExistants.length !== participantsIds.length) {
      throw new ErreurAPI('Certains participants sont invalides.', 400);
    }

    // Créer le groupe (créateur inclus dans participants et admins)
    const groupe = await Conversation.create({
      participants: [userId, ...participantsIds],
      estGroupe: true,
      nomGroupe: donnees.nom,
      imageGroupe: donnees.imageGroupe,
      createur: userId,
      admins: [userId],
      muetPar: [],
      dateMiseAJour: new Date(),
    });

    // Créer un message système
    const messageSysteme = await Message.create({
      conversation: groupe._id,
      expediteur: userId,
      type: 'systeme',
      contenuCrypte: chiffrerMessage(`${req.utilisateur!.prenom} a créé le groupe "${donnees.nom}"`),
      lecteurs: [userId],
    });

    groupe.dernierMessage = messageSysteme._id;
    await groupe.save();

    // Récupérer avec les infos des participants
    const groupeComplet = await Conversation.findById(groupe._id)
      .populate('participants', 'prenom nom avatar')
      .populate('createur', 'prenom nom');

    res.status(201).json({
      succes: true,
      message: 'Groupe créé avec succès.',
      data: {
        groupe: groupeComplet,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/messagerie/groupes/:groupeId
 * Modifier un groupe (nom, image)
 */
export const modifierGroupe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupeId } = req.params;
    const donnees = schemaModifierGroupe.parse(req.body);
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(groupeId)) {
      throw new ErreurAPI('ID groupe invalide.', 400);
    }

    const groupe = await Conversation.findById(groupeId);
    if (!groupe || !groupe.estGroupe) {
      throw new ErreurAPI('Groupe non trouvé.', 404);
    }

    // Vérifier que l'utilisateur est admin
    if (!groupe.admins.some((a) => a.toString() === userId.toString())) {
      throw new ErreurAPI('Seuls les admins peuvent modifier le groupe.', 403);
    }

    // Mettre à jour
    if (donnees.nom) groupe.nomGroupe = donnees.nom;
    if (donnees.imageGroupe !== undefined) groupe.imageGroupe = donnees.imageGroupe || undefined;
    groupe.dateMiseAJour = new Date();
    await groupe.save();

    res.json({
      succes: true,
      message: 'Groupe modifié avec succès.',
      data: { groupe },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/messagerie/groupes/:groupeId/participants
 * Ajouter des participants à un groupe
 */
export const ajouterParticipants = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupeId } = req.params;
    const { participants } = req.body;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(groupeId)) {
      throw new ErreurAPI('ID groupe invalide.', 400);
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      throw new ErreurAPI('Liste de participants requise.', 400);
    }

    const groupe = await Conversation.findById(groupeId);
    if (!groupe || !groupe.estGroupe) {
      throw new ErreurAPI('Groupe non trouvé.', 404);
    }

    // Seuls les admins du groupe peuvent ajouter des participants
    if (!groupe.admins.some((a) => a.toString() === userId.toString())) {
      throw new ErreurAPI('Seuls les admins peuvent ajouter des participants.', 403);
    }

    // Filtrer les nouveaux participants valides
    const nouveauxIds = participants.filter(
      (id: string) =>
        mongoose.Types.ObjectId.isValid(id) &&
        !groupe.participants.some((p) => p.toString() === id)
    );

    const nouveauxUtilisateurs = await Utilisateur.find({
      _id: { $in: nouveauxIds },
    }).select('_id prenom');

    if (nouveauxUtilisateurs.length === 0) {
      throw new ErreurAPI('Aucun nouveau participant valide.', 400);
    }

    // Message système
    const noms = nouveauxUtilisateurs.map((u) => u.prenom).join(', ');
    const messageSysteme = await Message.create({
      conversation: groupe._id,
      expediteur: userId,
      type: 'systeme',
      contenuCrypte: chiffrerMessage(`${req.utilisateur!.prenom} a ajouté ${noms} au groupe`),
      lecteurs: [userId],
    });

    // Atomic: add participants without read-modify-write race
    await Conversation.findByIdAndUpdate(groupeId, {
      $addToSet: { participants: { $each: nouveauxUtilisateurs.map((u) => u._id) } },
      $set: { dateMiseAJour: new Date(), dernierMessage: messageSysteme._id },
    });

    res.json({
      succes: true,
      message: 'Participants ajoutés avec succès.',
      data: { participantsAjoutes: nouveauxUtilisateurs.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/messagerie/groupes/:groupeId/participants/:participantId
 * Retirer un participant d'un groupe
 */
export const retirerParticipant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupeId, participantId } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(groupeId) || !mongoose.Types.ObjectId.isValid(participantId)) {
      throw new ErreurAPI('IDs invalides.', 400);
    }

    const groupe = await Conversation.findById(groupeId);
    if (!groupe || !groupe.estGroupe) {
      throw new ErreurAPI('Groupe non trouvé.', 404);
    }

    const estAdmin = groupe.admins.some((a) => a.toString() === userId.toString());
    const estSoiMeme = participantId === userId.toString();

    // Seuls les admins peuvent retirer quelqu'un, ou on peut se retirer soi-même
    if (!estAdmin && !estSoiMeme) {
      throw new ErreurAPI('Vous ne pouvez pas retirer ce participant.', 403);
    }

    // Empêcher de retirer le créateur (sauf s'il part lui-même)
    if (groupe.createur?.toString() === participantId && !estSoiMeme) {
      throw new ErreurAPI('Impossible de retirer le créateur du groupe.', 403);
    }

    // RED-06: Force leave socket room immediately
    forceLeaveConversation(participantId, groupeId);

    // Atomic: remove participant and admin entry
    const participantObjectId = new mongoose.Types.ObjectId(participantId);
    const updated = await Conversation.findByIdAndUpdate(
      groupeId,
      { $pull: { participants: participantObjectId, admins: participantObjectId } },
      { new: true }
    );

    // Si le groupe est vide, le supprimer
    if (!updated || updated.participants.length === 0) {
      await Conversation.findByIdAndDelete(groupeId);
      await Message.deleteMany({ conversation: groupeId });

      res.json({
        succes: true,
        message: 'Groupe supprimé car vide.',
      });
      return;
    }

    // Si le créateur part, transférer à un autre admin ou premier membre
    if (updated.createur?.toString() === participantId) {
      const newCreator = updated.admins[0] || updated.participants[0];
      await Conversation.findByIdAndUpdate(groupeId, {
        $set: { createur: newCreator },
        $addToSet: { admins: newCreator },
      });
    }

    // Message système
    const participantRetire = await Utilisateur.findById(participantId).select('prenom');
    const messageTexte = estSoiMeme
      ? `${participantRetire?.prenom || 'Un membre'} a quitté le groupe`
      : `${req.utilisateur!.prenom} a retiré ${participantRetire?.prenom || 'un membre'} du groupe`;

    const messageSysteme = await Message.create({
      conversation: updated._id,
      expediteur: userId,
      type: 'systeme',
      contenuCrypte: chiffrerMessage(messageTexte),
      lecteurs: [userId],
    });

    await Conversation.findByIdAndUpdate(groupeId, {
      $set: { dateMiseAJour: new Date(), dernierMessage: messageSysteme._id },
    });

    res.json({
      succes: true,
      message: estSoiMeme ? 'Vous avez quitté le groupe.' : 'Participant retiré.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/messagerie/groupes/:groupeId
 * Supprimer un groupe (seulement par le createur ou un admin)
 */
export const supprimerGroupe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { groupeId } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(groupeId)) {
      throw new ErreurAPI('ID groupe invalide.', 400);
    }

    const groupe = await Conversation.findById(groupeId);
    if (!groupe || !groupe.estGroupe) {
      throw new ErreurAPI('Groupe non trouve.', 404);
    }

    // Verifier que l'utilisateur est le createur ou un admin
    const estCreateur = groupe.createur?.toString() === userId.toString();
    const estAdmin = groupe.admins.some((a) => a.toString() === userId.toString());

    if (!estCreateur && !estAdmin) {
      throw new ErreurAPI('Seul le createur ou un admin peut supprimer le groupe.', 403);
    }

    // Supprimer tous les messages du groupe
    await Message.deleteMany({ conversation: groupeId });

    // Supprimer le groupe
    await Conversation.findByIdAndDelete(groupeId);

    res.json({
      succes: true,
      message: 'Groupe supprime avec succes.',
    });
  } catch (error) {
    next(error);
  }
};
