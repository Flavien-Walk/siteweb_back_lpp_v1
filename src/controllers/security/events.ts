/**
 * security/events.ts
 * Consultation et detail des evenements de securite
 */
import { Request, Response, NextFunction } from 'express';
import SecurityEvent from '../../models/SecurityEvent.js';
import BlockedIP from '../../models/BlockedIP.js';

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
