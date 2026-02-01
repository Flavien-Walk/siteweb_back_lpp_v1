import { Request, Response, NextFunction } from 'express';
import Report from '../models/Report.js';
import AuditLog from '../models/AuditLog.js';
import Utilisateur from '../models/Utilisateur.js';

/**
 * Obtenir les données du dashboard admin
 * GET /api/admin/dashboard
 */
export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingReports,
      escalatedReports,
      actionsToday,
      activeUsers,
      bannedUsers,
      suspendedUsers,
    ] = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'pending', escalatedAt: { $ne: null } }),
      AuditLog.countDocuments({ dateCreation: { $gte: today } }),
      Utilisateur.countDocuments({ bannedAt: null }),
      Utilisateur.countDocuments({ bannedAt: { $ne: null } }),
      Utilisateur.countDocuments({ suspendedUntil: { $gt: new Date() } }),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        reports: {
          pending: pendingReports,
          escalated: escalatedReports,
        },
        actionsToday,
        users: {
          active: activeUsers,
          banned: bannedUsers,
          suspended: suspendedUsers,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir les infos du modérateur connecté
 * GET /api/admin/me
 */
export const getMe = (
  req: Request,
  res: Response
): void => {
  const user = req.utilisateur!;
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
        permissions: user.getEffectivePermissions(),
      },
    },
  });
};
