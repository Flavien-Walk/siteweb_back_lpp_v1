import { Request, Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog.js';
import Report from '../models/Report.js';
import Utilisateur from '../models/Utilisateur.js';

/**
 * GET /api/admin/security/dashboard
 * Tableau de bord securite pour l'outil de moderation
 */
export const getSecurityDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();
    const derniere24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const derniere7j = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dernier30j = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Requetes paralleles pour toutes les metriques
    const [
      // Actions de moderation recentes (potentielles attaques/abus)
      recentModerationActions,
      // Signalements critiques
      criticalReports,
      highReports,
      // Escalades recentes
      recentEscalations,
      // Sanctions appliquees
      sanctionsLast24h,
      sanctionsLast7d,
      // Utilisateurs sous surveillance
      surveillanceCount,
      // Utilisateurs bannis recemment
      recentBans,
      // Utilisateurs suspendus actifs
      activeSuspensions,
      // Distribution des signalements par raison (30j)
      reportsByReason,
      // Tendance signalements par jour (7j)
      reportsTrend,
      // Actions par moderateur (7j)
      actionsByModerator,
      // Top utilisateurs signales
      topReportedUsers,
      // Auto-escalades declenchees
      autoEscalations,
      // Audit logs securite (actions sensibles)
      securityAuditLogs,
    ] = await Promise.all([
      // Actions moderation 24h
      AuditLog.find({ dateCreation: { $gte: derniere24h } })
        .populate('actor', '_id prenom nom avatar')
        .sort({ dateCreation: -1 })
        .limit(50)
        .lean(),

      // Reports critiques en attente
      Report.countDocuments({ status: 'pending', priority: 'critical' }),
      Report.countDocuments({ status: 'pending', priority: 'high' }),

      // Escalades 7j
      Report.find({
        escalatedAt: { $gte: derniere7j },
      })
        .select('targetType reason priority escalationReason escalatedAt')
        .sort({ escalatedAt: -1 })
        .limit(20)
        .lean(),

      // Sanctions 24h et 7j
      AuditLog.countDocuments({
        dateCreation: { $gte: derniere24h },
        action: { $in: ['user:warn', 'user:suspend', 'user:ban'] },
      }),
      AuditLog.countDocuments({
        dateCreation: { $gte: derniere7j },
        action: { $in: ['user:warn', 'user:suspend', 'user:ban'] },
      }),

      // Surveillance
      Utilisateur.countDocuments({ 'surveillance.active': true }),

      // Bans recents (30j)
      Utilisateur.find({ bannedAt: { $gte: dernier30j } })
        .select('_id prenom nom avatar bannedAt banReason')
        .sort({ bannedAt: -1 })
        .limit(10)
        .lean(),

      // Suspensions actives
      Utilisateur.find({ suspendedUntil: { $gt: now } })
        .select('_id prenom nom avatar suspendedUntil suspendReason')
        .sort({ suspendedUntil: -1 })
        .lean(),

      // Distribution signalements par raison (30j)
      Report.aggregate([
        { $match: { dateCreation: { $gte: dernier30j } } },
        { $group: { _id: '$reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Tendance signalements (7 derniers jours)
      Report.aggregate([
        { $match: { dateCreation: { $gte: derniere7j } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$dateCreation' },
            },
            count: { $sum: 1 },
            critical: {
              $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] },
            },
            high: {
              $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Actions par moderateur (7j)
      AuditLog.aggregate([
        { $match: { dateCreation: { $gte: derniere7j } } },
        {
          $group: {
            _id: '$actor',
            totalActions: { $sum: 1 },
            warns: { $sum: { $cond: [{ $eq: ['$action', 'user:warn'] }, 1, 0] } },
            suspensions: { $sum: { $cond: [{ $eq: ['$action', 'user:suspend'] }, 1, 0] } },
            bans: { $sum: { $cond: [{ $eq: ['$action', 'user:ban'] }, 1, 0] } },
            contentActions: {
              $sum: {
                $cond: [
                  { $in: ['$action', ['content:hide', 'content:delete', 'content:edit']] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        { $sort: { totalActions: -1 } },
        { $limit: 10 },
      ]),

      // Top utilisateurs signales (30j)
      Report.aggregate([
        {
          $match: {
            dateCreation: { $gte: dernier30j },
            targetType: 'utilisateur',
          },
        },
        {
          $group: {
            _id: '$targetId',
            count: { $sum: 1 },
            reasons: { $addToSet: '$reason' },
            maxPriority: { $max: '$priority' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Auto-escalades (7j)
      Report.countDocuments({
        escalatedAt: { $gte: derniere7j },
        escalationReason: { $regex: /^Auto-escalade/ },
      }),

      // Audit logs securite (actions sensibles 24h)
      AuditLog.find({
        dateCreation: { $gte: derniere24h },
        action: {
          $in: [
            'user:ban', 'user:unban',
            'user:suspend', 'user:unsuspend',
            'user:change_role',
            'content:delete',
            'user:surveillance_on', 'user:surveillance_off',
          ],
        },
      })
        .populate('actor', '_id prenom nom')
        .sort({ dateCreation: -1 })
        .limit(30)
        .lean(),
    ]);

    // Enrichir les actions par moderateur avec les noms
    const moderatorIds = actionsByModerator.map((m: any) => m._id).filter(Boolean);
    const moderators = await Utilisateur.find({ _id: { $in: moderatorIds } })
      .select('_id prenom nom avatar')
      .lean();
    const modMap = new Map(moderators.map((m: any) => [m._id.toString(), m]));

    const enrichedModeratorActions = actionsByModerator.map((m: any) => ({
      ...m,
      moderator: m._id ? modMap.get(m._id.toString()) || null : null,
    }));

    // Enrichir top reported users
    const reportedUserIds = topReportedUsers.map((u: any) => u._id).filter(Boolean);
    const reportedUsers = await Utilisateur.find({ _id: { $in: reportedUserIds } })
      .select('_id prenom nom avatar warnings surveillance bannedAt suspendedUntil')
      .lean();
    const reportedMap = new Map(reportedUsers.map((u: any) => [u._id.toString(), u]));

    const enrichedReportedUsers = topReportedUsers.map((r: any) => ({
      ...r,
      user: r._id ? reportedMap.get(r._id.toString()) || null : null,
    }));

    // Calculer le score de securite global (0-100)
    let securityScore = 100;
    if (criticalReports > 0) securityScore -= Math.min(30, criticalReports * 10);
    if (highReports > 0) securityScore -= Math.min(20, highReports * 5);
    if (sanctionsLast24h > 10) securityScore -= 10;
    if (activeSuspensions.length > 5) securityScore -= 5;
    securityScore = Math.max(0, securityScore);

    // Determiner le niveau d'alerte
    let alertLevel: 'normal' | 'elevated' | 'high' | 'critical' = 'normal';
    if (criticalReports > 0) alertLevel = 'critical';
    else if (highReports > 2 || sanctionsLast24h > 5) alertLevel = 'high';
    else if (highReports > 0 || sanctionsLast24h > 2) alertLevel = 'elevated';

    res.status(200).json({
      succes: true,
      data: {
        // Score et niveau d'alerte
        securityScore,
        alertLevel,

        // Compteurs signalements critiques
        criticalReports,
        highReports,

        // Sanctions
        sanctions: {
          last24h: sanctionsLast24h,
          last7d: sanctionsLast7d,
        },

        // Surveillance
        surveillanceCount,

        // Escalades
        autoEscalations,
        recentEscalations,

        // Bans et suspensions
        recentBans,
        activeSuspensions,

        // Graphiques
        reportsByReason,
        reportsTrend,

        // Moderateurs
        moderatorActions: enrichedModeratorActions,

        // Utilisateurs les plus signales
        topReportedUsers: enrichedReportedUsers,

        // Events securite (actions sensibles)
        securityEvents: securityAuditLogs,

        // Actions recentes completes
        recentActions: recentModerationActions,
      },
    });
  } catch (error) {
    next(error);
  }
};
