import { Request, Response, NextFunction } from 'express';
import { Permission, ROLE_HIERARCHY, RoleWithLegacy } from '../models/Utilisateur.js';

/**
 * Middleware pour vérifier le statut de l'utilisateur (ban/suspension)
 * À utiliser APRÈS verifierJwt
 *
 * Bloque l'accès si l'utilisateur est :
 * - Banni définitivement
 * - Suspendu temporairement (suspension active)
 */
export const checkUserStatus = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const utilisateur = req.utilisateur;

  if (!utilisateur) {
    res.status(401).json({
      succes: false,
      message: 'Utilisateur non authentifié.',
    });
    return;
  }

  // Vérifier si l'utilisateur est banni
  if (utilisateur.isBanned()) {
    res.status(403).json({
      succes: false,
      message: 'Votre compte a été suspendu définitivement.',
      code: 'ACCOUNT_BANNED',
      reason: utilisateur.banReason || undefined,
    });
    return;
  }

  // Vérifier si l'utilisateur est suspendu temporairement
  if (utilisateur.isSuspended()) {
    const suspendedUntil = utilisateur.suspendedUntil;
    res.status(403).json({
      succes: false,
      message: 'Votre compte est temporairement suspendu.',
      code: 'ACCOUNT_SUSPENDED',
      suspendedUntil: suspendedUntil?.toISOString(),
    });
    return;
  }

  next();
};

/**
 * Middleware pour vérifier si l'utilisateur fait partie du staff
 * (modo_test ou plus)
 */
export const requireStaff = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const utilisateur = req.utilisateur;

  if (!utilisateur) {
    res.status(401).json({
      succes: false,
      message: 'Authentification requise.',
    });
    return;
  }

  if (!utilisateur.isStaff()) {
    res.status(403).json({
      succes: false,
      message: 'Accès réservé au personnel de modération.',
    });
    return;
  }

  next();
};

/**
 * Middleware factory pour vérifier une permission spécifique
 *
 * Usage: requirePermission('users:ban')
 *
 * Vérifie que l'utilisateur :
 * 1. Est authentifié
 * 2. N'est pas banni/suspendu
 * 3. Possède la permission requise (via son rôle ou permissions additionnelles)
 */
export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const utilisateur = req.utilisateur;

    if (!utilisateur) {
      res.status(401).json({
        succes: false,
        message: 'Authentification requise.',
      });
      return;
    }

    // Vérifier le statut (banni/suspendu)
    if (utilisateur.isBanned()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu définitivement.',
        code: 'ACCOUNT_BANNED',
      });
      return;
    }

    if (utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
        code: 'ACCOUNT_SUSPENDED',
      });
      return;
    }

    // Vérifier la permission
    if (!utilisateur.hasPermission(permission)) {
      res.status(403).json({
        succes: false,
        message: 'Permission insuffisante pour cette action.',
        requiredPermission: permission,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware factory pour vérifier plusieurs permissions (toutes requises)
 *
 * Usage: requireAllPermissions(['users:view', 'users:warn'])
 */
export const requireAllPermissions = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const utilisateur = req.utilisateur;

    if (!utilisateur) {
      res.status(401).json({
        succes: false,
        message: 'Authentification requise.',
      });
      return;
    }

    // Vérifier le statut
    if (utilisateur.isBanned() || utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Compte suspendu ou banni.',
        code: utilisateur.isBanned() ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      });
      return;
    }

    // Vérifier toutes les permissions
    const missingPermissions = permissions.filter(p => !utilisateur.hasPermission(p));

    if (missingPermissions.length > 0) {
      res.status(403).json({
        succes: false,
        message: 'Permissions insuffisantes pour cette action.',
        missingPermissions,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware factory pour vérifier au moins une permission parmi plusieurs
 *
 * Usage: requireAnyPermission(['users:suspend', 'users:ban'])
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const utilisateur = req.utilisateur;

    if (!utilisateur) {
      res.status(401).json({
        succes: false,
        message: 'Authentification requise.',
      });
      return;
    }

    // Vérifier le statut
    if (utilisateur.isBanned() || utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Compte suspendu ou banni.',
        code: utilisateur.isBanned() ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      });
      return;
    }

    // Vérifier qu'au moins une permission est présente
    const hasAny = permissions.some(p => utilisateur.hasPermission(p));

    if (!hasAny) {
      res.status(403).json({
        succes: false,
        message: 'Permission insuffisante pour cette action.',
        requiredPermissions: permissions,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur a un niveau de rôle minimum
 *
 * Usage: requireMinRole('modo') - requiert au moins le rôle modo
 *
 * Note: Le rôle legacy 'admin' est traité comme 'admin_modo'
 * grâce à ROLE_HIERARCHY qui inclut les deux au même niveau (3)
 */
export const requireMinRole = (minRole: 'modo_test' | 'modo' | 'admin_modo' | 'super_admin') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const utilisateur = req.utilisateur;

    if (!utilisateur) {
      res.status(401).json({
        succes: false,
        message: 'Authentification requise.',
      });
      return;
    }

    // Vérifier le statut
    if (utilisateur.isBanned() || utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Compte suspendu ou banni.',
        code: utilisateur.isBanned() ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      });
      return;
    }

    // Utiliser ROLE_HIERARCHY qui gère le legacy 'admin'
    const userLevel = utilisateur.getRoleLevel();
    const requiredLevel = ROLE_HIERARCHY[minRole as RoleWithLegacy];

    if (userLevel < requiredLevel) {
      res.status(403).json({
        succes: false,
        message: `Rôle insuffisant. Rôle minimum requis: ${minRole}`,
      });
      return;
    }

    next();
  };
};
