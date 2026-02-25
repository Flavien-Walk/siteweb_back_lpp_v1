/**
 * security/devices.ts
 * Gestion des appareils bannis (anti IP dynamique)
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import BannedDevice, { generateDeviceFingerprint } from '../../models/BannedDevice.js';

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
