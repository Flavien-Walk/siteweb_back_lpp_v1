import { Request, Response } from 'express';
import Notification from '../models/Notification.js';
import BroadcastNotification from '../models/BroadcastNotification.js';
import Utilisateur from '../models/Utilisateur.js';
import type { BroadcastBadge } from '../models/BroadcastNotification.js';

const VALID_BADGES: BroadcastBadge[] = ['actu', 'maintenance', 'mise_a_jour', 'evenement', 'important'];

const badgeLabels: Record<BroadcastBadge, string> = {
  actu: 'Actualité',
  maintenance: 'Maintenance',
  mise_a_jour: 'Mise à jour',
  evenement: 'Événement',
  important: 'Important',
};

/**
 * POST /api/admin/notifications/broadcast
 * Envoyer une notification broadcast à tous les utilisateurs
 * Requiert: admin_modo ou super_admin
 */
export const sendBroadcast = async (req: Request, res: Response): Promise<void> => {
  try {
    const { titre, message, badge } = req.body;
    const sender = req.utilisateur!;

    // Validation
    if (!titre || typeof titre !== 'string' || titre.trim().length < 3) {
      res.status(400).json({ succes: false, message: 'Le titre doit contenir au moins 3 caractères.' });
      return;
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      res.status(400).json({ succes: false, message: 'Le message doit contenir au moins 5 caractères.' });
      return;
    }

    if (!badge || !VALID_BADGES.includes(badge)) {
      res.status(400).json({ succes: false, message: 'Badge invalide. Valeurs acceptées: ' + VALID_BADGES.join(', ') });
      return;
    }

    // Créer l'entrée broadcast (historique)
    const broadcast = await BroadcastNotification.create({
      titre: titre.trim(),
      message: message.trim(),
      badge,
      sentBy: sender._id,
    });

    // Récupérer tous les utilisateurs non bannis
    const users = await Utilisateur.find(
      { bannedAt: null },
      { _id: 1 }
    ).lean();

    // Créer une notification pour chaque utilisateur
    const notifications = users.map((user) => ({
      destinataire: user._id,
      type: 'broadcast' as const,
      titre: titre.trim(),
      message: message.trim(),
      data: {
        broadcastBadge: badge,
        broadcastId: broadcast._id.toString(),
        actorId: sender._id.toString(),
        actorRole: sender.role,
      },
      lue: false,
    }));

    // Insérer en batch
    if (notifications.length > 0) {
      await Notification.insertMany(notifications, { ordered: false });
    }

    // Mettre à jour le compteur
    broadcast.recipientCount = notifications.length;
    await broadcast.save();

    res.status(201).json({
      succes: true,
      message: `Notification envoyée à ${notifications.length} utilisateur(s).`,
      data: {
        broadcastId: broadcast._id,
        recipientCount: notifications.length,
      },
    });
  } catch (error) {
    console.error('Erreur sendBroadcast:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/admin/notifications/broadcast
 * Historique des notifications broadcast envoyées
 */
export const listBroadcasts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total] = await Promise.all([
      BroadcastNotification.find()
        .populate('sentBy', 'prenom nom role avatar')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum),
      BroadcastNotification.countDocuments(),
    ]);

    res.json({
      succes: true,
      data: {
        notifications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur listBroadcasts:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
