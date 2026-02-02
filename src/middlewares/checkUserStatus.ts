import { Request, Response, NextFunction } from 'express';
import { ROLE_HIERARCHY } from '../models/Utilisateur.js';

/**
 * Middleware pour vérifier le statut de l'utilisateur (ban/suspension)
 * À utiliser APRÈS verifierJwt sur TOUTES les routes protégées
 *
 * Bloque l'accès si l'utilisateur est :
 * - Banni définitivement → 403 ACCOUNT_BANNED
 * - Suspendu temporairement → 403 ACCOUNT_SUSPENDED
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

  // Vérifier le statut d'abord
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
 * 3. Possède la permission requise
 */
export const requirePermission = (permission: string) => {
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
 * Middleware pour vérifier que l'utilisateur a un niveau de rôle minimum
 *
 * Usage: requireMinRole('modo')
 */
export const requireMinRole = (minRole: string) => {
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

    // Utiliser ROLE_HIERARCHY
    const userLevel = utilisateur.getRoleLevel();
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

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
