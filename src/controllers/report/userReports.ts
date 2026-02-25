import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Report, {
  ReportReason,
  REASON_PRIORITY_MAP,
  AUTO_ESCALATION_THRESHOLDS,
} from '../../models/Report.js';
import Publication from '../../models/Publication.js';
import Commentaire from '../../models/Commentaire.js';
import { InMemoryRateLimit } from '../../utils/inMemoryRateLimit.js';

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

// ============ RATE LIMITING EN MÉMOIRE ============
// Simple rate limit: 5 reports par user par 10 minutes
const reportLimiter = new InMemoryRateLimit(5, 10 * 60 * 1000);

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
    const reporterKey = reporterId.toString();
    if (reportLimiter.isLimited(reporterKey)) {
      res.status(429).json({
        succes: false,
        message: 'Trop de signalements. Veuillez réessayer dans quelques minutes.',
      });
      return;
    }
    reportLimiter.record(reporterKey);

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

    // Calculer la priorité basée sur la raison
    const basePriority = REASON_PRIORITY_MAP[donnees.reason as ReportReason] || 'medium';

    // SEC-MOD-01: Creer le report puis utiliser $inc atomique pour le compteur
    // Evite la race condition count+create ou le compteur peut etre faux
    const report = await Report.create({
      reporter: reporterId,
      targetType: donnees.targetType,
      targetId: donnees.targetId,
      reason: donnees.reason,
      details: donnees.details,
      priority: basePriority,
      aggregateCount: 1,
    });

    // Incrementer atomiquement le compteur sur TOUS les reports de cette cible
    await Report.updateMany(
      {
        targetType: donnees.targetType,
        targetId: donnees.targetId,
      },
      {
        $inc: { aggregateCount: 1 },
      }
    );

    // Le nouveau report a deja aggregateCount=1, les autres ont ete incrementes de 1
    // Recalculer le vrai total pour l'auto-escalade
    const realCount = await Report.countDocuments({
      targetType: donnees.targetType,
      targetId: donnees.targetId,
    });

    // Verifier auto-escalade
    const escalationThreshold = AUTO_ESCALATION_THRESHOLDS[basePriority];
    if (realCount >= escalationThreshold) {
      await Report.updateMany(
        {
          targetType: donnees.targetType,
          targetId: donnees.targetId,
          escalatedAt: { $eq: null },
        },
        {
          escalatedAt: new Date(),
          escalationReason: `Auto-escalade: ${realCount} signalements sur cette cible`,
        }
      );
    }

    res.status(201).json({
      succes: true,
      message: 'Merci, votre signalement a été enregistré.',
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
