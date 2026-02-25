/**
 * security/ipManagement.ts
 * Investigation, blocage et deblocage d'adresses IP
 */
import { Request, Response, NextFunction } from 'express';
import SecurityEvent from '../../models/SecurityEvent.js';
import BlockedIP from '../../models/BlockedIP.js';
import { invalidateBlockedIPCache } from '../../middlewares/securityMonitor.js';

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
