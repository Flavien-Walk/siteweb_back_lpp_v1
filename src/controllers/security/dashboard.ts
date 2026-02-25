/**
 * security/dashboard.ts
 * Dashboard cybersecurite complet - detection d'intrusion et monitoring serveur
 */
import { Request, Response, NextFunction } from 'express';
import SecurityEvent from '../../models/SecurityEvent.js';
import BlockedIP from '../../models/BlockedIP.js';

/**
 * GET /api/admin/security/dashboard
 * Dashboard cybersecurite complet - detection d'intrusion et monitoring serveur
 */
export const getSecurityDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const now = new Date();
    const derniere1h = new Date(now.getTime() - 60 * 60 * 1000);
    const derniere24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const derniere7j = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dernier30j = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalEvents1h,
      totalEvents24h,
      totalEvents7j,
      criticalEvents24h,
      highEvents24h,
      blockedEvents24h,
      bruteForceCount,
      injectionCount,
      rateLimitCount,
      unauthorizedCount,
      forbiddenCount,
      tokenForgeryCount,
      suspiciousSignupCount,
      corsViolationCount,
      anomalyCount,
      ipBlockedCount,
      blockedIPsActifs,
      topSuspiciousIPs,
      recentEvents,
      hourlyTrend,
      severityDistribution,
      dailyTrend,
      topAttackedPaths,
      criticalEvents,
      topOffenderIPs,
      navigateurStats,
      osStats,
      appareilStats,
      topBlockedIPs,
    ] = await Promise.all([
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere1h } }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h } }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere7j } }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, severity: 'critical' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, severity: 'high' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, blocked: true }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'brute_force' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'injection_attempt' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'rate_limit_hit' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'unauthorized_access' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'forbidden_access' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'token_forgery' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'suspicious_signup' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'cors_violation' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'anomaly' }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere24h }, type: 'ip_blocked' }),

      // IPs bloquees actives
      BlockedIP.countDocuments({ actif: true }),

      // Top IPs suspectes (24h)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h } } },
        {
          $group: {
            _id: '$ip',
            count: { $sum: 1 },
            types: { $addToSet: '$type' },
            lastSeen: { $max: '$dateCreation' },
            maxSeverity: { $max: '$severity' },
            navigateurs: { $addToSet: '$navigateur' },
            appareils: { $addToSet: '$appareil' },
            os: { $addToSet: '$os' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 15 },
        { $project: { ip: '$_id', count: 1, types: 1, lastSeen: 1, maxSeverity: 1, navigateurs: 1, appareils: 1, os: 1, _id: 0 } },
      ]),

      // Feed temps reel (100 derniers)
      SecurityEvent.find()
        .sort({ dateCreation: -1 })
        .limit(100)
        .select('type severity ip method path statusCode details blocked dateCreation navigateur os appareil userAgent metadata')
        .lean(),

      // Tendance horaire (24h)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h } } },
        {
          $group: {
            _id: { hour: { $hour: '$dateCreation' }, day: { $dayOfMonth: '$dateCreation' } },
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
            blocked: { $sum: { $cond: ['$blocked', 1, 0] } },
          },
        },
        { $sort: { '_id.day': 1, '_id.hour': 1 } },
      ]),

      // Repartition severite (7j)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere7j } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),

      // Tendance quotidienne (7j)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere7j } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$dateCreation' } },
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
            low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top paths attaques (30j)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: dernier30j }, type: { $in: ['injection_attempt', 'unauthorized_access', 'brute_force'] } } },
        { $group: { _id: '$path', count: { $sum: 1 }, types: { $addToSet: '$type' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { path: '$_id', count: 1, types: 1, _id: 0 } },
      ]),

      // Events critiques recents
      SecurityEvent.find({ severity: 'critical', dateCreation: { $gte: derniere7j } })
        .sort({ dateCreation: -1 })
        .limit(20)
        .select('type ip method path details blocked dateCreation metadata navigateur os appareil')
        .lean(),

      // Top offenders (30j)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: dernier30j }, severity: { $in: ['high', 'critical'] } } },
        {
          $group: {
            _id: '$ip',
            totalEvents: { $sum: 1 },
            criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
            types: { $addToSet: '$type' },
            firstSeen: { $min: '$dateCreation' },
            lastSeen: { $max: '$dateCreation' },
            navigateurs: { $addToSet: '$navigateur' },
            os: { $addToSet: '$os' },
            appareils: { $addToSet: '$appareil' },
          },
        },
        { $sort: { totalEvents: -1 } },
        { $limit: 10 },
        { $project: { ip: '$_id', totalEvents: 1, criticalCount: 1, types: 1, firstSeen: 1, lastSeen: 1, navigateurs: 1, os: 1, appareils: 1, _id: 0 } },
      ]),

      // Stats navigateurs (24h) - exclure null, vide, et 'Inconnu'
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h }, navigateur: { $nin: ['Inconnu', null, ''] } } },
        { $group: { _id: '$navigateur', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Stats OS (24h) - exclure null, vide, et 'Inconnu'
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h }, os: { $nin: ['Inconnu', null, ''] } } },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Stats appareils (24h) - exclure null, vide, et 'Inconnu'
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h }, appareil: { $nin: ['Inconnu', null, ''] } } },
        { $group: { _id: '$appareil', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // IPs bloquees recentes
      BlockedIP.find({ actif: true })
        .sort({ dateCreation: -1 })
        .limit(20)
        .populate('bloquePar', 'prenom nom')
        .lean(),
    ]);

    // Calculer le niveau de menace global
    let threatLevel: 'normal' | 'elevated' | 'high' | 'critical' = 'normal';
    if (criticalEvents24h > 0) threatLevel = 'critical';
    else if (highEvents24h > 5) threatLevel = 'high';
    else if (totalEvents24h > 50) threatLevel = 'elevated';

    // Mapper la repartition severite
    const severityMap: Record<string, number> = {};
    for (const s of severityDistribution) {
      severityMap[s._id] = s.count;
    }

    res.json({
      succes: true,
      data: {
        threatLevel,
        lastUpdated: now.toISOString(),
        summary: {
          totalEvents1h,
          totalEvents24h,
          totalEvents7j,
          criticalEvents24h,
          highEvents24h,
          blockedEvents24h,
          blockedIPsActifs,
          eventsPerHour: Math.round(totalEvents24h / 24 * 10) / 10,
        },
        attackTypes: {
          brute_force: bruteForceCount,
          injection_attempt: injectionCount,
          rate_limit_hit: rateLimitCount,
          unauthorized_access: unauthorizedCount,
          forbidden_access: forbiddenCount,
          token_forgery: tokenForgeryCount,
          suspicious_signup: suspiciousSignupCount,
          cors_violation: corsViolationCount,
          anomaly: anomalyCount,
          ip_blocked: ipBlockedCount,
        },
        severityBreakdown: {
          critical: severityMap.critical || 0,
          high: severityMap.high || 0,
          medium: severityMap.medium || 0,
          low: severityMap.low || 0,
        },
        deviceStats: {
          navigateurs: navigateurStats.map((n: any) => ({ nom: n._id, count: n.count })),
          os: osStats.map((o: any) => ({ nom: o._id, count: o.count })),
          appareils: appareilStats.map((a: any) => ({ nom: a._id, count: a.count })),
        },
        topSuspiciousIPs,
        recentEvents,
        hourlyTrend,
        dailyTrend,
        topAttackedPaths,
        criticalEvents,
        topOffenderIPs,
        blockedIPs: topBlockedIPs,
      },
    });
  } catch (error) {
    next(error);
  }
};
