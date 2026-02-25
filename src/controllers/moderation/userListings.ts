/**
 * User listing, detail, audit, timeline, activity and stats controllers.
 * Extracted from moderationController.ts — read-only / consultation endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Utilisateur from '../../models/Utilisateur.js';
import Publication from '../../models/Publication.js';
import Commentaire from '../../models/Commentaire.js';
import AuditLog from '../../models/AuditLog.js';
import Report from '../../models/Report.js';
import { escapeRegex } from '../../utils/strings.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { WARNINGS_BEFORE_AUTO_SUSPENSION } from '../../utils/moderationHelpers.js';

// ============ CONSULTATION UTILISATEURS ============

/**
 * Obtenir les détails de modération d'un utilisateur
 * GET /api/moderation/users/:id
 */
export const getUserModerationDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const user = await Utilisateur.findById(userId)
      .select('prenom nom email avatar role permissions bannedAt banReason suspendedUntil suspendReason warnings moderation surveillance dateCreation')
      .populate('warnings.issuedBy', '_id prenom nom')
      .populate('surveillance.addedBy', '_id prenom nom');

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Filtrer les warnings expirés pour le comptage actif
    const now = new Date();
    const activeWarnings = user.warnings.filter(
      (w) => !w.expiresAt || new Date(w.expiresAt) > now
    );

    // Calculer warnings avant prochaine sanction
    const warnCount = user.moderation?.warnCountSinceLastAutoSuspension || 0;
    const warningsBeforeNextSanction = Math.max(0, WARNINGS_BEFORE_AUTO_SUSPENSION - warnCount);

    // Compter les reports reçus
    const reportsReceivedCount = await Report.countDocuments({
      targetId: new mongoose.Types.ObjectId(userId),
      targetType: 'utilisateur',
    });

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          permissions: user.permissions,
          dateCreation: user.dateCreation,
        },
        moderation: {
          status: user.moderation?.status || 'active',
          isBanned: user.isBanned(),
          bannedAt: user.bannedAt,
          banReason: user.banReason,
          isSuspended: user.isSuspended(),
          suspendedUntil: user.suspendedUntil,
          suspendReason: user.suspendReason,
          warnings: user.warnings,
          activeWarningsCount: activeWarnings.length,
          totalWarningsCount: user.warnings.length,
          // Champs pour le systeme d'auto-escalade
          warnCountSinceLastAutoSuspension: warnCount,
          warningsBeforeNextSanction,
          autoSuspensionsCount: user.moderation?.autoSuspensionsCount || 0,
          lastAutoActionAt: user.moderation?.lastAutoActionAt || null,
        },
        surveillance: user.surveillance || { active: false, notes: [] },
        reportsReceivedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lister les utilisateurs avec filtres de modération
 * GET /api/moderation/users
 */
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Filtres
    const filter: Record<string, unknown> = {};

    // Filtre par statut
    const status = req.query.status as string;
    if (status === 'banned') {
      filter.bannedAt = { $ne: null };
    } else if (status === 'suspended') {
      filter.suspendedUntil = { $gt: new Date() };
    } else if (status === 'active') {
      filter.bannedAt = null;
      filter.$or = [
        { suspendedUntil: null },
        { suspendedUntil: { $lte: new Date() } },
      ];
    }

    // Filtre par rôle
    const role = req.query.role as string;
    if (role && ['user', 'modo_test', 'modo', 'admin_modo', 'super_admin'].includes(role)) {
      filter.role = role;
    }

    // Recherche par nom/email (escaped to prevent ReDoS)
    const search = req.query.search as string;
    if (search && search.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
      filter.$or = [
        { prenom: searchRegex },
        { nom: searchRegex },
        { email: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      Utilisateur.find(filter)
        .select('_id prenom nom email avatar role bannedAt banReason suspendedUntil suspendReason warnings dateCreation')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Utilisateur.countDocuments(filter),
    ]);

    // Enrichir avec le statut de modération
    const enrichedUsers = users.map((user) => ({
      ...user,
      isBanned: user.bannedAt !== null,
      isSuspended: user.suspendedUntil ? new Date(user.suspendedUntil) > new Date() : false,
      warningsCount: user.warnings?.length || 0,
    }));

    res.status(200).json({
      succes: true,
      data: {
        users: enrichedUsers,
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

// ============ AUDIT & HISTORIQUE UTILISATEUR ============

/**
 * Récupérer l'historique d'audit d'un utilisateur
 * GET /api/admin/users/:id/audit
 *
 * Retourne toutes les entrées AuditLog où:
 * - targetType = 'utilisateur' && targetId = userId
 * - OU actions sur du contenu appartenant à cet utilisateur
 */
export const getUserAuditHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Vérifier que l'utilisateur existe
    const user = await Utilisateur.findById(userId).select('_id prenom nom');
    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    // Filtres optionnels
    const actionFilter = req.query.action as string;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;

    // Récupérer les publications/commentaires de l'utilisateur pour inclure les actions sur son contenu
    const userPublications = await Publication.find({ auteur: userId }).select('_id').lean();
    const userCommentaires = await Commentaire.find({ auteur: userId }).select('_id').lean();

    const pubIds = userPublications.map(p => p._id);
    const comIds = userCommentaires.map(c => c._id);

    // Construire la query
    const query: Record<string, unknown> = {
      $or: [
        // Actions directes sur l'utilisateur
        { targetType: 'utilisateur', targetId: new mongoose.Types.ObjectId(userId) },
        // Actions sur ses publications
        ...(pubIds.length > 0 ? [{ targetType: 'publication', targetId: { $in: pubIds } }] : []),
        // Actions sur ses commentaires
        ...(comIds.length > 0 ? [{ targetType: 'commentaire', targetId: { $in: comIds } }] : []),
      ],
    };

    // Filtre par action si spécifié
    if (actionFilter) {
      query.action = actionFilter;
    }

    // Filtre par dates
    if (dateFrom || dateTo) {
      query.dateCreation = {};
      if (dateFrom) (query.dateCreation as Record<string, Date>).$gte = dateFrom;
      if (dateTo) (query.dateCreation as Record<string, Date>).$lte = dateTo;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', '_id prenom nom avatar role')
        .populate('relatedReport', '_id raison status')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
        },
        logs: logs.map(log => ({
          _id: log._id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          reason: log.reason,
          metadata: log.metadata,
          snapshot: log.snapshot,
          moderator: log.actor,
          relatedReport: log.relatedReport,
          createdAt: log.dateCreation,
        })),
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
 * Récupérer une timeline synthétique de modération d'un utilisateur
 * GET /api/admin/users/:id/timeline
 *
 * Vue synthétique et chronologique:
 * - Avertissements
 * - Suspensions
 * - Bans/Débans
 * - Reports majeurs (ayant abouti à une action)
 */
export const getUserModerationTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Récupérer l'utilisateur avec ses warnings
    const user = await Utilisateur.findById(userId)
      .select('_id prenom nom email avatar role bannedAt banReason suspendedUntil suspendReason warnings dateCreation')
      .populate('warnings.issuedBy', '_id prenom nom')
      .lean();

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Récupérer les actions de modération importantes
    const moderationActions = await AuditLog.find({
      targetType: 'utilisateur',
      targetId: new mongoose.Types.ObjectId(userId),
      action: { $in: ['user:warn', 'user:suspend', 'user:unsuspend', 'user:ban', 'user:unban', 'user:role_change'] },
    })
      .populate('actor', '_id prenom nom')
      .sort({ dateCreation: -1 })
      .limit(100)
      .lean();

    // Récupérer les reports ayant abouti à une action sur cet utilisateur
    const actionedReports = await Report.find({
      targetType: 'utilisateur',
      targetId: new mongoose.Types.ObjectId(userId),
      status: 'action_taken',
    })
      .populate('moderatedBy', '_id prenom nom')
      .sort({ moderatedAt: -1 })
      .limit(50)
      .lean();

    // Construire la timeline
    const timeline: Array<{
      type: string;
      date: Date;
      action?: string;
      reason?: string;
      moderator?: { _id: string; prenom: string; nom: string } | null;
      details?: Record<string, unknown>;
    }> = [];

    // Ajouter les warnings de l'utilisateur
    if (user.warnings) {
      for (const warning of user.warnings) {
        const issuedByData = warning.issuedBy as unknown as { _id: string; prenom: string; nom: string } | null;
        timeline.push({
          type: 'warning',
          date: new Date(warning.issuedAt),
          action: 'user:warn',
          reason: warning.reason,
          moderator: issuedByData || null,
          details: {
            warningId: warning._id,
            expiresAt: warning.expiresAt,
          },
        });
      }
    }

    // Ajouter les actions de modération
    for (const action of moderationActions) {
      const actorData = action.actor as unknown as { _id: string; prenom: string; nom: string } | null;
      timeline.push({
        type: 'moderation_action',
        date: action.dateCreation,
        action: action.action,
        reason: action.reason,
        moderator: actorData || null,
        details: {
          snapshot: action.snapshot,
          metadata: action.metadata,
        },
      });
    }

    // Ajouter les reports ayant abouti à une action
    for (const report of actionedReports) {
      const moderatedByData = report.moderatedBy as unknown as { _id: string; prenom: string; nom: string } | null;
      timeline.push({
        type: 'report_action',
        date: report.moderatedAt || report.dateCreation,
        action: 'report:action_taken',
        reason: report.reason,
        moderator: moderatedByData || null,
        details: {
          reportId: report._id,
          reportReason: report.reason,
          actionTaken: report.action,
        },
      });
    }

    // Trier par date décroissante
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Stats résumé
    const summary = {
      totalWarnings: user.warnings?.length || 0,
      activeWarnings: user.warnings?.filter(w => !w.expiresAt || new Date(w.expiresAt) > new Date()).length || 0,
      totalSuspensions: moderationActions.filter(a => a.action === 'user:suspend').length,
      totalBans: moderationActions.filter(a => a.action === 'user:ban').length,
      currentlyBanned: !!user.bannedAt,
      currentlySuspended: user.suspendedUntil ? new Date(user.suspendedUntil) > new Date() : false,
      accountAge: Math.floor((Date.now() - new Date(user.dateCreation).getTime()) / (1000 * 60 * 60 * 24)),
    };

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          dateCreation: user.dateCreation,
        },
        status: {
          bannedAt: user.bannedAt,
          banReason: user.banReason,
          suspendedUntil: user.suspendedUntil,
          suspendReason: user.suspendReason,
        },
        summary,
        timeline: timeline.slice(0, 100), // Limiter à 100 entrées
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer l'activité complète d'un utilisateur
 * GET /api/admin/users/:id/activity
 *
 * Agrège:
 * - Publications créées
 * - Commentaires créés
 * - Reports envoyés
 * - Sanctions reçues (warnings, suspensions, bans)
 * - Audit logs où l'utilisateur est la cible
 *
 * Filtres disponibles:
 * - type: 'publication' | 'commentaire' | 'report' | 'sanction' | 'all'
 * - dateFrom, dateTo: filtrage par période
 */
export const getUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Vérifier que l'utilisateur existe
    const user = await Utilisateur.findById(userId)
      .select('_id prenom nom email avatar role bannedAt banReason suspendedUntil suspendReason warnings dateCreation')
      .lean();

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    // Filtres
    const typeFilter = req.query.type as string || 'all';
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;

    // Construire le filtre de date commun
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.$gte = dateFrom;
    if (dateTo) dateFilter.$lte = dateTo;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Structure pour collecter les activités
    interface ActivityItem {
      type: 'publication' | 'commentaire' | 'report_sent' | 'sanction';
      date: Date;
      data: Record<string, unknown>;
    }
    const activities: ActivityItem[] = [];

    // 1. Publications créées par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'publication') {
      const pubQuery: Record<string, unknown> = { auteur: new mongoose.Types.ObjectId(userId) };
      if (hasDateFilter) pubQuery.dateCreation = dateFilter;

      const publications = await Publication.find(pubQuery)
        .select('_id contenu medias dateCreation')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const pub of publications) {
        activities.push({
          type: 'publication',
          date: pub.dateCreation,
          data: {
            _id: pub._id,
            contenu: (pub as any).contenu?.substring(0, 200) || '',
            hasMedia: ((pub as any).medias?.length || 0) > 0,
            mediaCount: (pub as any).medias?.length || 0,
          },
        });
      }
    }

    // 2. Commentaires créés par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'commentaire') {
      const comQuery: Record<string, unknown> = { auteur: new mongoose.Types.ObjectId(userId) };
      if (hasDateFilter) comQuery.dateCreation = dateFilter;

      const commentaires = await Commentaire.find(comQuery)
        .select('_id contenu publication dateCreation')
        .populate('publication', '_id')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const com of commentaires) {
        activities.push({
          type: 'commentaire',
          date: com.dateCreation,
          data: {
            _id: com._id,
            contenu: (com as any).contenu?.substring(0, 200) || '',
            publicationId: (com.publication as any)?._id || null,
          },
        });
      }
    }

    // 3. Reports envoyés par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'report') {
      const reportQuery: Record<string, unknown> = { reporter: new mongoose.Types.ObjectId(userId) };
      if (hasDateFilter) reportQuery.dateCreation = dateFilter;

      const reports = await Report.find(reportQuery)
        .select('_id targetType targetId reason status dateCreation')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const report of reports) {
        activities.push({
          type: 'report_sent',
          date: report.dateCreation,
          data: {
            _id: report._id,
            targetType: report.targetType,
            targetId: report.targetId,
            reason: report.reason,
            status: report.status,
          },
        });
      }
    }

    // 4. Sanctions reçues (via AuditLog)
    if (typeFilter === 'all' || typeFilter === 'sanction') {
      const sanctionQuery: Record<string, unknown> = {
        targetType: 'utilisateur',
        targetId: new mongoose.Types.ObjectId(userId),
        action: { $in: ['user:warn', 'user:suspend', 'user:ban', 'user:unban', 'user:unsuspend'] },
      };
      if (hasDateFilter) sanctionQuery.dateCreation = dateFilter;

      const sanctions = await AuditLog.find(sanctionQuery)
        .populate('actor', '_id prenom nom')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const sanction of sanctions) {
        const actorData = sanction.actor as unknown as { _id: string; prenom: string; nom: string } | null;
        activities.push({
          type: 'sanction',
          date: sanction.dateCreation,
          data: {
            _id: sanction._id,
            action: sanction.action,
            reason: sanction.reason,
            moderator: actorData ? { _id: actorData._id, prenom: actorData.prenom, nom: actorData.nom } : null,
            snapshot: sanction.snapshot,
          },
        });
      }
    }

    // Trier par date décroissante
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination manuelle sur les résultats agrégés
    const total = activities.length;
    const paginatedActivities = activities.slice((page - 1) * limit, page * limit);

    // Stats résumé
    const stats = {
      totalPublications: activities.filter(a => a.type === 'publication').length,
      totalCommentaires: activities.filter(a => a.type === 'commentaire').length,
      totalReportsSent: activities.filter(a => a.type === 'report_sent').length,
      totalSanctions: activities.filter(a => a.type === 'sanction').length,
    };

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          dateCreation: user.dateCreation,
        },
        stats,
        activities: paginatedActivities,
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
 * Statistiques globales des utilisateurs
 * GET /api/admin/users/stats
 */
export const getUsersStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();

    // Exécuter toutes les requêtes en parallèle pour la performance
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      roleStats,
      registrationStats,
      warningStats,
    ] = await Promise.all([
      // Total des utilisateurs
      Utilisateur.countDocuments(),

      // Utilisateurs actifs (ni bannis, ni suspendus)
      Utilisateur.countDocuments({
        bannedAt: null,
        $or: [
          { suspendedUntil: null },
          { suspendedUntil: { $lte: now } },
        ],
      }),

      // Utilisateurs suspendus
      Utilisateur.countDocuments({
        suspendedUntil: { $gt: now },
        bannedAt: null,
      }),

      // Utilisateurs bannis
      Utilisateur.countDocuments({
        bannedAt: { $ne: null },
      }),

      // Répartition par rôle
      Utilisateur.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Inscriptions des 30 derniers jours
      Utilisateur.aggregate([
        {
          $match: {
            dateCreation: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
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

      // Utilisateurs avec des avertissements actifs
      Utilisateur.aggregate([
        { $unwind: '$warnings' },
        {
          $match: {
            $or: [
              { 'warnings.expiresAt': null },
              { 'warnings.expiresAt': { $gt: now } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            usersWithActiveWarnings: { $addToSet: '$_id' },
            totalActiveWarnings: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Formater les stats par rôle
    const byRole = roleStats.reduce(
      (acc: Record<string, number>, stat: { _id: string; count: number }) => {
        acc[stat._id] = stat.count;
        return acc;
      },
      {}
    );

    // Stats des avertissements
    const warningData = warningStats[0] || { usersWithActiveWarnings: [], totalActiveWarnings: 0 };

    res.status(200).json({
      succes: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        banned: bannedUsers,
        byRole,
        byStatus: {
          active: activeUsers,
          suspended: suspendedUsers,
          banned: bannedUsers,
        },
        warnings: {
          usersWithActiveWarnings: warningData.usersWithActiveWarnings.length,
          totalActiveWarnings: warningData.totalActiveWarnings,
        },
        registrations: {
          last30Days: registrationStats,
          total30Days: registrationStats.reduce(
            (sum: number, day: { count: number }) => sum + day.count,
            0
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les reports créés par un utilisateur (safe)
 * GET /api/admin/users/:id/reports
 */
export const getUserReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ reporter: new mongoose.Types.ObjectId(userId) })
        .select('_id targetType targetId reason status dateCreation moderatedAt')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments({ reporter: new mongoose.Types.ObjectId(userId) }),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        reports,
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
