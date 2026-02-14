import { Request, Response, NextFunction } from 'express';
import { Permission, ROLE_HIERARCHY, RoleWithLegacy } from '../models/Utilisateur.js';
import Utilisateur from '../models/Utilisateur.js';
import { createSuspensionExpiredNotification } from '../utils/sanctionNotification.js';

/**
 * Gerer l'expiration naturelle d'une suspension
 * Envoie une notification et nettoie les champs de suspension
 */
const handleNaturalSuspensionExpiration = async (userId: string): Promise<void> => {
  try {
    // Mettre a jour l'utilisateur et nettoyer les champs de suspension
    const updated = await Utilisateur.findByIdAndUpdate(
      userId,
      { $unset: { suspendedUntil: 1, suspendReason: 1 } },
      { new: true }
    );

    if (updated) {
      // Creer la notification d'expiration naturelle
      await createSuspensionExpiredNotification(userId);
      console.log(`[checkUserStatus] Suspension expiree naturellement pour user ${userId}`);
    }
  } catch (error) {
    console.error('[checkUserStatus] Erreur gestion expiration suspension:', error);
  }
};

/**
 * Middleware pour vérifier le statut de l'utilisateur (ban/suspension)
 * À utiliser APRÈS verifierJwt
 *
 * Bloque l'accès si l'utilisateur est :
 * - Banni définitivement
 * - Suspendu temporairement (suspension active)
 *
 * Detecte aussi les expirations naturelles de suspension et envoie une notification
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
    res.status(403).json({
      succes: false,
      message: 'Votre compte est temporairement suspendu.',
      code: 'ACCOUNT_SUSPENDED',
      reason: utilisateur.suspendReason || undefined,
      suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
    });
    return;
  }

  // Detecter si une suspension vient d'expirer naturellement
  // (suspendedUntil existe mais est dans le passe)
  if (utilisateur.suspendedUntil && utilisateur.suspendedUntil <= new Date()) {
    // Lancer le traitement en arriere-plan (ne pas bloquer la requete)
    handleNaturalSuspensionExpiration(utilisateur._id.toString());
  }

  next();
};

/**
 * Middleware pour vérifier si l'utilisateur fait partie du staff
 * (modo_test ou plus)
 *
 * Vérifie également le statut ban/suspend
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

  // Vérifier le statut (banni/suspendu) - même les staff peuvent être sanctionnés
  if (utilisateur.isBanned()) {
    res.status(403).json({
      succes: false,
      message: 'Votre compte a été suspendu définitivement.',
      code: 'ACCOUNT_BANNED',
      reason: utilisateur.banReason || undefined,
    });
    return;
  }

  if (utilisateur.isSuspended()) {
    res.status(403).json({
      succes: false,
      message: 'Votre compte est temporairement suspendu.',
      code: 'ACCOUNT_SUSPENDED',
      reason: utilisateur.suspendReason || undefined,
      suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
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
        reason: utilisateur.banReason || undefined,
      });
      return;
    }

    if (utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
        code: 'ACCOUNT_SUSPENDED',
        reason: utilisateur.suspendReason || undefined,
        suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
      });
      return;
    }

    // Vérifier la permission
    // PENTEST-09: Ne pas exposer la permission requise dans la reponse (information leakage)
    if (!utilisateur.hasPermission(permission)) {
      res.status(403).json({
        succes: false,
        message: 'Permission insuffisante pour cette action.',
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
    if (utilisateur.isBanned()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu définitivement.',
        code: 'ACCOUNT_BANNED',
        reason: utilisateur.banReason || undefined,
      });
      return;
    }
    if (utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
        code: 'ACCOUNT_SUSPENDED',
        reason: utilisateur.suspendReason || undefined,
        suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
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
    if (utilisateur.isBanned()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu définitivement.',
        code: 'ACCOUNT_BANNED',
        reason: utilisateur.banReason || undefined,
      });
      return;
    }
    if (utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
        code: 'ACCOUNT_SUSPENDED',
        reason: utilisateur.suspendReason || undefined,
        suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
      });
      return;
    }

    // Vérifier qu'au moins une permission est présente
    const hasAny = permissions.some(p => utilisateur.hasPermission(p));

    // PENTEST-09: Ne pas exposer les permissions requises dans la reponse
    if (!hasAny) {
      res.status(403).json({
        succes: false,
        message: 'Permission insuffisante pour cette action.',
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
    if (utilisateur.isBanned()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu définitivement.',
        code: 'ACCOUNT_BANNED',
        reason: utilisateur.banReason || undefined,
      });
      return;
    }
    if (utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
        code: 'ACCOUNT_SUSPENDED',
        reason: utilisateur.suspendReason || undefined,
        suspendedUntil: utilisateur.suspendedUntil?.toISOString(),
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
