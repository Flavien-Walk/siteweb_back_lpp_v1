import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Message, Conversation } from '../../models/Message.js';
import Utilisateur from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';

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
            let contenuAffiche = msg.contenu;
            if (msg.type === 'image') {
              contenuAffiche = '📷 Photo';
            } else if (msg.type === 'video') {
              contenuAffiche = '🎬 Vidéo';
            }
            dernierMessageDecrypte = {
              contenu: contenuAffiche,
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
    const pageNum = Math.min(1000, Math.max(1, parseInt(page as string, 10)));
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

    // Récupérer les messages avec replyTo et reactions
    const [messages, total] = await Promise.all([
      Message.find({ conversation: conversationId })
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('expediteur', 'prenom nom avatar')
        .populate({
          path: 'replyTo',
          select: 'contenuCrypte expediteur type',
          populate: { path: 'expediteur', select: 'prenom nom' },
        })
        .populate('reactions.userId', 'prenom nom avatar'),
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

    // Transformer pour inclure le contenu déchiffré, replyTo et reactions
    const messagesFormates = messages.map((msg) => {
      // Formatter replyTo si présent
      let replyToData = null;
      if (msg.replyTo) {
        const replyMsg = msg.replyTo as any;
        replyToData = {
          _id: replyMsg._id,
          contenu: replyMsg.contenu,
          expediteur: replyMsg.expediteur,
          type: replyMsg.type,
        };
      }

      // Formatter reactions
      const reactionsFormatted = (msg.reactions || []).map((r: any) => ({
        userId: r.userId?._id || r.userId,
        user: r.userId && typeof r.userId === 'object' ? {
          _id: r.userId._id,
          prenom: r.userId.prenom,
          nom: r.userId.nom,
          avatar: r.userId.avatar,
        } : null,
        type: r.type,
        createdAt: r.createdAt,
      }));

      return {
        _id: msg._id,
        expediteur: msg.expediteur,
        type: msg.type,
        contenu: msg.contenu, // Virtual qui déchiffre
        estLu: msg.lecteurs.length > 0,
        lecteurs: msg.lecteurs,
        dateCreation: msg.dateCreation,
        replyTo: replyToData,
        reactions: reactionsFormatted,
        estMoi: (msg.expediteur as any)._id.toString() === userId.toString(),
      };
    });

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

    // Atomic: toggle mute without read-modify-write race
    if (estMuet) {
      await Conversation.findByIdAndUpdate(conversationId, { $pull: { muetPar: userId } });
    } else {
      await Conversation.findByIdAndUpdate(conversationId, { $addToSet: { muetPar: userId } });
    }

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
