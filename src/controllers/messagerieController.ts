import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Message, Conversation, chiffrerMessage } from '../models/Message.js';
import Utilisateur from '../models/Utilisateur.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// Schéma pour envoyer un message
const schemaEnvoyerMessage = z.object({
  destinataireId: z.string().min(1, 'Le destinataire est requis'),
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères')
    .trim(),
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
      .populate({
        path: 'dernierMessage',
        select: 'contenuCrypte expediteur dateCreation lu',
      });

    // Transformer pour ajouter les infos utiles
    const conversationsFormatees = await Promise.all(
      conversations.map(async (conv) => {
        const convObj = conv.toObject();
        const autreParticipant = conv.participants.find(
          (p: { _id: mongoose.Types.ObjectId }) => p._id.toString() !== userId.toString()
        );

        // Compter les messages non lus
        const messagesNonLus = await Message.countDocuments({
          destinataire: userId,
          expediteur: autreParticipant?._id,
          lu: false,
        });

        // Déchiffrer le dernier message si existe
        let dernierMessageDecrypte = null;
        if (conv.dernierMessage) {
          const msg = await Message.findById(conv.dernierMessage._id);
          if (msg) {
            dernierMessageDecrypte = {
              contenu: msg.contenu, // Virtual qui déchiffre
              expediteur: msg.expediteur,
              dateCreation: msg.dateCreation,
              lu: msg.lu,
            };
          }
        }

        return {
          _id: convObj._id,
          participant: autreParticipant,
          dernierMessage: dernierMessageDecrypte,
          messagesNonLus,
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
 * GET /api/messagerie/conversations/:userId
 * Messages d'une conversation avec un utilisateur
 */
export const getMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId: autreUserId } = req.params;
    const userId = req.utilisateur!._id;
    const { page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(autreUserId)) {
      throw new ErreurAPI('ID utilisateur invalide.', 400);
    }

    // Vérifier que l'autre utilisateur existe
    const autreUtilisateur = await Utilisateur.findById(autreUserId).select('prenom nom avatar');
    if (!autreUtilisateur) {
      throw new ErreurAPI('Utilisateur non trouvé.', 404);
    }

    // Récupérer les messages entre les deux utilisateurs
    const [messages, total] = await Promise.all([
      Message.find({
        $or: [
          { expediteur: userId, destinataire: autreUserId },
          { expediteur: autreUserId, destinataire: userId },
        ],
      })
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('expediteur', 'prenom nom avatar'),
      Message.countDocuments({
        $or: [
          { expediteur: userId, destinataire: autreUserId },
          { expediteur: autreUserId, destinataire: userId },
        ],
      }),
    ]);

    // Marquer les messages reçus comme lus
    await Message.updateMany(
      { expediteur: autreUserId, destinataire: userId, lu: false },
      { lu: true }
    );

    // Transformer pour inclure le contenu déchiffré
    const messagesFormates = messages.map((msg) => ({
      _id: msg._id,
      expediteur: msg.expediteur,
      contenu: msg.contenu, // Virtual qui déchiffre
      lu: msg.lu,
      dateCreation: msg.dateCreation,
      estMoi: msg.expediteur._id.toString() === userId.toString(),
    }));

    res.json({
      succes: true,
      data: {
        participant: autreUtilisateur,
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
 * Envoyer un message
 */
export const envoyerMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaEnvoyerMessage.parse(req.body);
    const userId = req.utilisateur!._id;

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

    // Chiffrer le contenu du message
    const contenuCrypte = chiffrerMessage(donnees.contenu);

    // Créer le message
    const message = await Message.create({
      expediteur: userId,
      destinataire: donnees.destinataireId,
      contenuCrypte,
      lu: false,
    });

    // Trouver ou créer la conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, donnees.destinataireId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, donnees.destinataireId],
        dernierMessage: message._id,
        dateMiseAJour: new Date(),
      });
    } else {
      conversation.dernierMessage = message._id;
      conversation.dateMiseAJour = new Date();
      await conversation.save();
    }

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
          contenu: messageComplet!.contenu, // Virtual qui déchiffre
          lu: messageComplet!.lu,
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

    // Vérifier que l'utilisateur fait partie de la conversation
    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
    }

    // Trouver l'autre participant
    const autreParticipant = conversation.participants.find(
      (p) => p.toString() !== userId.toString()
    );

    // Marquer tous les messages de l'autre comme lus
    await Message.updateMany(
      { expediteur: autreParticipant, destinataire: userId, lu: false },
      { lu: true }
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
 * Nombre de messages non lus
 */
export const getNombreNonLus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    const nombreNonLus = await Message.countDocuments({
      destinataire: userId,
      lu: false,
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
