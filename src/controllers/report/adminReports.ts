import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Report, {
  IReportNote,
  ReportStatus,
  ReportPriority,
} from '../../models/Report.js';
import Publication from '../../models/Publication.js';
import Commentaire from '../../models/Commentaire.js';
import Utilisateur, { IWarning } from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { auditLogger } from '../../utils/auditLogger.js';

// ============ SCHEMAS DE VALIDATION ============

const schemaTraiterReport = z.object({
  status: z.enum(['reviewed', 'action_taken', 'dismissed']),
  action: z.enum(['none', 'hide_post', 'delete_post', 'warn_user', 'suspend_user']).optional(),
  adminNote: z.string().max(1000).optional(),
  // Champs optionnels pour les actions sur utilisateurs
  warningReason: z.string().max(500).optional(), // Pour warn_user
  suspensionHours: z.number().int().min(1).max(8760).optional(), // Pour suspend_user (max 1 an)
});

// Schema pour ajouter une note
const schemaAddNote = z.object({
  content: z.string().min(1, 'Le contenu est requis').max(1000, 'La note ne peut pas dépasser 1000 caractères'),
});

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
    const priorityFilter = req.query.priority as ReportPriority | undefined;
    const escalatedOnly = req.query.escalated === 'true';
    const assignedToMe = req.query.assignedToMe === 'true';

    const filter: Record<string, unknown> = {};
    if (statusFilter && ['pending', 'reviewed', 'action_taken', 'dismissed'].includes(statusFilter)) {
      filter.status = statusFilter;
    }
    if (targetTypeFilter && ['post', 'commentaire', 'utilisateur'].includes(targetTypeFilter)) {
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

    // Tri par priorité (critical > high > medium > low) puis par date
    const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

    // Récupérer les signalements avec pagination
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
        // Log de l'action
        await auditLogger.actions.hideContent(req, 'publication', report.targetId, donnees.adminNote || 'Contenu masqué suite à signalement', report._id);
      } else if (donnees.action === 'delete_post' && report.targetType === 'post') {
        await Publication.findByIdAndDelete(report.targetId);
        // Supprimer aussi les commentaires associés
        await Commentaire.deleteMany({ publication: report.targetId });
        // Log de l'action
        await auditLogger.actions.deleteContent(req, 'publication', report.targetId, donnees.adminNote || 'Contenu supprimé suite à signalement', report._id);
      } else if (donnees.action === 'warn_user' && report.targetType === 'utilisateur') {
        // Avertir l'utilisateur signalé (atomic)
        const warning: IWarning = {
          reason: donnees.warningReason || donnees.adminNote || `Avertissement suite au signalement #${report._id}`,
          issuedBy: adminId,
          issuedAt: new Date(),
        };
        const targetUser = await Utilisateur.findByIdAndUpdate(
          report.targetId,
          {
            $push: { warnings: warning },
            $inc: { 'moderation.warnCountSinceLastAutoSuspension': 1 },
            $set: { 'moderation.updatedAt': new Date() },
          },
          { new: true }
        );
        if (targetUser) {
          // Log de l'action
          await auditLogger.actions.warnUser(req, targetUser._id, warning.reason, {
            relatedReport: report._id,
            totalWarnings: targetUser.warnings.length,
          });
        }
      } else if (donnees.action === 'suspend_user' && report.targetType === 'utilisateur') {
        // Suspendre l'utilisateur signalé (atomic)
        const hours = donnees.suspensionHours || 24; // Par défaut 24h
        const suspendedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
        const targetUser = await Utilisateur.findByIdAndUpdate(
          report.targetId,
          { $set: { suspendedUntil, suspendReason: donnees.adminNote || `Suspension suite au signalement #${report._id}` } },
          { new: true }
        );
        if (targetUser) {
          // Log de l'action
          await auditLogger.actions.suspendUser(
            req,
            targetUser._id,
            donnees.adminNote || `Suspension suite au signalement #${report._id}`,
            suspendedUntil,
            { before: { suspendedUntil: null }, after: { suspendedUntil: suspendedUntil.toISOString() } }
          );
        }
      }
    }

    // Log du traitement du signalement
    await auditLogger.actions.processReport(req, report._id, donnees.action || 'none', donnees.adminNote);

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
    const [statusStats, reasonStats, priorityStats, totalPending, totalEscalated] = await Promise.all([
      Report.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
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
        message: 'Signalement non trouvé.',
      });
      return;
    }

    if (report.escalatedAt) {
      res.status(400).json({
        succes: false,
        message: 'Ce signalement a déjà été escaladé.',
      });
      return;
    }

    report.escalatedAt = new Date();
    report.escalatedBy = req.utilisateur!._id;
    report.escalationReason = reason || 'Escalade manuelle';
    await report.save();

    // Log de l'action
    await auditLogger.actions.escalateReport(req, report._id, reason || 'Escalade manuelle');

    res.status(200).json({
      succes: true,
      message: 'Signalement escaladé.',
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assigner un signalement à un modérateur
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
        message: 'Signalement non trouvé.',
      });
      return;
    }

    // Vérifier que l'assigné est un modérateur
    if (assigneeId) {
      const assignee = await Utilisateur.findById(assigneeId);
      if (!assignee || !assignee.isStaff()) {
        res.status(400).json({
          succes: false,
          message: "L'utilisateur assigné doit être un membre du staff.",
        });
        return;
      }
      report.assignedTo = new mongoose.Types.ObjectId(assigneeId);
      report.assignedAt = new Date();
    } else {
      // Désassigner
      report.assignedTo = undefined;
      report.assignedAt = undefined;
    }

    await report.save();

    // Log de l'action
    await auditLogger.log(req, {
      action: 'report:assign',
      targetType: 'report',
      targetId: report._id,
      metadata: { assignedTo: assigneeId || null },
    });

    res.status(200).json({
      succes: true,
      message: assigneeId ? 'Signalement assigné.' : 'Signalement désassigné.',
      data: { report },
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
      throw new ErreurAPI('Signalement non trouvé', 404);
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
          contenu: (publication as any).contenu,
          media: (publication as any).media,
          isHidden: (publication as any).isHidden || false,
          dateCreation: (publication as any).dateCreation,
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
          status: utilisateur.bannedAt ? 'banned' :
                  (utilisateur.suspendedUntil && new Date(utilisateur.suspendedUntil) > new Date()) ? 'suspended' : 'active',
        };
      }
    }

    // Formater la réponse pour l'outil de modération
    const formattedReport = {
      _id: report._id,
      reporter: report.reporter,
      targetType: report.targetType === 'post' ? 'publication' : report.targetType,
      targetId: report.targetId,
      targetContent: target?.contenu || null,
      targetUser,
      type: report.reason,
      reason: report.details,
      status: report.status === 'pending' ? 'pending' :
              report.status === 'reviewed' ? 'in_progress' :
              report.status === 'action_taken' ? 'resolved' : 'rejected',
      priority: report.priority,
      assignedTo: report.assignedTo,
      processedBy: report.moderatedBy,
      notes: report.notes || [],
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

/**
 * Ajouter une note interne à un signalement
 * POST /api/admin/reports/:id/notes
 */
export const addReportNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reportId = req.params.id;
    const moderatorId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      throw new ErreurAPI('ID de signalement invalide', 400);
    }

    const donnees = schemaAddNote.parse(req.body);

    const report = await Report.findById(reportId);
    if (!report) {
      throw new ErreurAPI('Signalement non trouvé', 404);
    }

    // Créer la nouvelle note
    const newNote: IReportNote = {
      author: moderatorId,
      content: donnees.content,
      createdAt: new Date(),
    };

    // Atomic: push note without read-modify-write race
    await Report.findByIdAndUpdate(reportId, { $push: { notes: newNote } });

    // Récupérer le report mis à jour avec les notes populées
    const updatedReport = await Report.findById(reportId)
      .populate('notes.author', '_id prenom nom avatar')
      .lean();

    const addedNote = updatedReport?.notes[updatedReport.notes.length - 1];

    res.status(201).json({
      succes: true,
      message: 'Note ajoutée avec succès.',
      data: {
        note: addedNote,
        totalNotes: report.notes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
