import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { formaterErreursZod } from '../utils/validation.js';

// Interface pour les erreurs personnalisées
export interface ErreurPersonnalisee extends Error {
  statusCode?: number;
  code?: string | number;
  erreurs?: Record<string, string>;
}

/**
 * Middleware de gestion globale des erreurs
 */
export const gestionErreurs = (
  err: ErreurPersonnalisee,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log de l'erreur en développement
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Erreur:', err);
  }

  // Erreur de validation Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      succes: false,
      message: 'Données invalides',
      erreurs: formaterErreursZod(err),
    });
    return;
  }

  // Erreur de duplication MongoDB (email déjà existant)
  if (err.code === 11000) {
    const mongoErr = err as any;
    console.error('[ERREUR 11000] Duplicate key:', JSON.stringify(mongoErr.keyValue), 'keyPattern:', JSON.stringify(mongoErr.keyPattern));
    res.status(409).json({
      succes: false,
      message: 'Cette adresse email est déjà utilisée.',
    });
    return;
  }

  // Erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const erreurs: Record<string, string> = {};
    const mongooseError = err as any;

    Object.keys(mongooseError.errors || {}).forEach((key) => {
      erreurs[key] = mongooseError.errors[key].message;
    });

    res.status(400).json({
      succes: false,
      message: 'Données invalides',
      erreurs,
    });
    return;
  }

  // Erreur de cast MongoDB (ID invalide)
  if (err.name === 'CastError') {
    res.status(400).json({
      succes: false,
      message: 'Identifiant invalide.',
    });
    return;
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      succes: false,
      message: 'Token invalide.',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      succes: false,
      message: 'Token expiré. Veuillez vous reconnecter.',
    });
    return;
  }

  // Erreur personnalisée avec statusCode
  if (err.statusCode) {
    res.status(err.statusCode).json({
      succes: false,
      message: err.message,
      erreurs: err.erreurs,
    });
    return;
  }

  // Erreur par défaut (500)
  res.status(500).json({
    succes: false,
    message: 'Une erreur interne est survenue. Veuillez réessayer plus tard.',
  });
};

/**
 * Middleware pour les routes non trouvées
 */
export const routeNonTrouvee = (req: Request, res: Response): void => {
  res.status(404).json({
    succes: false,
    message: `Route ${req.method} ${req.originalUrl} non trouvée.`,
  });
};

/**
 * Classe d'erreur personnalisée
 */
export class ErreurAPI extends Error {
  statusCode: number;
  erreurs?: Record<string, string>;

  constructor(message: string, statusCode: number, erreurs?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.erreurs = erreurs;
    Error.captureStackTrace(this, this.constructor);
  }
}
