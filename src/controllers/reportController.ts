import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Report, { REASON_PRIORITY_MAP, AUTO_ESCALATION_THRESHOLDS } from '../models/Report.js';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import Utilisateur from '../models/Utilisateur.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';
import { auditLogger } from '../utils/auditLogger.js';

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
  warningReason: z.string().max(500).optional(),
  suspensionHours: z.number().int().min(1).max(8760).optional(),
});

// ============ RATE LIMITING EN MEMOIRE ============

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const reportRateLimit = new Map<string, RateLimitEntry>();
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

// Nettoyage periodique du rate limit (eviter fuite memoire)
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
 * Creer un signalement
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
        message: 'Trop de signalements. Veuillez reessayer dans quelques minutes.',
      });
      return;
    }

    // Verifier que la cible existe
    if (donnees.targetType === 'post') {
      const publication = await Publication.findById(donnees.targetId);
      if (!publication) {
        res.status(404).json({
          succes: false,
          message: 'Publication non trouvee.',
        });
        return;
      }
      // Empecher de signaler son propre post
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
          message: 'Commentaire non trouve.',
        });
        return;
      }
      // Empecher de signaler son propre commentaire
      if (commentaire.auteur.toString() === reporterId.toString()) {
        res.status(400).json({
          succes: false,
          message: 'Vous ne pouvez pas signaler votre propre commentaire.',
        });
        return;
      }
    }

    // Verifier le dedoublonnage
    const existingReport = await Report.findOne({
      reporter: reporterId,
      targetType: donnees.targetType,
      targetId: donnees.targetId,
    });

    if (existingReport) {
      res.status(409).json({
        succes: false,
        message: 'Vous avez deja signale ce contenu.',
      });
      return;
    }

    // Compter les signalements existants sur cette cible
    const existingReportCount = await Report.countDocuments({
      targetType: donnees.targetType,
      targetId: donnees.targetId,
    });

    // Calculer la priorite basee sur la raison
    const basePriority = REASON_PRIORITY_MAP[donnees.reason] || 'medium';

    // Determiner si auto-escalade necessaire
    const aggregateCount = existingReportCount + 1;
    const escalationThreshold = AUTO_ESCALATION_THRESHOLDS[basePriority];
    const shouldAutoEscalate = aggregateCount >= escalationThreshold;

    // Creer le signalement
    const report = await Report.create({
      reporter: reporterId,
      targetType: donnees.targetType,
      targetId: donnees.targetId,
      reason: donnees.reason,
      details: donnees.details,
      priority: basePriority,
      aggregateCount,
      ...(shouldAutoEscalate && {
        escalatedAt: new Date(),
        escalationReason: `Auto-escalade: ${aggregateCount} signalements sur cette cible`,
      }),
    });

    // Mettre a jour le compteur sur les autres signalements de la meme cible
    if (existingReportCount > 0) {
      await Report.updateMany(
        {
          targetType: donnees.targetType,
          targetId: donnees.targetId,
          _id: { $ne: report._id },
        },
        {
          aggregateCount,
          ...(shouldAutoEscalate && {
            escalatedAt: new Date(),
            escalationReason: `Auto-escalade: ${aggregateCount} signalements sur cette cible`,
          }),
        }
      );
    }

    res.status(201).json({
      succes: true,
      message: 'Merci, votre signalement a ete enregistre.',
      data: {
        report: {
          _id: report._id,
          targetType: report.targetType,
          reason: report.reason,
          status: report.status,
          priority: report.priority,
          aggregateCount: report.aggregateCount,
          dateCreation: report.dateCreation,
          isEscalated: !!report.escalatedAt,
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
    const statusFilter = req.query.status as string;
    const targetTypeFilter = req.query.targetType as string;
    const priorityFilter = req.query.priority as string;
    const escalatedOnly = req.query.escalated === 'true';
    const assignedToMe = req.query.assignedToMe === 'true';

    const filter: Record<string, unknown> = {};

    if (
      statusFilter &&
      ['pending', 'reviewed', 'action_taken', 'dismissed'].includes(statusFilter)
    ) {
      filter.status = statusFilter;
    }
    if (
      targetTypeFilter &&
      ['post', 'commentaire', 'utilisateur'].includes(targetTypeFilter)
    ) {
      filter.targetType = targetTypeFilter;
    }
    if (priorityFilter && ['low', 'medium', 'high', 'critical'].includes(priorityFilter)) {
      filter.priority = priorityFilter;
    }
    if (escalatedOnly) {
      filter.escalatedAt = { $ne: null };
    }
    if (assignedToMe && req.utilisateur) {
      filter.assignedTo = req.utilisateur._id;
    }

    // Recuperer les signalements avec pagination
    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ priority: -1, dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporter', '_id prenom nom avatar')
        .populate('moderatedBy', '_id prenom nom')
        .populate('assignedTo', '_id prenom nom')
        .populate('escalatedBy', '_id prenom nom')
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
              isHidden: (publication as any).isHidden || false,
            };
          }
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
        message: 'Signalement non trouve.',
      });
      return;
    }

    // Executer l'action si specifiee
    if (donnees.action && donnees.action !== 'none') {
      if (donnees.action === 'hide_post' && report.targetType === 'post') {
        await Publication.findByIdAndUpdate(report.targetId, { isHidden: true });
        await auditLogger.actions.hideContent(
          req,
          'publication',
          report.targetId,
          donnees.adminNote || 'Contenu masque suite a signalement',
          report._id
        );
      } else if (donnees.action === 'delete_post' && report.targetType === 'post') {
        await Publication.findByIdAndDelete(report.targetId);
        await Commentaire.deleteMany({ publication: report.targetId });
        await auditLogger.actions.deleteContent(
          req,
          'publication',
          report.targetId,
          donnees.adminNote || 'Contenu supprime suite a signalement',
          report._id
        );
      } else if (
        donnees.action === 'warn_user' &&
        report.targetType === 'utilisateur'
      ) {
        const targetUser = await Utilisateur.findById(report.targetId);
        if (targetUser) {
          const warning = {
            reason:
              donnees.warningReason ||
              donnees.adminNote ||
              `Avertissement suite au signalement #${report._id}`,
            issuedBy: adminId,
            issuedAt: new Date(),
          };
          targetUser.warnings.push(warning);
          await targetUser.save();

          await auditLogger.actions.warnUser(req, targetUser._id, warning.reason, {
            relatedReport: report._id,
            totalWarnings: targetUser.warnings.length,
          });
        }
      } else if (
        donnees.action === 'suspend_user' &&
        report.targetType === 'utilisateur'
      ) {
        const targetUser = await Utilisateur.findById(report.targetId);
        if (targetUser) {
          const hours = donnees.suspensionHours || 24;
          const suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
          targetUser.suspendedUntil = suspendedUntil;
          await targetUser.save();

          await auditLogger.actions.suspendUser(
            req,
            targetUser._id,
            donnees.adminNote || `Suspension suite au signalement #${report._id}`,
            suspendedUntil,
            {
              before: { suspendedUntil: null },
              after: { suspendedUntil: suspendedUntil.toISOString() },
            }
          );
        }
      }
    }

    // Log du traitement du signalement
    await auditLogger.actions.processReport(
      req,
      report._id,
      donnees.action || 'none',
      donnees.adminNote
    );

    // Mettre a jour le signalement
    report.status = donnees.status;
    report.action = donnees.action;
    report.adminNote = donnees.adminNote;
    report.moderatedBy = adminId;
    report.moderatedAt = new Date();
    await report.save();

    // Si action_taken, mettre a jour tous les signalements de la meme cible
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
          adminNote: `Action groupee suite au traitement du signalement ${report._id}`,
        }
      );
    }

    res.status(200).json({
      succes: true,
      message: 'Signalement traite avec succes.',
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
    const [statusStats, reasonStats, priorityStats, totalPending, totalEscalated] =
      await Promise.all([
        Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Report.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: '$reason', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        Report.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        Report.countDocuments({ status: 'pending' }),
        Report.countDocuments({ status: 'pending', escalatedAt: { $ne: null } }),
      ]);

    res.status(200).json({
      succes: true,
      data: {
        totalPending,
        totalEscalated,
        byStatus: statusStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        byReason: reasonStats,
        byPriority: priorityStats.reduce((acc, p) => ({ ...acc, [p._id]: p.count }), {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Escalader manuellement un signalement
 * POST /api/admin/reports/:id/escalate
 */
export const escalateReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reportId = req.params.id;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      res.status(400).json({
        succes: false,
        message: 'ID de signalement invalide.',
      });
      return;
    }

    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404).json({
        succes: false,
        message: 'Signalement non trouve.',
      });
      return;
    }

    if (report.escalatedAt) {
      res.status(400).json({
        succes: false,
        message: 'Ce signalement a deja ete escalade.',
      });
      return;
    }

    report.escalatedAt = new Date();
    report.escalatedBy = req.utilisateur!._id;
    report.escalationReason = reason || 'Escalade manuelle';
    await report.save();

    await auditLogger.actions.escalateReport(req, report._id, reason || 'Escalade manuelle');

    res.status(200).json({
      succes: true,
      message: 'Signalement escalade.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assigner un signalement a un moderateur
 * POST /api/admin/reports/:id/assign
 */
export const assignReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reportId = req.params.id;
    const { assigneeId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      res.status(400).json({
        succes: false,
        message: 'ID de signalement invalide.',
      });
      return;
    }

    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404).json({
        succes: false,
        message: 'Signalement non trouve.',
      });
      return;
    }

    // Verifier que l'assigne est un moderateur
    if (assigneeId) {
      const assignee = await Utilisateur.findById(assigneeId);
      if (!assignee || !assignee.isStaff()) {
        res.status(400).json({
          succes: false,
          message: "L'utilisateur assigne doit etre un membre du staff.",
        });
        return;
      }
      report.assignedTo = new mongoose.Types.ObjectId(assigneeId);
      report.assignedAt = new Date();
    } else {
      // Desassigner
      report.assignedTo = undefined;
      report.assignedAt = undefined;
    }

    await report.save();

    await auditLogger.log(req, {
      action: 'report:assign',
      targetType: 'report',
      targetId: report._id,
      metadata: { assignedTo: assigneeId || null },
    });

    res.status(200).json({
      succes: true,
      message: assigneeId ? 'Signalement assigne.' : 'Signalement desassigne.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir les signalements agreges par cible
 * GET /api/admin/reports/aggregated
 */
export const getAggregatedReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Agregation par cible
    const aggregated = await Report.aggregate([
      { $match: { status: 'pending' } },
      {
        $group: {
          _id: { targetType: '$targetType', targetId: '$targetId' },
          count: { $sum: 1 },
          reasons: { $addToSet: '$reason' },
          priorities: { $addToSet: '$priority' },
          maxPriority: { $max: '$priority' },
          firstReportDate: { $min: '$dateCreation' },
          lastReportDate: { $max: '$dateCreation' },
          isEscalated: {
            $max: { $cond: [{ $ne: ['$escalatedAt', null] }, true, false] },
          },
          reportIds: { $push: '$_id' },
        },
      },
      {
        $addFields: {
          priorityWeight: {
            $switch: {
              branches: [
                { case: { $eq: ['$maxPriority', 'critical'] }, then: 4 },
                { case: { $eq: ['$maxPriority', 'high'] }, then: 3 },
                { case: { $eq: ['$maxPriority', 'medium'] }, then: 2 },
                { case: { $eq: ['$maxPriority', 'low'] }, then: 1 },
              ],
              default: 0,
            },
          },
        },
      },
      { $sort: { priorityWeight: -1, count: -1, lastReportDate: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Compter le total
    const totalAgg = await Report.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: { targetType: '$targetType', targetId: '$targetId' } } },
      { $count: 'total' },
    ]);
    const total = totalAgg[0]?.total || 0;

    // Enrichir avec les infos des cibles
    const enrichedAggregated = await Promise.all(
      aggregated.map(async (agg) => {
        let target = null;

        if (agg._id.targetType === 'post') {
          const publication = await Publication.findById(agg._id.targetId)
            .populate('auteur', '_id prenom nom avatar')
            .lean();
          if (publication) {
            target = {
              _id: publication._id,
              type: 'post',
              auteur: publication.auteur,
              contenu: publication.contenu?.substring(0, 200),
              media: publication.media,
              isHidden: (publication as any).isHidden || false,
            };
          }
        } else if (agg._id.targetType === 'commentaire') {
          const commentaire = await Commentaire.findById(agg._id.targetId)
            .populate('auteur', '_id prenom nom avatar')
            .lean();
          if (commentaire) {
            target = {
              _id: commentaire._id,
              type: 'commentaire',
              auteur: commentaire.auteur,
              contenu: commentaire.contenu?.substring(0, 200),
            };
          }
        } else if (agg._id.targetType === 'utilisateur') {
          const utilisateur = await Utilisateur.findById(agg._id.targetId)
            .select('_id prenom nom avatar email')
            .lean();
          if (utilisateur) {
            target = {
              _id: utilisateur._id,
              type: 'utilisateur',
              prenom: utilisateur.prenom,
              nom: utilisateur.nom,
              avatar: utilisateur.avatar,
            };
          }
        }

        return {
          targetType: agg._id.targetType,
          targetId: agg._id.targetId,
          target,
          reportCount: agg.count,
          reasons: agg.reasons,
          maxPriority: agg.maxPriority,
          isEscalated: agg.isEscalated,
          firstReportDate: agg.firstReportDate,
          lastReportDate: agg.lastReportDate,
          reportIds: agg.reportIds,
        };
      })
    );

    res.status(200).json({
      succes: true,
      data: {
        aggregatedReports: enrichedAggregated,
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
 * Obtenir un signalement par ID
 * GET /api/admin/reports/:id
 */
export const getReportById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reportId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      throw new ErreurAPI('ID de signalement invalide', 400);
    }

    const report = await Report.findById(reportId)
      .populate('reporter', '_id prenom nom email avatar')
      .populate('moderatedBy', '_id prenom nom')
      .populate('assignedTo', '_id prenom nom')
      .populate('escalatedBy', '_id prenom nom')
      .lean();

    if (!report) {
      throw new ErreurAPI('Signalement non trouve', 404);
    }

    // Enrichir avec les infos de la cible
    let target = null;
    let targetUser = null;

    if (report.targetType === 'post') {
      const publication = await Publication.findById(report.targetId)
        .populate('auteur', '_id prenom nom avatar email')
        .lean();
      if (publication) {
        target = {
          _id: publication._id,
          type: 'publication',
          auteur: publication.auteur,
          contenu: publication.contenu,
          media: publication.media,
          isHidden: (publication as any).isHidden || false,
          dateCreation: publication.dateCreation,
        };
        targetUser = publication.auteur;
      }
    } else if (report.targetType === 'commentaire') {
      const commentaire = await Commentaire.findById(report.targetId)
        .populate('auteur', '_id prenom nom avatar email')
        .lean();
      if (commentaire) {
        target = {
          _id: commentaire._id,
          type: 'commentaire',
          auteur: commentaire.auteur,
          contenu: commentaire.contenu,
          dateCreation: commentaire.dateCreation,
        };
        targetUser = commentaire.auteur;
      }
    } else if (report.targetType === 'utilisateur') {
      const utilisateur = await Utilisateur.findById(report.targetId)
        .select('_id prenom nom avatar email bannedAt suspendedUntil warnings')
        .lean();
      if (utilisateur) {
        target = {
          _id: utilisateur._id,
          type: 'utilisateur',
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          avatar: utilisateur.avatar,
          email: utilisateur.email,
        };
        targetUser = {
          _id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          avatar: utilisateur.avatar,
          email: utilisateur.email,
          status: utilisateur.bannedAt
            ? 'banned'
            : utilisateur.suspendedUntil && new Date(utilisateur.suspendedUntil) > new Date()
            ? 'suspended'
            : 'active',
        };
      }
    }

    // Formater la reponse pour l'outil de moderation
    const formattedReport = {
      _id: report._id,
      reporter: report.reporter,
      targetType: report.targetType === 'post' ? 'publication' : report.targetType,
      targetId: report.targetId,
      targetContent: (target as any)?.contenu || null,
      targetUser,
      type: report.reason,
      reason: report.details,
      status:
        report.status === 'pending'
          ? 'pending'
          : report.status === 'reviewed'
          ? 'in_progress'
          : report.status === 'action_taken'
          ? 'resolved'
          : 'rejected',
      priority: report.priority,
      assignedTo: report.assignedTo,
      processedBy: report.moderatedBy,
      notes: [],
      duplicateCount: report.aggregateCount || 1,
      createdAt: report.dateCreation,
      updatedAt: report.dateMiseAJour,
      resolvedAt: report.moderatedAt,
    };

    res.status(200).json({
      succes: true,
      data: {
        report: formattedReport,
      },
    });
  } catch (error) {
    next(error);
  }
};
