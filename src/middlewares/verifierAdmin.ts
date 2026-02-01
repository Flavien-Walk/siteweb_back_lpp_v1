import { Request, Response, NextFunction } from 'express';

/**
 * Middleware pour vérifier que l'utilisateur est admin
 * Doit être utilisé APRÈS verifierJwt
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

    // Vérifier le rôle admin
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
