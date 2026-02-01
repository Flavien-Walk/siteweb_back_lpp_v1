import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import StaffMessage from '../models/StaffChat.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// ============ SCHEMAS DE VALIDATION ============

const schemaEnvoyerMessage = z.object({
  content: z.string().min(1).max(2000),
  linkedReportId: z.string().optional(),
});

// ============ CONTROLLERS ============

/**
 * Récupérer les messages du staff chat
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

    const filter: Record<string, unknown> = {};
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
 * Envoyer un message dans le staff chat
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
 * Obtenir le nombre de messages non lus
 * GET /api/admin/staff-chat/unread-count
 */
export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    const count = await StaffMessage.countDocuments({
      readBy: { $ne: userId },
    });

    res.status(200).json({
      succes: true,
      data: { unreadCount: count },
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
      type: 'system',
      content,
      linkedReport: linkedReportId,
      readBy: [senderId],
    });
  } catch (error) {
    console.error('[StaffChat] Erreur création message système:', error);
  }
};
