import { Request, Response, NextFunction } from 'express';

/**
 * Middleware pour vérifier que l'utilisateur a le statut entrepreneur
 * À utiliser APRÈS verifierJwt et checkUserStatus
 *
 * Bloque l'accès si l'utilisateur n'a pas statut === 'entrepreneur'
 */
export const checkEntrepreneur = (
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

  // Vérifier le statut entrepreneur
  if (utilisateur.statut !== 'entrepreneur') {
    res.status(403).json({
      succes: false,
      message: 'Cette fonctionnalité est réservée aux entrepreneurs.',
      code: 'ENTREPRENEUR_REQUIRED',
    });
    return;
  }

  next();
};
