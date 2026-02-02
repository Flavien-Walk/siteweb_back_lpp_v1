import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ActivityLog, { ActivitySource } from '../models/ActivityLog.js';
import Publication from '../models/Publication.js';

/**
 * Extraire la source depuis la requête
 */
const extractSource = (req: Request): ActivitySource => {
  // 1. Source dans le body de la requête
  if (req.body?.source && ['web', 'mobile', 'api'].includes(req.body.source)) {
    return req.body.source as ActivitySource;
  }

  // 2. Header X-Activity-Source
  const headerSource = req.headers['x-activity-source'];
  if (headerSource && ['web', 'mobile', 'api'].includes(headerSource as string)) {
    return headerSource as ActivitySource;
  }

  // 3. Détecter automatiquement via User-Agent
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  if (userAgent.includes('expo') || userAgent.includes('react-native') || userAgent.includes('okhttp')) {
    return 'mobile';
  }

  // 4. Défaut: web
  return 'web';
};

/**
 * POST /api/activity/share
 * Logger un partage de publication
 */
export const logShare = async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicationId } = req.body;
    const utilisateur = req.utilisateur!;

    // Validation
    if (!publicationId || !mongoose.Types.ObjectId.isValid(publicationId)) {
      res.status(400).json({
        succes: false,
        message: 'ID de publication invalide.',
      });
      return;
    }

    // Vérifier que la publication existe
    const publication = await Publication.findById(publicationId);
    if (!publication) {
      res.status(404).json({
        succes: false,
        message: 'Publication non trouvée.',
      });
      return;
    }

    // Créer le log d'activité
    const activityLog = await ActivityLog.logActivity({
      actor: utilisateur._id,
      actorRole: utilisateur.role,
      action: 'share',
      targetType: 'publication',
      targetId: new mongoose.Types.ObjectId(publicationId),
      source: extractSource(req),
      metadata: {
        publicationAuthor: publication.auteur.toString(),
      },
    });

    res.status(201).json({
      succes: true,
      message: 'Partage enregistré.',
      data: {
        logged: true,
        activityId: activityLog._id,
      },
    });
  } catch (error) {
    console.error('Erreur logShare:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/activity/stats/:targetType/:targetId
 * Statistiques d'activité pour une cible (staff uniquement)
 */
export const getActivityStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetType, targetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      res.status(400).json({
        succes: false,
        message: 'ID invalide.',
      });
      return;
    }

    const stats = await ActivityLog.aggregate([
      {
        $match: {
          targetType,
          targetId: new mongoose.Types.ObjectId(targetId),
        },
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          lastActivity: { $max: '$dateCreation' },
        },
      },
    ]);

    const result = stats.reduce(
      (acc, stat) => {
        acc[stat._id] = { count: stat.count, lastActivity: stat.lastActivity };
        return acc;
      },
      {} as Record<string, { count: number; lastActivity: Date }>
    );

    res.json({
      succes: true,
      data: {
        targetType,
        targetId,
        stats: result,
      },
    });
  } catch (error) {
    console.error('Erreur getActivityStats:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/activity/user/:userId
 * Historique d'activité d'un utilisateur (staff uniquement)
 */
export const getUserActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '20', action } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        succes: false,
        message: 'ID utilisateur invalide.',
      });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {
      actor: new mongoose.Types.ObjectId(userId),
    };

    if (action && ['share', 'view', 'bookmark', 'click'].includes(action as string)) {
      filter.action = action;
    }

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      succes: true,
      data: {
        activities,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Erreur getUserActivity:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
