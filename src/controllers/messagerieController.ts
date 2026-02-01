import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Message, Conversation, chiffrerMessage, TypeMessage } from '../models/Message.js';
import Utilisateur from '../models/Utilisateur.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

/**
 * Echappe les caractères spéciaux regex pour éviter les injections ReDoS
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Schéma pour envoyer un message
const schemaEnvoyerMessage = z.object({
  conversationId: z.string().optional(),
  destinataireId: z.string().optional(), // Pour créer une nouvelle conversation privée
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères')
    .trim(),
  type: z.enum(['texte', 'image']).default('texte'),
});

// Schéma pour créer un groupe
const schemaCreerGroupe = z.object({
  nom: z
    .string()
    .min(1, 'Le nom du groupe est requis')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères')
    .trim(),
  participants: z.array(z.string()).min(1, 'Au moins un participant requis'),
  imageGroupe: z.string().url().optional(),
});

// Schéma pour modifier un groupe
const schemaModifierGroupe = z.object({
  nom: z.string().max(100).optional(),
  imageGroupe: z.string().url().nullable().optional(),
});

/**
 * GET /api/messagerie/conversations
 * Liste des conversations de l'utilisateur
 */
export const getConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .sort({ dateMiseAJour: -1 })
      .populate('participants', 'prenom nom avatar')
      .populate('createur', 'prenom nom')
      .populate({
        path: 'dernierMessage',
        select: 'contenuCrypte expediteur dateCreation type',
      });

    // Transformer pour ajouter les infos utiles
    const conversationsFormatees = await Promise.all(
      conversations.map(async (conv) => {
        const convObj = conv.toObject();

        // Pour les conversations privées, trouver l'autre participant
        let autreParticipant = null;
        if (!conv.estGroupe) {
          autreParticipant = conv.participants.find(
            (p: { _id: mongoose.Types.ObjectId }) => p._id.toString() !== userId.toString()
          );
        }

        // Compter les messages non lus (messages où l'utilisateur n'est pas dans lecteurs)
        const messagesNonLus = await Message.countDocuments({
          conversation: conv._id,
          expediteur: { $ne: userId },
          lecteurs: { $ne: userId },
        });

        // Déchiffrer le dernier message si existe
        let dernierMessageDecrypte = null;
        if (conv.dernierMessage) {
          const msg = await Message.findById(conv.dernierMessage._id);
          if (msg) {
            dernierMessageDecrypte = {
              contenu: msg.type === 'image' ? '📷 Photo' : msg.contenu,
              expediteur: msg.expediteur,
              dateCreation: msg.dateCreation,
              type: msg.type,
            };
          }
        }

        // Vérifier si en sourdine
        const estMuet = conv.muetPar.some(
          (id) => id.toString() === userId.toString()
        );

        return {
          _id: convObj._id,
          estGroupe: conv.estGroupe,
          nomGroupe: conv.nomGroupe,
          imageGroupe: conv.imageGroupe,
          participant: autreParticipant, // null pour les groupes
          participants: conv.estGroupe ? conv.participants : undefined,
          dernierMessage: dernierMessageDecrypte,
          messagesNonLus,
          estMuet,
          dateMiseAJour: conv.dateMiseAJour,
        };
      })
    );

    res.json({
      succes: true,
      data: {
        conversations: conversationsFormatees,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/messagerie/conversations/:conversationId
 * Messages d'une conversation
 */
export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.utilisateur!._id;
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new ErreurAPI('ID conversation invalide.', 400);
    }

    // Vérifier que la conversation existe et que l'utilisateur y participe
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'prenom nom avatar');

    if (!conversation) {
      throw new ErreurAPI('Conversation non trouvée.', 404);
    }

    if (!conversation.participants.some((p: any) => p._id.toString() === userId.toString())) {
      throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
    }

    // Récupérer les messages
    const [messages, total] = await Promise.all([
      Message.find({ conversation: conversationId })
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('expediteur', 'prenom nom avatar'),
      Message.countDocuments({ conversation: conversationId }),
    ]);

    // Marquer les messages comme lus
    await Message.updateMany(
      {
        conversation: conversationId,
        expediteur: { $ne: userId },
        lecteurs: { $ne: userId },
      },
      { $addToSet: { lecteurs: userId } }
    );

    // Transformer pour inclure le contenu déchiffré
    const messagesFormates = messages.map((msg) => ({
      _id: msg._id,
      expediteur: msg.expediteur,
      type: msg.type,
      contenu: msg.contenu, // Virtual qui déchiffre
      estLu: msg.lecteurs.length > 0,
      lecteurs: msg.lecteurs,
      dateCreation: msg.dateCreation,
      estMoi: (msg.expediteur as any)._id.toString() === userId.toString(),
    }));

    // Infos de la conversation
    const infoConversation = {
      _id: conversation._id,
      estGroupe: conversation.estGroupe,
      nomGroupe: conversation.nomGroupe,
      imageGroupe: conversation.imageGroupe,
      participants: conversation.participants,
    };

    res.json({
      succes: true,
      data: {
        conversation: infoConversation,
        messages: messagesFormates.reverse(), // Ordre chronologique
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/messagerie/envoyer
 * Envoyer un message (crée la conversation si nécessaire)
 */
export const envoyerMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaEnvoyerMessage.parse(req.body);
    const userId = req.utilisateur!._id;

    let conversation: any;

    // Si conversationId fourni, utiliser cette conversation
    if (donnees.conversationId) {
      if (!mongoose.Types.ObjectId.isValid(donnees.conversationId)) {
        throw new ErreurAPI('ID conversation invalide.', 400);
      }

      conversation = await Conversation.findById(donnees.conversationId);
      if (!conversation) {
        throw new ErreurAPI('Conversation non trouvée.', 404);
      }

      if (!conversation.participants.some((p: any) => p.toString() === userId.toString())) {
        throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
      }
    }
    // Sinon, créer ou trouver une conversation privée avec le destinataire
    else if (donnees.destinataireId) {
      if (!mongoose.Types.ObjectId.isValid(donnees.destinataireId)) {
        throw new ErreurAPI('ID destinataire invalide.', 400);
      }

      // Vérifier que le destinataire existe
      const destinataire = await Utilisateur.findById(donnees.destinataireId);
      if (!destinataire) {
        throw new ErreurAPI('Destinataire non trouvé.', 404);
      }

      // Empêcher de s'envoyer un message à soi-même
      if (donnees.destinataireId === userId.toString()) {
        throw new ErreurAPI('Vous ne pouvez pas vous envoyer un message.', 400);
      }

      // Trouver ou créer la conversation privée
      // Tri des participants pour garantir un ordre cohérent dans la requête
      const participantsTries = [userId.toString(), donnees.destinataireId].sort();

      // Chercher d'abord une conversation existante
      conversation = await Conversation.findOne({
        participants: { $all: participantsTries, $size: 2 },
        estGroupe: false,
      });

      // Si pas trouvée, créer une nouvelle conversation
      if (!conversation) {
        conversation = await Conversation.create({
          participants: participantsTries,
          estGroupe: false,
          admins: [],
          muetPar: [],
          dateMiseAJour: new Date(),
        });
      }
    } else {
      throw new ErreurAPI('conversationId ou destinataireId requis.', 400);
    }

    // Chiffrer le contenu du message
    const contenuCrypte = chiffrerMessage(donnees.contenu);

    // Créer le message
    const message = await Message.create({
      conversation: conversation._id,
      expediteur: userId,
      type: donnees.type as TypeMessage,
      contenuCrypte,
      lecteurs: [userId], // L'expéditeur a "lu" son propre message
    });

    // Mettre à jour la conversation
    conversation.dernierMessage = message._id;
    conversation.dateMiseAJour = new Date();
    await conversation.save();

    // Récupérer avec les infos de l'expéditeur
    const messageComplet = await Message.findById(message._id)
      .populate('expediteur', 'prenom nom avatar');

    res.status(201).json({
      succes: true,
      message: 'Message envoyé avec succès.',
      data: {
        message: {
          _id: messageComplet!._id,
          expediteur: messageComplet!.expediteur,
          type: messageComplet!.type,
          contenu: messageComplet!.contenu,
          dateCreation: messageComplet!.dateCreation,
          estMoi: true,
        },
        conversationId: conversation._id,
      },
    });
  } catch (error) {
    next(error);
  }
};

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

    // Vérifier que l'utilisateur est admin ou membre
    if (!groupe.participants.some((p) => p.toString() === userId.toString())) {
      throw new ErreurAPI('Vous ne faites pas partie de ce groupe.', 403);
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

    // Ajouter les participants
    groupe.participants.push(...nouveauxUtilisateurs.map((u) => u._id));
    groupe.dateMiseAJour = new Date();

    // Message système
    const noms = nouveauxUtilisateurs.map((u) => u.prenom).join(', ');
    const messageSysteme = await Message.create({
      conversation: groupe._id,
      expediteur: userId,
      type: 'systeme',
      contenuCrypte: chiffrerMessage(`${req.utilisateur!.prenom} a ajouté ${noms} au groupe`),
      lecteurs: [userId],
    });

    groupe.dernierMessage = messageSysteme._id;
    await groupe.save();

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

    // Retirer le participant
    groupe.participants = groupe.participants.filter(
      (p) => p.toString() !== participantId
    );
    groupe.admins = groupe.admins.filter(
      (a) => a.toString() !== participantId
    );

    // Si le groupe est vide, le supprimer
    if (groupe.participants.length === 0) {
      await Conversation.findByIdAndDelete(groupeId);
      await Message.deleteMany({ conversation: groupeId });

      res.json({
        succes: true,
        message: 'Groupe supprimé car vide.',
      });
      return;
    }

    // Si le créateur part, transférer à un autre admin ou premier membre
    if (groupe.createur?.toString() === participantId) {
      groupe.createur = groupe.admins[0] || groupe.participants[0];
      if (!groupe.admins.includes(groupe.createur)) {
        groupe.admins.push(groupe.createur);
      }
    }

    groupe.dateMiseAJour = new Date();

    // Message système
    const participantRetire = await Utilisateur.findById(participantId).select('prenom');
    const messageTexte = estSoiMeme
      ? `${participantRetire?.prenom || 'Un membre'} a quitté le groupe`
      : `${req.utilisateur!.prenom} a retiré ${participantRetire?.prenom || 'un membre'} du groupe`;

    const messageSysteme = await Message.create({
      conversation: groupe._id,
      expediteur: userId,
      type: 'systeme',
      contenuCrypte: chiffrerMessage(messageTexte),
      lecteurs: [userId],
    });

    groupe.dernierMessage = messageSysteme._id;
    await groupe.save();

    res.json({
      succes: true,
      message: estSoiMeme ? 'Vous avez quitté le groupe.' : 'Participant retiré.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/messagerie/conversations/:conversationId/muet
 * Toggle sourdine sur une conversation
 */
export const toggleMuet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new ErreurAPI('ID conversation invalide.', 400);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ErreurAPI('Conversation non trouvée.', 404);
    }

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
    }

    const estMuet = conversation.muetPar.some(
      (id) => id.toString() === userId.toString()
    );

    if (estMuet) {
      conversation.muetPar = conversation.muetPar.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      conversation.muetPar.push(userId);
    }

    await conversation.save();

    res.json({
      succes: true,
      message: estMuet ? 'Notifications activées.' : 'Conversation en sourdine.',
      data: { estMuet: !estMuet },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/messagerie/conversations/:conversationId/lire
 * Marquer tous les messages d'une conversation comme lus
 */
export const marquerConversationLue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new ErreurAPI('ID conversation invalide.', 400);
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ErreurAPI('Conversation non trouvée.', 404);
    }

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
    }

    // Marquer tous les messages non lus comme lus
    await Message.updateMany(
      {
        conversation: conversationId,
        expediteur: { $ne: userId },
        lecteurs: { $ne: userId },
      },
      { $addToSet: { lecteurs: userId } }
    );

    res.json({
      succes: true,
      message: 'Conversation marquée comme lue.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/messagerie/non-lus
 * Nombre de messages non lus total
 */
export const getNombreNonLus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    // Trouver toutes les conversations de l'utilisateur
    const conversations = await Conversation.find({
      participants: userId,
    }).select('_id');

    const conversationIds = conversations.map((c) => c._id);

    // Compter les messages non lus dans ces conversations
    const nombreNonLus = await Message.countDocuments({
      conversation: { $in: conversationIds },
      expediteur: { $ne: userId },
      lecteurs: { $ne: userId },
    });

    res.json({
      succes: true,
      data: {
        nombreNonLus,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/messagerie/conversation-privee/:userId
 * Obtenir ou créer une conversation privée avec un utilisateur
 */
export const getOuCreerConversationPrivee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId: autreUserId } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(autreUserId)) {
      throw new ErreurAPI('ID utilisateur invalide.', 400);
    }

    if (autreUserId === userId.toString()) {
      throw new ErreurAPI('Vous ne pouvez pas créer une conversation avec vous-même.', 400);
    }

    // Vérifier que l'autre utilisateur existe
    const autreUtilisateur = await Utilisateur.findById(autreUserId).select('prenom nom avatar');
    if (!autreUtilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    // Trouver ou créer la conversation privée
    const participantsTries = [userId.toString(), autreUserId].sort();

    // Chercher d'abord une conversation existante
    let conversation = await Conversation.findOne({
      participants: { $all: participantsTries, $size: 2 },
      estGroupe: false,
    });

    // Si pas trouvée, créer une nouvelle conversation
    if (!conversation) {
      conversation = await Conversation.create({
        participants: participantsTries,
        estGroupe: false,
        admins: [],
        muetPar: [],
        dateMiseAJour: new Date(),
      });
    }

    // Peupler les participants
    const conversationPeuplee = await Conversation.findById(conversation._id)
      .populate('participants', 'prenom nom avatar');

    res.json({
      succes: true,
      data: {
        conversation: conversationPeuplee,
        participant: autreUtilisateur,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/messagerie/rechercher-utilisateurs
 * Rechercher des utilisateurs pour démarrer une conversation
 */
export const rechercherUtilisateurs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { q } = req.query;
    const userId = req.utilisateur!._id;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({
        succes: true,
        data: { utilisateurs: [] },
      });
      return;
    }

    // Limiter la longueur et échapper les caractères spéciaux regex (protection ReDoS)
    const recherche = escapeRegex(q.trim().slice(0, 100));

    const utilisateurs = await Utilisateur.find({
      _id: { $ne: userId },
      $or: [
        { prenom: { $regex: recherche, $options: 'i' } },
        { nom: { $regex: recherche, $options: 'i' } },
        { email: { $regex: recherche, $options: 'i' } },
      ],
    })
      .select('prenom nom avatar')
      .limit(20);

    res.json({
      succes: true,
      data: { utilisateurs },
    });
  } catch (error) {
    next(error);
  }
};
