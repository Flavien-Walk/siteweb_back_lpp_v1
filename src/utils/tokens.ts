import jwt from 'jsonwebtoken';
import { IUtilisateur } from '../models/Utilisateur.js';

// Payload du token JWT
export interface PayloadJWT {
  id: string;
  email: string;
}

/**
 * Génère un token JWT pour un utilisateur
 *
 * SECURITE: L'algorithme HS256 est explicitement spécifié pour éviter
 * les attaques "algorithm confusion" (ex: "alg": "none")
 */
export const genererToken = (utilisateur: IUtilisateur): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET non défini dans les variables d\'environnement');
  }

  const payload: PayloadJWT = {
    id: utilisateur._id.toString(),
    email: utilisateur.email,
  };

  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256', // P0-2: Algorithme explicite pour eviter confusion attacks
  };

  return jwt.sign(payload, secret, options);
};

/**
 * Vérifie et décode un token JWT
 *
 * SECURITE: Seul l'algorithme HS256 est accepté pour éviter
 * les attaques "algorithm confusion" (ex: "alg": "none" ou RS256→HS256)
 */
export const verifierToken = (token: string): PayloadJWT => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET non défini dans les variables d\'environnement');
  }

  // P0-2: Algorithmes acceptés explicitement - rejette "none" et autres
  return jwt.verify(token, secret, { algorithms: ['HS256'] }) as PayloadJWT;
};

/**
 * Extrait le token du header Authorization
 */
export const extraireTokenDuHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};
