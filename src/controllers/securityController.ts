import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import SecurityEvent from '../models/SecurityEvent.js';
import BlockedIP from '../models/BlockedIP.js';
import BannedDevice, { generateDeviceFingerprint } from '../models/BannedDevice.js';
import Utilisateur from '../models/Utilisateur.js';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import Projet from '../models/Projet.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';
import AuditLog from '../models/AuditLog.js';
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

// ============================================
// HEALTH CHECK - ANALYSE BACKEND TEMPS REEL
// ============================================

// Collections critiques a verifier avec leurs index attendus
const COLLECTIONS_CRITIQUES = [
  { nom: 'utilisateurs', model: Utilisateur, indexCritiques: ['email_1'] },
  { nom: 'publications', model: Publication, indexCritiques: [] },
  { nom: 'commentaires', model: Commentaire, indexCritiques: [] },
  { nom: 'projets', model: Projet, indexCritiques: [] },
  { nom: 'messages', model: Message, indexCritiques: [] },
  { nom: 'reports', model: Report, indexCritiques: [] },
  { nom: 'audit_logs', model: AuditLog, indexCritiques: [] },
  { nom: 'security_events', model: SecurityEvent, indexCritiques: ['type_1', 'ip_1'] },
  { nom: 'blocked_ips', model: BlockedIP, indexCritiques: ['ip_1'] },
];

// Variables d'environnement critiques (sans exposer les valeurs)
const ENV_VARS_REQUISES = [
  'MONGODB_URI',
  'JWT_SECRET',
  'MESSAGE_ENCRYPTION_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'CLIENT_URL',
];

const ENV_VARS_OPTIONNELLES = [
  'LOCAL_MODERATION_ORIGINS',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'EMAIL_HOST',
  'EMAIL_USER',
  'NODE_ENV',
  'PORT',
];

/**
 * GET /api/admin/security/health
 * Analyse complete de la sante du backend en temps reel
 */
export const getBackendHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const startTime = Date.now();
    const now = new Date();
    const derniere1h = new Date(now.getTime() - 60 * 60 * 1000);
    const derniere24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // ============ 1. ETAT MONGODB ============
    const mongoState = mongoose.connection.readyState;
    const mongoStateLabels: Record<number, string> = {
      0: 'deconnecte',
      1: 'connecte',
      2: 'connexion_en_cours',
      3: 'deconnexion_en_cours',
    };

    let dbPingMs = -1;
    let dbStats: any = null;
    try {
      const pingStart = Date.now();
      await mongoose.connection.db!.admin().ping();
      dbPingMs = Date.now() - pingStart;

      dbStats = await mongoose.connection.db!.stats();
    } catch {
      dbPingMs = -1;
    }

    // ============ 2. VERIFICATION COLLECTIONS ============
    const collectionsResults = await Promise.all(
      COLLECTIONS_CRITIQUES.map(async (col) => {
        try {
          const countStart = Date.now();
          const count = await col.model.estimatedDocumentCount();
          const latenceMs = Date.now() - countStart;

          // Recuperer les index
          let indexes: string[] = [];
          try {
            const rawIndexes = await col.model.collection.indexes();
            indexes = rawIndexes.map((idx: any) => Object.keys(idx.key).join('_'));
          } catch {
            indexes = [];
          }

          // Verifier les index critiques
          const indexManquants = col.indexCritiques.filter(
            (idx) => !indexes.some((i) => i.includes(idx.replace('_1', '')))
          );

          return {
            nom: col.nom,
            statut: 'ok' as const,
            documents: count,
            latenceMs,
            indexes: indexes.length,
            indexManquants: indexManquants.length > 0 ? indexManquants : undefined,
          };
        } catch (err: any) {
          return {
            nom: col.nom,
            statut: 'erreur' as const,
            erreur: err.message?.slice(0, 200),
            documents: 0,
            latenceMs: -1,
            indexes: 0,
          };
        }
      })
    );

    // ============ 3. VARIABLES D'ENVIRONNEMENT ============
    const envCheck = {
      requises: ENV_VARS_REQUISES.map((v) => ({
        nom: v,
        present: !!process.env[v],
        longueur: process.env[v] ? process.env[v]!.length : 0,
      })),
      optionnelles: ENV_VARS_OPTIONNELLES.map((v) => ({
        nom: v,
        present: !!process.env[v],
      })),
      manquantes: ENV_VARS_REQUISES.filter((v) => !process.env[v]),
    };

    // ============ 4. MEMOIRE & SYSTEME ============
    const memUsage = process.memoryUsage();
    const systemInfo = {
      plateforme: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      uptime: {
        processus: Math.floor(process.uptime()),
        systeme: Math.floor(os.uptime()),
        formatProcessus: formatUptime(process.uptime()),
        formatSysteme: formatUptime(os.uptime()),
      },
      memoire: {
        rss: formatBytes(memUsage.rss),
        heapTotal: formatBytes(memUsage.heapTotal),
        heapUsed: formatBytes(memUsage.heapUsed),
        external: formatBytes(memUsage.external),
        heapUsagePct: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        rssRaw: memUsage.rss,
        heapUsedRaw: memUsage.heapUsed,
        heapTotalRaw: memUsage.heapTotal,
      },
      cpus: os.cpus().length,
      memoireSysteme: {
        total: formatBytes(os.totalmem()),
        libre: formatBytes(os.freemem()),
        usagePct: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      },
      pid: process.pid,
    };

    // ============ 5. ANALYSE DE SECURITE EN COURS ============
    const [
      eventsLastHour,
      criticalEventsLastHour,
      blockedIPsActifs,
      activeAttacksCount,
      injectionAttempts24h,
      bruteForceAttempts24h,
      suspiciousSignups24h,
      recentSecurityEvents,
    ] = await Promise.all([
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere1h } }),
      SecurityEvent.countDocuments({ dateCreation: { $gte: derniere1h }, severity: 'critical' }),
      BlockedIP.countDocuments({ actif: true }),
      SecurityEvent.countDocuments({
        dateCreation: { $gte: derniere1h },
        severity: { $in: ['critical', 'high'] },
        blocked: false,
      }),
      SecurityEvent.countDocuments({
        dateCreation: { $gte: derniere24h },
        type: 'injection_attempt',
      }),
      SecurityEvent.countDocuments({
        dateCreation: { $gte: derniere24h },
        type: 'brute_force',
      }),
      SecurityEvent.countDocuments({
        dateCreation: { $gte: derniere24h },
        type: 'suspicious_signup',
      }),
      SecurityEvent.find({ dateCreation: { $gte: derniere1h } })
        .sort({ dateCreation: -1 })
        .limit(10)
        .select('type severity ip details blocked dateCreation')
        .lean(),
    ]);

    // ============ 6. VERIFICATION INTEGRITE DONNEES ============
    const [
      usersWithoutEmail,
      usersWithSuspiciousRoles,
      orphanedReports,
      recentAuditCount,
    ] = await Promise.all([
      // Utilisateurs sans email (anomalie grave)
      Utilisateur.countDocuments({ email: { $exists: false } }).catch(() => -1),
      // Utilisateurs avec role admin non-attendu (possible injection)
      Utilisateur.countDocuments({
        role: { $in: ['super_admin', 'admin_modo'] },
      }).catch(() => -1),
      // Reports sans auteur (possible corruption)
      Report.countDocuments({ auteur: { $exists: false } }).catch(() => -1),
      // Activite audit (si 0 en 24h, possible dysfonctionnement)
      AuditLog.countDocuments({ dateCreation: { $gte: derniere24h } }).catch(() => -1),
    ]);

    const integriteChecks = [
      {
        nom: 'Utilisateurs sans email',
        statut: usersWithoutEmail === 0 ? 'ok' : 'alerte',
        valeur: usersWithoutEmail,
        description: usersWithoutEmail > 0
          ? `${usersWithoutEmail} utilisateur(s) sans email detecte(s) - possible corruption de donnees`
          : 'Tous les utilisateurs ont un email valide',
      },
      {
        nom: 'Comptes administrateurs',
        statut: usersWithSuspiciousRoles <= 5 ? 'ok' : 'alerte',
        valeur: usersWithSuspiciousRoles,
        description: usersWithSuspiciousRoles > 5
          ? `${usersWithSuspiciousRoles} comptes admin detectes - verifier si c\'est normal`
          : `${usersWithSuspiciousRoles} compte(s) admin - nombre normal`,
      },
      {
        nom: 'Reports orphelins',
        statut: orphanedReports === 0 ? 'ok' : 'alerte',
        valeur: orphanedReports,
        description: orphanedReports > 0
          ? `${orphanedReports} report(s) sans auteur - possible suppression de compte`
          : 'Tous les signalements ont un auteur',
      },
      {
        nom: 'Activite audit 24h',
        statut: recentAuditCount > 0 ? 'ok' : 'info',
        valeur: recentAuditCount,
        description: recentAuditCount === 0
          ? 'Aucune action moderee en 24h - normal si pas d\'activite'
          : `${recentAuditCount} action(s) de moderation enregistree(s)`,
      },
    ];

    // ============ 7. CALCUL SCORE SANTE GLOBAL ============
    let healthScore = 100;
    const problemes: string[] = [];

    // MongoDB
    if (mongoState !== 1) { healthScore -= 50; problemes.push('Base de donnees non connectee'); }
    if (dbPingMs > 500) { healthScore -= 10; problemes.push(`Latence DB elevee: ${dbPingMs}ms`); }
    if (dbPingMs > 1000) { healthScore -= 10; problemes.push('Latence DB critique'); }

    // Collections
    const collectionsEnErreur = collectionsResults.filter((c) => c.statut === 'erreur');
    if (collectionsEnErreur.length > 0) {
      healthScore -= collectionsEnErreur.length * 10;
      problemes.push(`${collectionsEnErreur.length} collection(s) en erreur`);
    }

    // Index manquants
    const totalIndexManquants = collectionsResults.reduce(
      (sum, c) => sum + (c.indexManquants?.length || 0), 0
    );
    if (totalIndexManquants > 0) {
      healthScore -= totalIndexManquants * 5;
      problemes.push(`${totalIndexManquants} index manquant(s)`);
    }

    // Variables d'env
    if (envCheck.manquantes.length > 0) {
      healthScore -= envCheck.manquantes.length * 5;
      problemes.push(`${envCheck.manquantes.length} variable(s) d'environnement manquante(s)`);
    }

    // Memoire
    if (systemInfo.memoire.heapUsagePct > 85) {
      healthScore -= 15;
      problemes.push(`Memoire heap elevee: ${systemInfo.memoire.heapUsagePct}%`);
    } else if (systemInfo.memoire.heapUsagePct > 70) {
      healthScore -= 5;
      problemes.push(`Memoire heap moderee: ${systemInfo.memoire.heapUsagePct}%`);
    }

    // Securite
    if (criticalEventsLastHour > 0) {
      healthScore -= 15;
      problemes.push(`${criticalEventsLastHour} evenement(s) critique(s) cette heure`);
    }
    if (activeAttacksCount > 0) {
      healthScore -= 10;
      problemes.push(`${activeAttacksCount} attaque(s) non bloquee(s) cette heure`);
    }
    if (injectionAttempts24h > 10) {
      healthScore -= 5;
      problemes.push(`${injectionAttempts24h} tentatives d'injection en 24h`);
    }

    // Integrite
    const integritePbs = integriteChecks.filter((c) => c.statut === 'alerte');
    if (integritePbs.length > 0) {
      healthScore -= integritePbs.length * 5;
      problemes.push(...integritePbs.map((c) => c.description));
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    let healthStatus: 'sain' | 'degrade' | 'critique' = 'sain';
    if (healthScore < 50) healthStatus = 'critique';
    else if (healthScore < 80) healthStatus = 'degrade';

    const dureeMs = Date.now() - startTime;

    res.json({
      succes: true,
      data: {
        score: healthScore,
        statut: healthStatus,
        timestamp: now.toISOString(),
        dureeAnalyseMs: dureeMs,
        problemes,

        baseDeDonnees: {
          etat: mongoStateLabels[mongoState] || 'inconnu',
          pingMs: dbPingMs,
          nom: dbStats?.db || 'inconnu',
          taille: dbStats ? formatBytes(dbStats.dataSize || 0) : 'inconnu',
          tailleIndex: dbStats ? formatBytes(dbStats.indexSize || 0) : 'inconnu',
          collections: dbStats?.collections || 0,
          objets: dbStats?.objects || 0,
        },

        collectionsDetails: collectionsResults,

        environnement: envCheck,

        systeme: systemInfo,

        securiteEnCours: {
          evenementsHeure: eventsLastHour,
          evenementsCritiquesHeure: criticalEventsLastHour,
          ipsBloquees: blockedIPsActifs,
          attaquesNonBloquees: activeAttacksCount,
          injections24h: injectionAttempts24h,
          bruteForce24h: bruteForceAttempts24h,
          inscriptionsSuspectes24h: suspiciousSignups24h,
          derniersEvenements: recentSecurityEvents,
        },

        integrite: integriteChecks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// GESTION APPAREILS BANNIS (anti IP dynamique)
// ============================================

/**
 * POST /api/admin/security/ban-device
 * Bannir un appareil par son User-Agent (fingerprint SHA-256)
 * Permet de bloquer un attaquant meme si son IP change
 */
export const banDevice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userAgent, raison, duree, navigateur, os: osName, appareil, ipsConnues } = req.body;

    if (!userAgent || userAgent.length < 5) {
      res.status(400).json({ succes: false, message: 'User-Agent requis (min 5 caracteres)' });
      return;
    }
    if (!raison || !raison.trim()) {
      res.status(400).json({ succes: false, message: 'Raison du bannissement requise' });
      return;
    }

    const fingerprint = generateDeviceFingerprint(userAgent);

    // Verifier si deja banni
    const existing = await BannedDevice.findOne({ fingerprint });
    if (existing && existing.actif) {
      res.status(409).json({ succes: false, message: 'Cet appareil est deja banni' });
      return;
    }

    const expireAt = duree ? new Date(Date.now() + duree * 60 * 60 * 1000) : null;

    const bannedDevice = existing
      ? await BannedDevice.findByIdAndUpdate(existing._id, {
          actif: true,
          raison: raison.trim(),
          bloquePar: req.utilisateur?._id || null,
          expireAt,
          ipsConnues: ipsConnues || existing.ipsConnues,
        }, { new: true })
      : await BannedDevice.create({
          fingerprint,
          userAgentRaw: userAgent.slice(0, 500),
          navigateur: navigateur || 'Inconnu',
          os: osName || 'Inconnu',
          appareil: appareil || 'Inconnu',
          raison: raison.trim(),
          bloquePar: req.utilisateur?._id || null,
          actif: true,
          ipsConnues: ipsConnues || [],
          expireAt,
        });

    res.status(201).json({ succes: true, data: bannedDevice });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/security/unban-device/:id
 * Debannir un appareil
 */
export const unbanDevice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ succes: false, message: 'ID invalide' });
      return;
    }

    const device = await BannedDevice.findByIdAndUpdate(id, { actif: false }, { new: true });
    if (!device) {
      res.status(404).json({ succes: false, message: 'Appareil banni non trouve' });
      return;
    }

    res.status(200).json({ succes: true, message: 'Appareil debanni', data: device });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/banned-devices
 * Liste des appareils bannis
 */
export const getBannedDevices = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { actif } = req.query;
    const filtre: Record<string, unknown> = {};
    if (actif !== undefined) filtre.actif = actif === 'true';

    const devices = await BannedDevice.find(filtre)
      .sort({ dateCreation: -1 })
      .limit(50)
      .populate('bloquePar', 'prenom nom')
      .lean();

    res.status(200).json({ succes: true, data: devices });
  } catch (error) {
    next(error);
  }
};

// ============================================
// UTILITAIRES
// ============================================

// ============================================
// PURGE DONNEES SECURITE
// ============================================
export const purgeSecurityData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deletedEvents = await SecurityEvent.deleteMany({});
    const deletedBlockedIPs = await BlockedIP.deleteMany({});
    const deletedBannedDevices = await BannedDevice.deleteMany({});

    res.status(200).json({
      succes: true,
      message: 'Donnees de securite purgees avec succes',
      data: {
        eventsSupprimes: deletedEvents.deletedCount,
        ipsDebloquees: deletedBlockedIPs.deletedCount,
        appareilsDebannis: deletedBannedDevices.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const jours = Math.floor(seconds / 86400);
  const heures = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (jours > 0) parts.push(`${jours}j`);
  if (heures > 0) parts.push(`${heures}h`);
  parts.push(`${minutes}min`);
  return parts.join(' ');
}
