import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Report, { IReport, ReportReason, ReportStatus, ReportAction } from '../models/Report.js';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// ============ SCHEMAS DE VALIDATION ============

const schemaCreerReport = z.object({
  targetType: z.enum(['post', 'commentaire', 'utilisateur']),
  targetId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'ID de cible invalide',
  }),
  reason: z.enum([
    'spam',
    'harcelement',
    'contenu_inapproprie',
    'fausse_info',
    'nudite',
    'violence',
    'haine',
    'autre',
  ]),
  details: z.string().max(500).optional(),
});

const schemaTraiterReport = z.object({
  status: z.enum(['reviewed', 'action_taken', 'dismissed']),
  action: z.enum(['none', 'hide_post', 'delete_post', 'warn_user', 'suspend_user']).optional(),
  adminNote: z.string().max(1000).optional(),
});

// ============ RATE LIMITING EN MÉMOIRE ============
// Simple rate limit: 5 reports par user par 10 minutes
const reportRateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5;

const checkReportRateLimit = (userId: string): boolean => {
  const now = Date.now();
  const userLimit = reportRateLimit.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    reportRateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
};

// Nettoyage périodique du rate limit (éviter fuite mémoire)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of reportRateLimit.entries()) {
    if (now > value.resetAt) {
      reportRateLimit.delete(key);
    }
  }
}, 60 * 1000); // Nettoyer chaque minute

// ============ CONTROLLERS UTILISATEUR ============

/**
 * Créer un signalement
 * POST /api/reports
 */
export const creerReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaCreerReport.parse(req.body);
    const reporterId = req.utilisateur!._id;

    // Rate limiting
    if (!checkReportRateLimit(reporterId.toString())) {
      res.status(429).json({
        succes: false,
        message: 'Trop de signalements. Veuillez réessayer dans quelques minutes.',
      });
      return;
    }

    // Vérifier que la cible existe
    if (donnees.targetType === 'post') {
      const publication = await Publication.findById(donnees.targetId);
      if (!publication) {
        res.status(404).json({
          succes: false,
          message: 'Publication non trouvée.',
        });
        return;
      }

      // Empêcher de signaler son propre post
      if (publication.auteur.toString() === reporterId.toString()) {
        res.status(400).json({
          succes: false,
          message: 'Vous ne pouvez pas signaler votre propre publication.',
        });
        return;
      }
    } else if (donnees.targetType === 'commentaire') {
      const commentaire = await Commentaire.findById(donnees.targetId);
      if (!commentaire) {
        res.status(404).json({
          succes: false,
          message: 'Commentaire non trouvé.',
        });
        return;
      }

      // Empêcher de signaler son propre commentaire
      if (commentaire.auteur.toString() === reporterId.toString()) {
        res.status(400).json({
          succes: false,
          message: 'Vous ne pouvez pas signaler votre propre commentaire.',
        });
        return;
      }
    }
    // Note: Pour 'utilisateur', on pourrait vérifier que l'utilisateur existe
    // mais ce n'est pas dans le MVP

    // Vérifier le dédoublonnage
    const existingReport = await Report.findOne({
      reporter: reporterId,
      targetType: donnees.targetType,
      targetId: donnees.targetId,
    });

    if (existingReport) {
      res.status(409).json({
        succes: false,
        message: 'Vous avez déjà signalé ce contenu.',
      });
      return;
    }

    // Créer le signalement
    const report = await Report.create({
      reporter: reporterId,
      targetType: donnees.targetType,
      targetId: donnees.targetId,
      reason: donnees.reason,
      details: donnees.details,
    });

    res.status(201).json({
      succes: true,
      message: 'Merci, votre signalement a été enregistré.',
      data: {
        report: {
          _id: report._id,
          targetType: report.targetType,
          reason: report.reason,
          status: report.status,
          dateCreation: report.dateCreation,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ CONTROLLERS ADMIN ============

/**
 * Lister les signalements (admin)
 * GET /api/admin/reports
 */
export const listerReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Filtres optionnels
    const statusFilter = req.query.status as ReportStatus | undefined;
    const targetTypeFilter = req.query.targetType as string | undefined;

    const filter: Record<string, unknown> = {};
    if (statusFilter && ['pending', 'reviewed', 'action_taken', 'dismissed'].includes(statusFilter)) {
      filter.status = statusFilter;
    }
    if (targetTypeFilter && ['post', 'commentaire', 'utilisateur'].includes(targetTypeFilter)) {
      filter.targetType = targetTypeFilter;
    }

    // Récupérer les signalements avec pagination
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporter', '_id prenom nom avatar')
        .populate('moderatedBy', '_id prenom nom')
        .lean(),
      Report.countDocuments(filter),
    ]);

    // Enrichir avec les infos de la cible
    const enrichedReports = await Promise.all(
      reports.map(async (report) => {
        let target = null;
        let reportCount = 0;

        if (report.targetType === 'post') {
          const publication = await Publication.findById(report.targetId)
            .populate('auteur', '_id prenom nom avatar')
            .lean();

          if (publication) {
            target = {
              _id: publication._id,
              auteur: publication.auteur,
              contenu: publication.contenu?.substring(0, 200),
              media: publication.media,
              dateCreation: publication.dateCreation,
              isHidden: (publication as Record<string, unknown>).isHidden || false,
            };
          }

          // Compter le nombre total de signalements sur ce post
          reportCount = await Report.countDocuments({
            targetType: 'post',
            targetId: report.targetId,
          });
        } else if (report.targetType === 'commentaire') {
          const commentaire = await Commentaire.findById(report.targetId)
            .populate('auteur', '_id prenom nom avatar')
            .lean();

          if (commentaire) {
            target = {
              _id: commentaire._id,
              auteur: commentaire.auteur,
              contenu: commentaire.contenu?.substring(0, 200),
              dateCreation: commentaire.dateCreation,
            };
          }

          reportCount = await Report.countDocuments({
            targetType: 'commentaire',
            targetId: report.targetId,
          });
        }

        return {
          ...report,
          target,
          reportCount,
        };
      })
    );

    res.status(200).json({
      succes: true,
      data: {
        reports: enrichedReports,
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
 * Traiter un signalement (admin)
 * PATCH /api/admin/reports/:id
 */
export const traiterReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reportId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      res.status(400).json({
        succes: false,
        message: 'ID de signalement invalide.',
      });
      return;
    }

    const donnees = schemaTraiterReport.parse(req.body);
    const adminId = req.utilisateur!._id;

    // Trouver le signalement
    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404).json({
        succes: false,
        message: 'Signalement non trouvé.',
      });
      return;
    }

    // Exécuter l'action si spécifiée
    if (donnees.action && donnees.action !== 'none') {
      if (donnees.action === 'hide_post' && report.targetType === 'post') {
        await Publication.findByIdAndUpdate(report.targetId, { isHidden: true });
      } else if (donnees.action === 'delete_post' && report.targetType === 'post') {
        await Publication.findByIdAndDelete(report.targetId);
        // Supprimer aussi les commentaires associés
        await Commentaire.deleteMany({ publication: report.targetId });
      }
      // Note: warn_user et suspend_user nécessiteraient des champs supplémentaires
      // sur le modèle Utilisateur (warnings, suspendedUntil) - hors scope MVP
    }

    // Mettre à jour le signalement
    report.status = donnees.status;
    report.action = donnees.action;
    report.adminNote = donnees.adminNote;
    report.moderatedBy = adminId;
    report.moderatedAt = new Date();

    await report.save();

    // Si action_taken, mettre à jour tous les signalements de la même cible
    if (donnees.status === 'action_taken' && donnees.action && donnees.action !== 'none') {
      await Report.updateMany(
        {
          targetType: report.targetType,
          targetId: report.targetId,
          _id: { $ne: report._id },
          status: 'pending',
        },
        {
          status: 'action_taken',
          action: donnees.action,
          moderatedBy: adminId,
          moderatedAt: new Date(),
          adminNote: `Action groupée suite au traitement du signalement ${report._id}`,
        }
      );
    }

    res.status(200).json({
      succes: true,
      message: 'Signalement traité avec succès.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir les stats des signalements (admin)
 * GET /api/admin/reports/stats
 */
export const getReportStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [statusStats, reasonStats, totalPending] = await Promise.all([
      Report.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Report.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Report.countDocuments({ status: 'pending' }),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        totalPending,
        byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byReason: reasonStats,
      },
    });
  } catch (error) {
    next(error);
  }
};
