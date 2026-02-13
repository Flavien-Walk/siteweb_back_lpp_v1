import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import StaffMessage from '../models/StaffChat.js';
import Utilisateur from '../models/Utilisateur.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// ============ SCHEMAS DE VALIDATION ============

const schemaEnvoyerMessage = z.object({
  content: z.string().min(1).max(2000),
  linkedReportId: z.string().optional(),
});

const schemaEnvoyerDM = z.object({
  content: z.string().min(1).max(2000),
});

// ============ CONTROLLERS - CHAT GROUPE ============

/**
 * Récupérer les messages du staff chat (groupe uniquement)
 * GET /api/admin/staff-chat
 */
export const getStaffMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const before = req.query.before as string; // ID du message avant lequel charger (pagination)

    // Exclure les DMs du chat de groupe
    const filter: Record<string, unknown> = { recipient: null };
    if (before && mongoose.Types.ObjectId.isValid(before)) {
      const beforeMessage = await StaffMessage.findById(before);
      if (beforeMessage) {
        filter.dateCreation = { $lt: beforeMessage.dateCreation };
      }
    }

    const messages = await StaffMessage.find(filter)
      .sort({ dateCreation: -1 })
      .limit(limit)
      .populate('sender', '_id prenom nom avatar role')
      .populate('linkedReport', '_id targetType reason status')
      .lean();

    // Inverser pour avoir l'ordre chronologique
    messages.reverse();

    res.status(200).json({
      succes: true,
      data: {
        messages,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Envoyer un message dans le staff chat (groupe)
 * POST /api/admin/staff-chat
 */
export const sendStaffMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaEnvoyerMessage.parse(req.body);
    const senderId = req.utilisateur!._id;

    // Vérifier le lien avec un report si fourni
    let linkedReport: mongoose.Types.ObjectId | undefined;
    if (donnees.linkedReportId) {
      if (!mongoose.Types.ObjectId.isValid(donnees.linkedReportId)) {
        throw new ErreurAPI('ID de signalement invalide', 400);
      }
      linkedReport = new mongoose.Types.ObjectId(donnees.linkedReportId);
    }

    const message = await StaffMessage.create({
      sender: senderId,
      recipient: null,
      type: linkedReport ? 'report_link' : 'text',
      content: donnees.content,
      linkedReport,
      readBy: [senderId], // L'expéditeur a déjà "lu" son message
    });

    // Populer les références pour la réponse
    await message.populate('sender', '_id prenom nom avatar role');
    if (linkedReport) {
      await message.populate('linkedReport', '_id targetType reason status');
    }

    res.status(201).json({
      succes: true,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marquer des messages comme lus
 * POST /api/admin/staff-chat/read
 */
export const markMessagesAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messageIds } = req.body;
    const userId = req.utilisateur!._id;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new ErreurAPI('Liste de messages invalide', 400);
    }

    // Valider les IDs
    const validIds = messageIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      throw new ErreurAPI('Aucun ID valide fourni', 400);
    }

    // Ajouter l'utilisateur à readBy pour tous les messages
    await StaffMessage.updateMany(
      {
        _id: { $in: validIds.map((id) => new mongoose.Types.ObjectId(id)) },
        readBy: { $ne: userId }, // Éviter les doublons
      },
      {
        $push: { readBy: userId },
      }
    );

    res.status(200).json({
      succes: true,
      message: 'Messages marqués comme lus.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir le nombre de messages non lus (groupe + DM séparés)
 * GET /api/admin/staff-chat/unread-count
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    // Messages de groupe non lus
    const groupCount = await StaffMessage.countDocuments({
      recipient: null,
      readBy: { $ne: userId },
    });

    // DMs non lus (messages dont je suis le destinataire)
    const dmCount = await StaffMessage.countDocuments({
      recipient: userId,
      readBy: { $ne: userId },
    });

    res.status(200).json({
      succes: true,
      data: { unreadCount: groupCount + dmCount, groupUnread: groupCount, dmUnread: dmCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Créer un message système (utilisé par d'autres contrôleurs)
 */
export const createSystemMessage = async (
  content: string,
  senderId: mongoose.Types.ObjectId,
  linkedReportId?: mongoose.Types.ObjectId
): Promise<void> => {
  try {
    await StaffMessage.create({
      sender: senderId,
      recipient: null,
      type: 'system',
      content,
      linkedReport: linkedReportId,
      readBy: [senderId],
    });
  } catch (error) {
    console.error('[StaffChat] Erreur création message système:', error);
  }
};

/**
 * Supprimer un message du staff chat
 * DELETE /api/admin/staff-chat/:id
 *
 * Un utilisateur peut supprimer ses propres messages.
 * Un admin_modo ou super_admin peut supprimer n'importe quel message.
 */
export const deleteStaffMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const messageId = req.params.id;
    const user = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ErreurAPI('ID de message invalide', 400);
    }

    const message = await StaffMessage.findById(messageId);
    if (!message) {
      throw new ErreurAPI('Message non trouvé', 404);
    }

    // Vérifier les permissions
    const isOwner = message.sender.toString() === user._id.toString();
    const isAdmin = user.role === 'admin_modo' || user.role === 'super_admin';

    if (!isOwner && !isAdmin) {
      throw new ErreurAPI('Vous ne pouvez supprimer que vos propres messages', 403);
    }

    await message.deleteOne();

    res.status(200).json({
      succes: true,
      message: 'Message supprimé.',
    });
  } catch (error) {
    next(error);
  }
};

// ============ CONTROLLERS - MESSAGES PRIVES (DM) ============

/**
 * Lister les conversations privées de l'utilisateur connecté
 * GET /api/admin/staff-chat/dm
 *
 * Retourne la liste des utilisateurs avec qui on a des conversations,
 * avec le dernier message et le nombre de non-lus.
 */
export const getDMConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    // Trouver tous les messages DM où l'utilisateur est sender ou recipient
    const conversations = await StaffMessage.aggregate([
      {
        $match: {
          recipient: { $ne: null },
          $or: [
            { sender: userId },
            { recipient: userId },
          ],
        },
      },
      {
        // Déterminer l'autre participant
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ['$sender', userId] },
              then: '$recipient',
              else: '$sender',
            },
          },
        },
      },
      {
        $sort: { dateCreation: -1 },
      },
      {
        // Grouper par l'autre utilisateur
        $group: {
          _id: '$otherUser',
          lastMessage: { $first: '$$ROOT' },
          totalMessages: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ['$sender', userId] },
                    { $not: { $in: [userId, '$readBy'] } },
                  ],
                },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },
      {
        $sort: { 'lastMessage.dateCreation': -1 },
      },
      {
        $lookup: {
          from: 'utilisateurs',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { _id: 1, prenom: 1, nom: 1, avatar: 1, role: 1 } },
          ],
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          user: 1,
          lastMessage: {
            _id: '$lastMessage._id',
            content: '$lastMessage.content',
            sender: '$lastMessage.sender',
            dateCreation: '$lastMessage.dateCreation',
          },
          totalMessages: 1,
          unreadCount: 1,
        },
      },
    ]);

    res.status(200).json({
      succes: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les messages d'une conversation privée
 * GET /api/admin/staff-chat/dm/:userId
 */
export const getDMMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentUserId = req.utilisateur!._id;
    const otherUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const otherUserOid = new mongoose.Types.ObjectId(otherUserId);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const before = req.query.before as string;

    const filter: Record<string, unknown> = {
      recipient: { $ne: null },
      $or: [
        { sender: currentUserId, recipient: otherUserOid },
        { sender: otherUserOid, recipient: currentUserId },
      ],
    };

    if (before && mongoose.Types.ObjectId.isValid(before)) {
      const beforeMessage = await StaffMessage.findById(before);
      if (beforeMessage) {
        filter.dateCreation = { $lt: beforeMessage.dateCreation };
      }
    }

    const messages = await StaffMessage.find(filter)
      .sort({ dateCreation: -1 })
      .limit(limit)
      .populate('sender', '_id prenom nom avatar role')
      .populate('recipient', '_id prenom nom avatar role')
      .lean();

    // Inverser pour l'ordre chronologique
    messages.reverse();

    // Marquer automatiquement les messages reçus comme lus
    const unreadIds = messages
      .filter((m: any) =>
        m.sender._id.toString() !== currentUserId.toString() &&
        !m.readBy?.some((id: any) => id.toString() === currentUserId.toString())
      )
      .map((m: any) => m._id);

    if (unreadIds.length > 0) {
      await StaffMessage.updateMany(
        { _id: { $in: unreadIds }, readBy: { $ne: currentUserId } },
        { $push: { readBy: currentUserId } }
      );
    }

    // Infos sur l'autre utilisateur
    const otherUser = await Utilisateur.findById(otherUserOid)
      .select('_id prenom nom avatar role')
      .lean();

    res.status(200).json({
      succes: true,
      data: {
        messages,
        otherUser,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Envoyer un message privé
 * POST /api/admin/staff-chat/dm/:userId
 */
export const sendDMMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaEnvoyerDM.parse(req.body);
    const senderId = req.utilisateur!._id;
    const recipientId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      throw new ErreurAPI('ID destinataire invalide', 400);
    }

    // Vérifier que le destinataire existe et est staff
    const recipient = await Utilisateur.findById(recipientId).select('role').lean();
    if (!recipient) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    const staffRoles = ['super_admin', 'admin_modo', 'modo', 'modo_test'];
    if (!staffRoles.includes(recipient.role)) {
      throw new ErreurAPI('Vous ne pouvez envoyer des DM qu\'aux membres du staff', 403);
    }

    // Ne pas envoyer de DM à soi-même
    if (senderId.toString() === recipientId) {
      throw new ErreurAPI('Vous ne pouvez pas vous envoyer un message à vous-même', 400);
    }

    const message = await StaffMessage.create({
      sender: senderId,
      recipient: new mongoose.Types.ObjectId(recipientId),
      type: 'text',
      content: donnees.content,
      readBy: [senderId],
    });

    await message.populate('sender', '_id prenom nom avatar role');
    await message.populate('recipient', '_id prenom nom avatar role');

    res.status(201).json({
      succes: true,
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};
