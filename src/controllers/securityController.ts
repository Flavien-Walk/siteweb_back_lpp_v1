import { Request, Response, NextFunction } from 'express';
import SecurityEvent from '../models/SecurityEvent.js';
import BlockedIP from '../models/BlockedIP.js';
import { invalidateBlockedIPCache } from '../middlewares/securityMonitor.js';

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

      // Stats navigateurs (24h)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h }, navigateur: { $ne: 'Inconnu' } } },
        { $group: { _id: '$navigateur', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Stats OS (24h)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h }, os: { $ne: 'Inconnu' } } },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Stats appareils (24h)
      SecurityEvent.aggregate([
        { $match: { dateCreation: { $gte: derniere24h }, appareil: { $ne: 'Inconnu' } } },
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

/**
 * GET /api/admin/security/events/:id
 * Detail complet d'un evenement de securite
 */
export const getSecurityEventDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = await SecurityEvent.findById(req.params.id).lean();
    if (!event) {
      res.status(404).json({ succes: false, message: 'Evenement non trouve' });
      return;
    }

    // Chercher les events liés (même IP, même heure +/- 5 min)
    const windowStart = new Date((event as any).dateCreation.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date((event as any).dateCreation.getTime() + 5 * 60 * 1000);

    const [relatedEvents, ipHistory] = await Promise.all([
      SecurityEvent.find({
        _id: { $ne: event._id },
        ip: (event as any).ip,
        dateCreation: { $gte: windowStart, $lte: windowEnd },
      })
        .sort({ dateCreation: -1 })
        .limit(20)
        .select('type severity method path details blocked dateCreation')
        .lean(),

      // Historique global de cette IP
      SecurityEvent.aggregate([
        { $match: { ip: (event as any).ip } },
        { $group: { _id: '$type', count: { $sum: 1 }, lastSeen: { $max: '$dateCreation' } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Verifier si l'IP est bloquée
    const ipBlocked = await BlockedIP.findOne({ ip: (event as any).ip, actif: true }).lean();

    res.json({
      succes: true,
      data: {
        event,
        relatedEvents,
        ipHistory,
        ipBlocked: !!ipBlocked,
        ipBlockedInfo: ipBlocked || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/investigate/:ip
 * Enquete approfondie sur une adresse IP
 */
export const investigateIP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ip } = req.params;
    const now = new Date();
    const derniere24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const derniere7j = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dernier30j = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      events24h,
      events7j,
      recentEvents,
      typeBreakdown,
      severityBreakdown,
      timelineHoraire,
      navigateursUtilises,
      osUtilises,
      appareilsUtilises,
      pathsCibles,
      premiereApparition,
      derniereApparition,
      ipBlockedInfo,
    ] = await Promise.all([
      SecurityEvent.countDocuments({ ip }),
      SecurityEvent.countDocuments({ ip, dateCreation: { $gte: derniere24h } }),
      SecurityEvent.countDocuments({ ip, dateCreation: { $gte: derniere7j } }),

      // 50 derniers events de cette IP
      SecurityEvent.find({ ip })
        .sort({ dateCreation: -1 })
        .limit(50)
        .lean(),

      // Repartition par type
      SecurityEvent.aggregate([
        { $match: { ip } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Repartition par severite
      SecurityEvent.aggregate([
        { $match: { ip } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),

      // Timeline horaire (7 derniers jours)
      SecurityEvent.aggregate([
        { $match: { ip, dateCreation: { $gte: derniere7j } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$dateCreation' } },
              hour: { $hour: '$dateCreation' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1, '_id.hour': 1 } },
      ]),

      // Navigateurs utilises
      SecurityEvent.aggregate([
        { $match: { ip, navigateur: { $ne: 'Inconnu' } } },
        { $group: { _id: '$navigateur', count: { $sum: 1 }, lastSeen: { $max: '$dateCreation' } } },
        { $sort: { count: -1 } },
      ]),

      // OS utilises
      SecurityEvent.aggregate([
        { $match: { ip, os: { $ne: 'Inconnu' } } },
        { $group: { _id: '$os', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Appareils utilises
      SecurityEvent.aggregate([
        { $match: { ip, appareil: { $ne: 'Inconnu' } } },
        { $group: { _id: '$appareil', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Paths cibles
      SecurityEvent.aggregate([
        { $match: { ip } },
        { $group: { _id: '$path', count: { $sum: 1 }, types: { $addToSet: '$type' }, methods: { $addToSet: '$method' } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),

      // Premiere apparition
      SecurityEvent.findOne({ ip }).sort({ dateCreation: 1 }).select('dateCreation').lean(),

      // Derniere apparition
      SecurityEvent.findOne({ ip }).sort({ dateCreation: -1 }).select('dateCreation').lean(),

      // IP bloquee ?
      BlockedIP.findOne({ ip, actif: true }).populate('bloquePar', 'prenom nom').lean(),
    ]);

    // Calculer un score de danger (0-100)
    let dangerScore = 0;
    const sevMap: Record<string, number> = {};
    for (const s of severityBreakdown) {
      sevMap[s._id] = s.count;
    }
    dangerScore += Math.min((sevMap.critical || 0) * 20, 40);
    dangerScore += Math.min((sevMap.high || 0) * 5, 25);
    dangerScore += Math.min((sevMap.medium || 0) * 2, 15);
    dangerScore += Math.min((sevMap.low || 0) * 0.5, 5);
    // Bonus si beaucoup d'events recents
    if (events24h > 20) dangerScore += 10;
    if (events7j > 100) dangerScore += 5;
    dangerScore = Math.min(Math.round(dangerScore), 100);

    let dangerLevel: 'faible' | 'moyen' | 'eleve' | 'critique' = 'faible';
    if (dangerScore >= 75) dangerLevel = 'critique';
    else if (dangerScore >= 50) dangerLevel = 'eleve';
    else if (dangerScore >= 25) dangerLevel = 'moyen';

    res.json({
      succes: true,
      data: {
        ip,
        dangerScore,
        dangerLevel,
        estBloquee: !!ipBlockedInfo,
        blocageInfo: ipBlockedInfo || null,
        resume: {
          totalEvents,
          events24h,
          events7j,
          premiereApparition: (premiereApparition as any)?.dateCreation || null,
          derniereApparition: (derniereApparition as any)?.dateCreation || null,
        },
        repartitionTypes: typeBreakdown.map((t: any) => ({ type: t._id, count: t.count })),
        repartitionSeverite: severityBreakdown.map((s: any) => ({ severite: s._id, count: s.count })),
        empreinteNumerique: {
          navigateurs: navigateursUtilises.map((n: any) => ({ nom: n._id, count: n.count, dernierVu: n.lastSeen })),
          os: osUtilises.map((o: any) => ({ nom: o._id, count: o.count })),
          appareils: appareilsUtilises.map((a: any) => ({ nom: a._id, count: a.count })),
        },
        pathsCibles: pathsCibles.map((p: any) => ({ chemin: p._id, count: p.count, types: p.types, methodes: p.methods })),
        timelineHoraire,
        derniersEvenements: recentEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/security/block-ip
 * Bloquer une adresse IP
 */
export const blockIP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ip, raison, duree } = req.body;

    if (!ip || !raison) {
      res.status(400).json({ succes: false, message: 'IP et raison sont requis' });
      return;
    }

    // Verifier si deja bloquee
    const existing = await BlockedIP.findOne({ ip, actif: true });
    if (existing) {
      res.status(409).json({ succes: false, message: 'Cette IP est deja bloquee' });
      return;
    }

    const userId = (req as any).utilisateur?._id;
    const blockedIP = await BlockedIP.create({
      ip,
      raison,
      bloquePar: userId,
      expireAt: duree ? new Date(Date.now() + duree * 60 * 60 * 1000) : null, // duree en heures
    });

    // Invalider le cache
    invalidateBlockedIPCache(ip);

    // Logger l'action
    await SecurityEvent.create({
      type: 'ip_blocked',
      severity: 'high',
      ip,
      userAgent: '',
      navigateur: 'N/A',
      os: 'N/A',
      appareil: 'N/A',
      method: 'ADMIN',
      path: '/security/block-ip',
      statusCode: 200,
      details: `IP bloquee manuellement: ${raison}`,
      metadata: { bloquePar: userId?.toString(), duree: duree || 'permanent' },
      userId: userId?.toString(),
      blocked: true,
    });

    res.status(201).json({
      succes: true,
      message: `IP ${ip} bloquee avec succes`,
      data: blockedIP,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/security/unblock-ip/:id
 * Debloquer une adresse IP
 */
export const unblockIP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const blockedIP = await BlockedIP.findById(req.params.id);
    if (!blockedIP) {
      res.status(404).json({ succes: false, message: 'Blocage non trouve' });
      return;
    }

    blockedIP.actif = false;
    await blockedIP.save();

    // Invalider le cache
    invalidateBlockedIPCache(blockedIP.ip);

    res.json({
      succes: true,
      message: `IP ${blockedIP.ip} debloquee avec succes`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/blocked-ips
 * Liste des IPs bloquees
 */
export const getBlockedIPs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { actif } = req.query;
    const filter: any = {};
    if (actif === 'true') filter.actif = true;
    else if (actif === 'false') filter.actif = false;

    const blockedIPs = await BlockedIP.find(filter)
      .sort({ dateCreation: -1 })
      .populate('bloquePar', 'prenom nom')
      .lean();

    res.json({
      succes: true,
      data: blockedIPs,
      total: blockedIPs.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/events
 * Lister les evenements avec filtres et pagination
 */
export const getSecurityEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      type,
      severity,
      ip,
      blocked,
      dateDebut,
      dateFin,
    } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (ip) filter.ip = { $regex: ip, $options: 'i' };
    if (blocked === 'true') filter.blocked = true;
    if (dateDebut || dateFin) {
      filter.dateCreation = {};
      if (dateDebut) filter.dateCreation.$gte = new Date(dateDebut as string);
      if (dateFin) filter.dateCreation.$lte = new Date(dateFin as string);
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      SecurityEvent.find(filter)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      SecurityEvent.countDocuments(filter),
    ]);

    res.json({
      succes: true,
      data: events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};
