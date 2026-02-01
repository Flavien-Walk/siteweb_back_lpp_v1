import { Request, Response, NextFunction } from 'express';

/**
 * Middleware pour vérifier que l'utilisateur est admin
 * Doit être utilisé APRÈS verifierJwt
 *
 * RÉTROCOMPATIBILITÉ: isAdmin() retourne true pour super_admin et admin_modo
 *
 * Pour un contrôle plus fin, utiliser requirePermission() ou requireMinRole()
 * depuis checkUserStatus.ts
 */
export const verifierAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Vérifier que l'utilisateur est chargé (verifierJwt doit être appelé avant)
    if (!req.utilisateur) {
      res.status(401).json({
        succes: false,
        message: 'Authentification requise.',
      });
      return;
    }

    // Vérifier si l'utilisateur est banni ou suspendu
    if (req.utilisateur.isBanned()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte a été suspendu définitivement.',
        code: 'ACCOUNT_BANNED',
      });
      return;
    }

    if (req.utilisateur.isSuspended()) {
      res.status(403).json({
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
        code: 'ACCOUNT_SUSPENDED',
      });
      return;
    }

    // Vérifier le rôle admin (super_admin ou admin_modo)
    if (!req.utilisateur.isAdmin()) {
      res.status(403).json({
        succes: false,
        message: 'Accès réservé aux administrateurs.',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Erreur vérification admin:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur interne du serveur.',
    });
  }
};
