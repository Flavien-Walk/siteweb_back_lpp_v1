import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

/**
 * Lister les audit logs avec filtres
 * GET /api/admin/audit
 */
export const listAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    // Filtres
    const filter: Record<string, unknown> = {};

    // Filtre par acteur
    const actorId = req.query.actorId as string;
    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
      filter.actor = new mongoose.Types.ObjectId(actorId);
    }

    // Filtre par action
    const action = req.query.action as string;
    if (action) {
      filter.action = action;
    }

    // Filtre par type de cible
    const targetType = req.query.targetType as string;
    if (targetType) {
      filter.targetType = targetType;
    }

    // Filtre par cible specifique
    const targetId = req.query.targetId as string;
    if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
      filter.targetId = new mongoose.Types.ObjectId(targetId);
    }

    // Filtre par plage de dates
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (dateFrom || dateTo) {
      filter.dateCreation = {} as Record<string, Date>;
      if (dateFrom) {
        (filter.dateCreation as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (filter.dateCreation as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', '_id prenom nom avatar role')
        .populate('relatedReport', '_id targetType reason status')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir un audit log specifique
 * GET /api/admin/audit/:id
 */
export const getAuditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(logId)) {
      throw new ErreurAPI('ID de log invalide', 400);
    }

    const log = await AuditLog.findById(logId)
      .populate('actor', '_id prenom nom avatar email role')
      .populate('relatedReport')
      .lean();

    if (!log) {
      throw new ErreurAPI('Log non trouve', 404);
    }

    res.status(200).json({
      succes: true,
      data: { log },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir l'historique d'audit d'une cible specifique
 * GET /api/admin/audit/target/:targetType/:targetId
 */
export const getTargetHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetType, targetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw new ErreurAPI('ID de cible invalide', 400);
    }

    const validTargetTypes = [
      'utilisateur',
      'publication',
      'commentaire',
      'message',
      'story',
      'live',
      'report',
      'config',
      'system',
    ];
    if (!validTargetTypes.includes(targetType)) {
      throw new ErreurAPI('Type de cible invalide', 400);
    }

    const logs = await AuditLog.find({
      targetType,
      targetId: new mongoose.Types.ObjectId(targetId),
    })
      .sort({ dateCreation: -1 })
      .limit(100)
      .populate('actor', '_id prenom nom avatar role')
      .lean();

    res.status(200).json({
      succes: true,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir les statistiques des audit logs
 * GET /api/admin/audit/stats
 */
export const getAuditStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Periode par defaut : 30 derniers jours
    const daysBack = parseInt(req.query.days as string) || 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - daysBack);

    const [actionStats, actorStats, dailyStats, totalLogs] = await Promise.all([
      // Stats par type d'action
      AuditLog.aggregate([
        { $match: { dateCreation: { $gte: dateFrom } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Top acteurs (moderateurs les plus actifs)
      AuditLog.aggregate([
        { $match: { dateCreation: { $gte: dateFrom } } },
        { $group: { _id: '$actor', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'utilisateurs',
            localField: '_id',
            foreignField: '_id',
            as: 'actorInfo',
          },
        },
        { $unwind: '$actorInfo' },
        {
          $project: {
            _id: 1,
            count: 1,
            'actorInfo._id': 1,
            'actorInfo.prenom': 1,
            'actorInfo.nom': 1,
            'actorInfo.avatar': 1,
            'actorInfo.role': 1,
          },
        },
      ]),
      // Stats quotidiennes
      AuditLog.aggregate([
        { $match: { dateCreation: { $gte: dateFrom } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$dateCreation' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Total sur la periode
      AuditLog.countDocuments({ dateCreation: { $gte: dateFrom } }),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        period: {
          from: dateFrom.toISOString(),
          to: new Date().toISOString(),
          days: daysBack,
        },
        totalLogs,
        byAction: actionStats.reduce(
          (acc, a) => ({ ...acc, [a._id]: a.count }),
          {}
        ),
        topActors: actorStats.map((a) => ({
          actor: a.actorInfo,
          actionCount: a.count,
        })),
        daily: dailyStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Exporter les audit logs en CSV
 * GET /api/admin/audit/export
 */
export const exportAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Filtres identiques a listAuditLogs
    const filter: Record<string, unknown> = {};

    const actorId = req.query.actorId as string;
    if (actorId && mongoose.Types.ObjectId.isValid(actorId)) {
      filter.actor = new mongoose.Types.ObjectId(actorId);
    }

    const action = req.query.action as string;
    if (action) {
      filter.action = action;
    }

    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    if (dateFrom || dateTo) {
      filter.dateCreation = {} as Record<string, Date>;
      if (dateFrom) {
        (filter.dateCreation as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (filter.dateCreation as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    // Limite a 10000 pour l'export
    const logs = await AuditLog.find(filter)
      .sort({ dateCreation: -1 })
      .limit(10000)
      .populate('actor', 'prenom nom email')
      .lean();

    // Generer CSV
    const csvHeader = 'Date,Action,Acteur,Email,Role,Type Cible,ID Cible,Raison,IP\n';
    const csvRows = logs.map((log) => {
      const actor = log.actor as {
        prenom?: string;
        nom?: string;
        email?: string;
      } | null;
      return [
        new Date(log.dateCreation).toISOString(),
        log.action,
        actor ? `${actor.prenom} ${actor.nom}` : 'Inconnu',
        actor?.email || '',
        log.actorRole,
        log.targetType,
        log.targetId.toString(),
        (log.reason || '').replace(/"/g, '""'),
        log.actorIp || '',
      ]
        .map((v) => `"${v}"`)
        .join(',');
    });

    const csv = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
