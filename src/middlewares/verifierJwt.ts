import { Request, Response, NextFunction } from 'express';
import { verifierToken, extraireTokenDuHeader, PayloadJWT } from '../utils/tokens.js';
import Utilisateur, { IUtilisateur } from '../models/Utilisateur.js';
import { isTokenBlacklisted } from '../models/TokenBlacklist.js';

// Extension de l'interface Request pour inclure l'utilisateur
declare global {
  namespace Express {
    interface Request {
      utilisateur?: IUtilisateur;
      tokenPayload?: PayloadJWT;
    }
  }
}

/**
 * Middleware pour vérifier le token JWT
 * Protège les routes qui nécessitent une authentification
 */
export const verifierJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extraire le token du header Authorization
    const token = extraireTokenDuHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        succes: false,
        message: 'Accès non autorisé. Token manquant.',
      });
      return;
    }

    // Vérifier et décoder le token
    let payload: PayloadJWT;
    try {
      payload = verifierToken(token);
    } catch (error) {
      res.status(401).json({
        succes: false,
        message: 'Token invalide ou expiré.',
      });
      return;
    }

    // Verifier si le token est blackliste (deconnexion serveur)
    if (await isTokenBlacklisted(token)) {
      res.status(401).json({
        succes: false,
        message: 'Session terminée. Veuillez vous reconnecter.',
      });
      return;
    }

    // Récupérer l'utilisateur depuis la base de données
    const utilisateur = await Utilisateur.findById(payload.id);

    if (!utilisateur) {
      res.status(401).json({
        succes: false,
        message: 'Utilisateur non trouvé.',
      });
      return;
    }

    // Attacher l'utilisateur et le payload à la requête
    req.utilisateur = utilisateur;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    console.error('Erreur vérification JWT:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur interne du serveur.',
    });
  }
};

/**
 * Middleware optionnel - charge l'utilisateur si un token est présent
 * mais ne bloque pas si absent
 */
export const chargerUtilisateurOptionnel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extraireTokenDuHeader(req.headers.authorization);

    if (token) {
      try {
        const payload = verifierToken(token);
        const utilisateur = await Utilisateur.findById(payload.id);
        if (utilisateur) {
          req.utilisateur = utilisateur;
          req.tokenPayload = payload;
        }
      } catch {
        // Token invalide, on continue sans utilisateur
      }
    }

    next();
  } catch (error) {
    next();
  }
};
