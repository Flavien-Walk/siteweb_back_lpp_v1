import { Request, Response } from 'express';
import Notification from '../models/Notification.js';
import Utilisateur from '../models/Utilisateur.js';
import UserPreferences from '../models/UserPreferences.js';
import { envoyerPushNotification } from '../services/pushService.js';

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
        .limit(limitNum)
        .lean(),
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
 * POST /api/notifications/push-token
 * Enregistrer un push token Expo (upsert par deviceId)
 */
export const enregistrerPushToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, platform, deviceId } = req.body;

    // Validation format ExponentPushToken
    if (!token || !/^ExponentPushToken\[.+\]$/.test(token)) {
      res.status(400).json({ succes: false, message: 'Token push invalide. Format attendu: ExponentPushToken[...]' });
      return;
    }

    if (!platform || !['ios', 'android'].includes(platform)) {
      res.status(400).json({ succes: false, message: 'Plateforme invalide. Valeurs acceptées: ios, android' });
      return;
    }

    if (!deviceId) {
      res.status(400).json({ succes: false, message: 'deviceId requis.' });
      return;
    }

    const userId = req.utilisateur!._id;

    // Upsert : si le deviceId existe déjà, mettre à jour le token
    await Utilisateur.updateOne(
      { _id: userId },
      {
        $pull: { pushTokens: { deviceId } },
      }
    );

    await Utilisateur.updateOne(
      { _id: userId },
      {
        $push: {
          pushTokens: { token, platform, deviceId, lastSeenAt: new Date() },
        },
      }
    );

    res.json({ succes: true, message: 'Push token enregistré.' });
  } catch (error) {
    console.error('Erreur enregistrerPushToken:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * DELETE /api/notifications/push-token
 * Supprimer un push token (logout / désinscription)
 */
export const supprimerPushToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, deviceId } = req.body;

    if (!token && !deviceId) {
      res.status(400).json({ succes: false, message: 'Token ou deviceId requis.' });
      return;
    }

    const userId = req.utilisateur!._id;
    const pullFilter: Record<string, string> = {};
    if (token) pullFilter.token = token;
    if (deviceId) pullFilter.deviceId = deviceId;

    await Utilisateur.updateOne(
      { _id: userId },
      { $pull: { pushTokens: pullFilter } }
    );

    res.json({ succes: true, message: 'Push token supprimé.' });
  } catch (error) {
    console.error('Erreur supprimerPushToken:', error);
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

/**
 * GET /api/notifications/preferences
 * Récupérer les préférences de notifications push
 */
export const getPreferencesNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    let prefs = await UserPreferences.findOne({ utilisateur: userId });
    if (!prefs) {
      prefs = await UserPreferences.create({ utilisateur: userId });
    }

    res.json({
      succes: true,
      data: {
        messages: prefs.notificationsPush?.messages ?? true,
        activite: prefs.notificationsPush?.activite ?? true,
        recommandations: prefs.notificationsPush?.recommandations ?? true,
      },
    });
  } catch (error) {
    console.error('Erreur getPreferencesNotifications:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * PATCH /api/notifications/preferences
 * Mettre à jour les préférences de notifications push
 */
export const majPreferencesNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const { messages, activite, recommandations } = req.body;

    const update: Record<string, boolean> = {};
    if (typeof messages === 'boolean') update['notificationsPush.messages'] = messages;
    if (typeof activite === 'boolean') update['notificationsPush.activite'] = activite;
    if (typeof recommandations === 'boolean') update['notificationsPush.recommandations'] = recommandations;

    if (Object.keys(update).length === 0) {
      res.status(400).json({ succes: false, message: 'Aucune préférence à mettre à jour.' });
      return;
    }

    await UserPreferences.findOneAndUpdate(
      { utilisateur: userId },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({ succes: true, message: 'Préférences mises à jour.' });
  } catch (error) {
    console.error('Erreur majPreferencesNotifications:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/notifications/test-push
 * Envoyer une push de test à soi-même (diagnostic)
 */
export const testPush = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    // Vérifier si l'utilisateur a des push tokens
    const user = await Utilisateur.findById(userId).select('+pushTokens').lean();
    const tokens = user?.pushTokens || [];

    console.log(`[PUSH TEST] User ${userId} — ${tokens.length} token(s) enregistré(s)`);
    if (tokens.length > 0) {
      console.log(`[PUSH TEST] Tokens:`, tokens.map((t: any) => ({ token: t.token, platform: t.platform, deviceId: t.deviceId })));
    }

    if (tokens.length === 0) {
      res.json({
        succes: false,
        message: 'Aucun push token enregistré pour cet utilisateur.',
        diagnostic: {
          userId: userId.toString(),
          tokensCount: 0,
          conseil: 'Le mobile doit appeler POST /api/notifications/push-token au login.',
        },
      });
      return;
    }

    // Envoyer une push de test (skipSmartDelivery pour forcer même si connecté socket)
    await envoyerPushNotification(userId.toString(), {
      titre: 'Test Push LPP',
      message: 'Si tu vois ceci, les push notifications fonctionnent !',
      type: 'test',
      data: {},
      categorie: 'activite',
      skipSmartDelivery: true,
    });

    res.json({
      succes: true,
      message: 'Push de test envoyée.',
      diagnostic: {
        userId: userId.toString(),
        tokensCount: tokens.length,
        tokens: tokens.map((t: any) => ({ platform: t.platform, deviceId: t.deviceId, lastSeenAt: t.lastSeenAt })),
      },
    });
  } catch (error) {
    console.error('Erreur testPush:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
