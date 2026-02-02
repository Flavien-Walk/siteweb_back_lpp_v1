import { Request } from 'express';
import mongoose from 'mongoose';
import AuditLog, {
  AuditAction,
  AuditTargetType,
  AuditSource,
  IAuditSnapshot,
  LogActionParams,
} from '../models/AuditLog.js';
import { IUtilisateur } from '../models/Utilisateur.js';

/**
 * Helper pour créer des logs d'audit facilement
 *
 * Usage:
 * ```typescript
 * await auditLogger.log(req, {
 *   action: 'user:ban',
 *   targetType: 'utilisateur',
 *   targetId: user._id,
 *   reason: 'Spam répété',
 *   snapshot: { before: { bannedAt: null }, after: { bannedAt: new Date() } }
 * });
 * ```
 */

/**
 * Options pour créer un log
 */
export interface AuditLogOptions {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: mongoose.Types.ObjectId | string;
  reason?: string;
  metadata?: Record<string, unknown>;
  snapshot?: IAuditSnapshot;
  relatedReport?: mongoose.Types.ObjectId | string;
  source?: AuditSource;
}

/**
 * Extraire l'adresse IP du client depuis la requête
 */
const extractIp = (req: Request): string | undefined => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips?.trim();
  }
  return req.ip || req.socket.remoteAddress;
};

/**
 * Extraire la source depuis la requête (header ou body)
 * Priorité: body.source > header X-Audit-Source > défaut 'web'
 */
const extractSource = (req: Request, optionSource?: AuditSource): AuditSource => {
  // 1. Option passée explicitement
  if (optionSource) return optionSource;

  // 2. Source dans le body de la requête
  if (req.body?.source && ['web', 'mobile', 'api', 'system'].includes(req.body.source)) {
    return req.body.source as AuditSource;
  }

  // 3. Header X-Audit-Source
  const headerSource = req.headers['x-audit-source'];
  if (headerSource && ['web', 'mobile', 'api', 'system'].includes(headerSource as string)) {
    return headerSource as AuditSource;
  }

  // 4. Détecter automatiquement via User-Agent
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  if (userAgent.includes('expo') || userAgent.includes('react-native') || userAgent.includes('okhttp')) {
    return 'mobile';
  }

  // 5. Défaut: web
  return 'web';
};

/**
 * Logger principal pour les actions d'audit
 */
export const auditLogger = {
  /**
   * Créer un log d'audit à partir d'une requête Express
   * Extrait automatiquement l'acteur, son rôle, son IP et la source
   */
  async log(req: Request, options: AuditLogOptions) {
    const utilisateur = req.utilisateur as IUtilisateur;

    if (!utilisateur) {
      console.error('[AuditLog] Tentative de log sans utilisateur authentifié');
      return null;
    }

    const params: LogActionParams = {
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
      source: extractSource(req, options.source),
    };

    try {
      const log = await AuditLog.logAction(params);
      return log;
    } catch (error) {
      console.error('[AuditLog] Erreur lors de la création du log:', error);
      // On ne propage pas l'erreur pour ne pas bloquer l'action principale
      return null;
    }
  },

  /**
   * Créer un log d'audit manuellement (sans requête)
   * Utile pour les jobs ou scripts
   */
  async logManual(
    actorId: mongoose.Types.ObjectId | string,
    actorRole: string,
    options: AuditLogOptions
  ) {
    const params: LogActionParams = {
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
      source: options.source || 'system',
    };

    try {
      const log = await AuditLog.logAction(params);
      return log;
    } catch (error) {
      console.error('[AuditLog] Erreur lors de la création du log:', error);
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
        reason: reason || 'Levée du bannissement',
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
      contentType: 'publication' | 'commentaire' | 'message' | 'story',
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
      contentType: 'publication' | 'commentaire' | 'message' | 'story',
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
      const utilisateur = req.utilisateur as IUtilisateur;
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
