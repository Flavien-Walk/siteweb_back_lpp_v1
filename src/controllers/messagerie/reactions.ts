import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Message, Conversation } from '../../models/Message.js';
import Utilisateur from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { escapeRegex } from '../../utils/strings.js';

// Schéma pour réagir à un message
const schemaReagirMessage = z.object({
  reactionType: z.enum(['heart', 'laugh', 'wow', 'sad', 'angry', 'like']).nullable(),
});

/**
 * POST /api/messagerie/messages/:messageId/react
 * Ajouter ou supprimer une réaction sur un message
 */
export const reagirMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const donnees = schemaReagirMessage.parse(req.body);
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ErreurAPI('ID message invalide.', 400);
    }

    // Récupérer le message
    const message = await Message.findById(messageId);
    if (!message) {
      throw new ErreurAPI('Message non trouvé.', 404);
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    const conversation = await Conversation.findById(message.conversation);
    if (!conversation || !conversation.participants.some((p) => p.toString() === userId.toString())) {
      throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
    }

    // Atomic reaction management — remove existing, then add new if needed
    const existingReaction = message.reactions.find(
      (r) => r.userId.toString() === userId.toString()
    );

    if (donnees.reactionType === null) {
      // Remove reaction atomically
      if (existingReaction) {
        await Message.findByIdAndUpdate(messageId, {
          $pull: { reactions: { userId } },
        });
      }
    } else if (existingReaction) {
      if (existingReaction.type === donnees.reactionType) {
        // Same reaction = toggle off
        await Message.findByIdAndUpdate(messageId, {
          $pull: { reactions: { userId } },
        });
      } else {
        // Different reaction = replace atomically (pull then push)
        await Message.findByIdAndUpdate(messageId, {
          $pull: { reactions: { userId } },
        });
        await Message.findByIdAndUpdate(messageId, {
          $push: { reactions: { userId, type: donnees.reactionType, createdAt: new Date() } },
        });
      }
    } else {
      // New reaction
      await Message.findByIdAndUpdate(messageId, {
        $push: { reactions: { userId, type: donnees.reactionType, createdAt: new Date() } },
      });
    }

    // Récupérer le message avec les reactions peuplées
    const messageUpdated = await Message.findById(messageId)
      .populate('reactions.userId', 'prenom nom avatar');

    // Formatter les réactions
    const reactionsFormatted = (messageUpdated!.reactions || []).map((r: any) => ({
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

    res.json({
      succes: true,
      message: 'Réaction mise à jour.',
      data: {
        messageId: message._id,
        reactions: reactionsFormatted,
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
