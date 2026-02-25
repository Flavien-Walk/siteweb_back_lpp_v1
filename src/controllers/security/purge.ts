/**
 * security/purge.ts
 * Purge des donnees de securite avec archivage et historique
 */
import { Request, Response, NextFunction } from 'express';
import SecurityEvent from '../../models/SecurityEvent.js';
import BlockedIP from '../../models/BlockedIP.js';
import BannedDevice from '../../models/BannedDevice.js';
import SecurityPurge from '../../models/SecurityPurge.js';

/**
 * POST /api/admin/security/purge
 * Purger les donnees de securite (avec archivage prealable)
 */
export const purgeSecurityData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { note } = req.body || {};

    // Archiver toutes les donnees avant suppression
    const [events, blockedIPs, bannedDevices] = await Promise.all([
      SecurityEvent.find({}).lean(),
      BlockedIP.find({}).lean(),
      BannedDevice.find({}).lean(),
    ]);

    // Creer l'archive
    const archive = await SecurityPurge.create({
      purgePar: (req as any).utilisateur?._id || 'unknown',
      note: note || '',
      stats: {
        events: events.length,
        blockedIPs: blockedIPs.length,
        bannedDevices: bannedDevices.length,
      },
      archivedEvents: events,
      archivedBlockedIPs: blockedIPs,
      archivedBannedDevices: bannedDevices,
    });

    // Supprimer les donnees
    await Promise.all([
      SecurityEvent.deleteMany({}),
      BlockedIP.deleteMany({}),
      BannedDevice.deleteMany({}),
    ]);

    res.status(200).json({
      succes: true,
      message: 'Donnees archivees et purgees avec succes',
      data: {
        archiveId: archive._id,
        eventsSupprimes: events.length,
        ipsDebloquees: blockedIPs.length,
        appareilsDebannis: bannedDevices.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/purge-history
 * Historique des purges
 */
export const getPurgeHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const purges = await SecurityPurge.find({})
      .select('purgePar note stats dateCreation')
      .sort({ dateCreation: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ succes: true, data: purges });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/security/purge/:id
 * Detail d'une purge archivee
 */
export const getPurgeDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const purge = await SecurityPurge.findById(id).lean();

    if (!purge) {
      res.status(404).json({ succes: false, message: 'Archive introuvable' });
      return;
    }

    res.status(200).json({ succes: true, data: purge });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/security/purge/:id
 * Supprimer definitivement une archive de purge
 */
export const deletePurge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const purge = await SecurityPurge.findByIdAndDelete(id);

    if (!purge) {
      res.status(404).json({ succes: false, message: 'Archive introuvable' });
      return;
    }

    res.status(200).json({ succes: true, message: 'Archive supprimee definitivement' });
  } catch (error) {
    next(error);
  }
};
