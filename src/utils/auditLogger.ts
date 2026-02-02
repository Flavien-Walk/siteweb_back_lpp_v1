import { Request } from 'express';
import mongoose from 'mongoose';
import AuditLog, { AuditAction, AuditTargetType, IAuditSnapshot } from '../models/AuditLog.js';

/**
 * Extraire l'adresse IP du client depuis la requete
 */
const extractIp = (req: Request): string | undefined => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips?.trim();
  }
  return req.ip || req.socket.remoteAddress;
};

// Interface pour les options de log
interface AuditLogOptions {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: mongoose.Types.ObjectId | string;
  reason?: string;
  metadata?: Record<string, unknown>;
  snapshot?: IAuditSnapshot;
  relatedReport?: mongoose.Types.ObjectId | string;
}

/**
 * Logger principal pour les actions d'audit
 */
export const auditLogger = {
  /**
   * Creer un log d'audit a partir d'une requete Express
   * Extrait automatiquement l'acteur, son role et son IP
   */
  async log(req: Request, options: AuditLogOptions) {
    const utilisateur = req.utilisateur;

    if (!utilisateur) {
      console.error('[AuditLog] Tentative de log sans utilisateur authentifie');
      return null;
    }

    const params = {
      actor: utilisateur._id,
      actorRole: utilisateur.role,
      actorIp: extractIp(req),
      action: options.action,
      targetType: options.targetType,
      targetId: new mongoose.Types.ObjectId(options.targetId.toString()),
      reason: options.reason,
      metadata: options.metadata,
      snapshot: options.snapshot,
      relatedReport: options.relatedReport
        ? new mongoose.Types.ObjectId(options.relatedReport.toString())
        : undefined,
    };

    try {
      const log = await AuditLog.logAction(params);
      return log;
    } catch (error) {
      console.error('[AuditLog] Erreur lors de la creation du log:', error);
      // On ne propage pas l'erreur pour ne pas bloquer l'action principale
      return null;
    }
  },

  /**
   * Creer un log d'audit manuellement (sans requete)
   * Utile pour les jobs ou scripts
   */
  async logManual(
    actorId: mongoose.Types.ObjectId | string,
    actorRole: string,
    options: AuditLogOptions
  ) {
    const params = {
      actor: new mongoose.Types.ObjectId(actorId.toString()),
      actorRole,
      action: options.action,
      targetType: options.targetType,
      targetId: new mongoose.Types.ObjectId(options.targetId.toString()),
      reason: options.reason,
      metadata: options.metadata,
      snapshot: options.snapshot,
      relatedReport: options.relatedReport
        ? new mongoose.Types.ObjectId(options.relatedReport.toString())
        : undefined,
    };

    try {
      const log = await AuditLog.logAction(params);
      return log;
    } catch (error) {
      console.error('[AuditLog] Erreur lors de la creation du log:', error);
      return null;
    }
  },

  /**
   * Raccourcis pour les actions courantes
   */
  actions: {
    async warnUser(
      req: Request,
      userId: mongoose.Types.ObjectId | string,
      reason: string,
      warningDetails?: Record<string, unknown>
    ) {
      return auditLogger.log(req, {
        action: 'user:warn',
        targetType: 'utilisateur',
        targetId: userId,
        reason,
        metadata: warningDetails,
      });
    },

    async suspendUser(
      req: Request,
      userId: mongoose.Types.ObjectId | string,
      reason: string,
      suspendedUntil: Date,
      snapshot?: IAuditSnapshot
    ) {
      return auditLogger.log(req, {
        action: 'user:suspend',
        targetType: 'utilisateur',
        targetId: userId,
        reason,
        metadata: { suspendedUntil: suspendedUntil.toISOString() },
        snapshot,
      });
    },

    async banUser(
      req: Request,
      userId: mongoose.Types.ObjectId | string,
      reason: string,
      snapshot?: IAuditSnapshot
    ) {
      return auditLogger.log(req, {
        action: 'user:ban',
        targetType: 'utilisateur',
        targetId: userId,
        reason,
        snapshot,
      });
    },

    async unbanUser(
      req: Request,
      userId: mongoose.Types.ObjectId | string,
      reason?: string,
      snapshot?: IAuditSnapshot
    ) {
      return auditLogger.log(req, {
        action: 'user:unban',
        targetType: 'utilisateur',
        targetId: userId,
        reason: reason || 'Levee du bannissement',
        snapshot,
      });
    },

    async changeRole(
      req: Request,
      userId: mongoose.Types.ObjectId | string,
      oldRole: string,
      newRole: string,
      reason?: string
    ) {
      return auditLogger.log(req, {
        action: 'user:role_change',
        targetType: 'utilisateur',
        targetId: userId,
        reason,
        snapshot: {
          before: { role: oldRole },
          after: { role: newRole },
        },
      });
    },

    async hideContent(
      req: Request,
      contentType: AuditTargetType,
      contentId: mongoose.Types.ObjectId | string,
      reason: string,
      relatedReport?: mongoose.Types.ObjectId | string
    ) {
      return auditLogger.log(req, {
        action: 'content:hide',
        targetType: contentType,
        targetId: contentId,
        reason,
        relatedReport,
      });
    },

    async deleteContent(
      req: Request,
      contentType: AuditTargetType,
      contentId: mongoose.Types.ObjectId | string,
      reason: string,
      relatedReport?: mongoose.Types.ObjectId | string
    ) {
      return auditLogger.log(req, {
        action: 'content:delete',
        targetType: contentType,
        targetId: contentId,
        reason,
        relatedReport,
      });
    },

    async processReport(
      req: Request,
      reportId: mongoose.Types.ObjectId | string,
      action: string,
      reason?: string
    ) {
      return auditLogger.log(req, {
        action: 'report:process',
        targetType: 'report',
        targetId: reportId,
        reason,
        metadata: { actionTaken: action },
      });
    },

    async escalateReport(
      req: Request,
      reportId: mongoose.Types.ObjectId | string,
      reason: string
    ) {
      return auditLogger.log(req, {
        action: 'report:escalate',
        targetType: 'report',
        targetId: reportId,
        reason,
      });
    },

    async staffLogin(req: Request) {
      const utilisateur = req.utilisateur;
      if (!utilisateur) return null;

      return auditLogger.log(req, {
        action: 'staff:login',
        targetType: 'system',
        targetId: utilisateur._id,
        metadata: {
          userAgent: req.headers['user-agent'],
        },
      });
    },
  },
};

export default auditLogger;
