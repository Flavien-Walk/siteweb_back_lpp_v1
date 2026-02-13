import { Request, Response, NextFunction } from 'express';
import SecurityEvent from '../models/SecurityEvent.js';

/**
 * GET /api/admin/security/dashboard
 * Dashboard cybersecurite - detection d'intrusion et monitoring serveur
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

    const [
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
      topSuspiciousIPs,
      recentEvents,
      hourlyTrend,
      severityDistribution,
      dailyTrend,
      topAttackedPaths,
      criticalEvents,
      topOffenderIPs,
    ] = await Promise.all([
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

      // Top IPs (24h)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h } } },
        { $group: { _id: '$ip', count: { $sum: 1 }, types: { $addToSet: '$type' }, lastSeen: { $max: '$dateCreation' }, maxSeverity: { $max: '$severity' } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
        { $project: { ip: '$_id', count: 1, types: 1, lastSeen: 1, maxSeverity: 1, _id: 0 } },
      ]),

      // Feed temps reel (50 derniers)
      SecurityEvent.find()
        .sort({ dateCreation: -1 })
        .limit(50)
        .select('type severity ip method path statusCode details blocked dateCreation')
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
        .select('type ip method path details blocked dateCreation metadata')
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
          },
        },
        { $sort: { totalEvents: -1 } },
        { $limit: 10 },
        { $project: { ip: '$_id', totalEvents: 1, criticalCount: 1, types: 1, firstSeen: 1, lastSeen: 1, _id: 0 } },
      ]),
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
          totalEvents24h,
          totalEvents7j,
          criticalEvents24h,
          highEvents24h,
          blockedEvents24h,
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
        },
        severityBreakdown: {
          critical: severityMap.critical || 0,
          high: severityMap.high || 0,
          medium: severityMap.medium || 0,
          low: severityMap.low || 0,
        },
        topSuspiciousIPs,
        recentEvents,
        hourlyTrend,
        dailyTrend,
        topAttackedPaths,
        criticalEvents,
        topOffenderIPs,
      },
    });
  } catch (error) {
    next(error);
  }
};
