import { Request, Response } from 'express';
import Notification from '../models/Notification.js';

/**
 * GET /api/notifications
 * Mes notifications
 */
export const mesNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.min(1000, Math.max(1, parseInt(page as string, 10)));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const userId = req.utilisateur!._id;

    const [notifications, total, nonLues] = await Promise.all([
      Notification.find({ destinataire: userId })
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments({ destinataire: userId }),
      Notification.countDocuments({ destinataire: userId, lue: false }),
    ]);

    res.json({
      succes: true,
      data: {
        notifications,
        nonLues,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur mesNotifications:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * PATCH /api/notifications/:id/lue
 * Marquer une notification comme lue
 */
export const marquerLue = async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, destinataire: req.utilisateur!._id },
      { lue: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ succes: false, message: 'Notification non trouvée.' });
      return;
    }

    res.json({ succes: true, data: { notification } });
  } catch (error) {
    console.error('Erreur marquerLue:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * PATCH /api/notifications/lire-tout
 * Marquer toutes les notifications comme lues
 */
export const marquerToutLu = async (req: Request, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { destinataire: req.utilisateur!._id, lue: false },
      { lue: true }
    );

    res.json({ succes: true, message: 'Toutes les notifications ont été marquées comme lues.' });
  } catch (error) {
    console.error('Erreur marquerToutLu:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 */
export const supprimerNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      destinataire: req.utilisateur!._id,
    });

    if (!notification) {
      res.status(404).json({ succes: false, message: 'Notification non trouvée.' });
      return;
    }

    res.json({ succes: true, message: 'Notification supprimée.' });
  } catch (error) {
    console.error('Erreur supprimerNotification:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * DELETE /api/notifications
 * Supprimer toutes les notifications
 */
export const supprimerToutesNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    await Notification.deleteMany({ destinataire: req.utilisateur!._id });

    res.json({ succes: true, message: 'Toutes les notifications ont été supprimées.' });
  } catch (error) {
    console.error('Erreur supprimerToutesNotifications:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
