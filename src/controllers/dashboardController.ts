import { Request, Response, NextFunction } from 'express';
import Report from '../models/Report.js';
import AuditLog from '../models/AuditLog.js';
import Utilisateur from '../models/Utilisateur.js';

// Permissions par role (copie de Utilisateur.ts pour getEffectivePermissions)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  user: [],
  modo_test: ['reports:view', 'users:view', 'staff:chat'],
  modo: [
    'reports:view',
    'reports:process',
    'users:view',
    'users:warn',
    'content:hide',
    'content:unhide',
    'audit:view',
    'staff:chat',
  ],
  admin_modo: [
    'reports:view',
    'reports:process',
    'reports:escalate',
    'users:view',
    'users:warn',
    'users:suspend',
    'users:ban',
    'users:unban',
    'content:hide',
    'content:unhide',
    'content:delete',
    'audit:view',
    'audit:export',
    'staff:chat',
    'dashboard:view',
  ],
  admin: [
    'reports:view',
    'reports:process',
    'reports:escalate',
    'users:view',
    'users:warn',
    'users:suspend',
    'users:ban',
    'users:unban',
    'content:hide',
    'content:unhide',
    'content:delete',
    'audit:view',
    'audit:export',
    'staff:chat',
    'dashboard:view',
  ],
  super_admin: ['*'],
};

/**
 * Obtenir les donnees du dashboard admin
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
 * Obtenir les infos du moderateur connecte
 * GET /api/admin/me
 */
export const getMe = (req: Request, res: Response): void => {
  const user = req.utilisateur!;

  // Calculer les permissions effectives
  const rolePerms = ROLE_PERMISSIONS[user.role] || [];
  const effectivePermissions =
    user.role === 'super_admin'
      ? ['*']
      : [...new Set([...rolePerms, ...(user.permissions || [])])];

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
        permissions: effectivePermissions,
      },
    },
  });
};
