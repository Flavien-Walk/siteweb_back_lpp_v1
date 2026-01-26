import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';

import authRoutes from './routes/authRoutes.js';
import { gestionErreurs, routeNonTrouvee } from './middlewares/gestionErreurs.js';
import { configurerPassport } from './config/passport.js';

/**
 * Créer et configurer l'application Express
 */
export const creerApp = (): Application => {
  const app = express();

  // ============================================
  // MIDDLEWARES DE SÉCURITÉ
  // ============================================

  // Helmet - headers de sécurité
  app.use(helmet());

  // CORS - autoriser les requêtes du frontend
  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Rate limiting - limiter les requêtes
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 requêtes par fenêtre
    message: {
      succes: false,
      message: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Limiter spécifiquement les routes d'auth
  const limiterAuth = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // max 10 tentatives par fenêtre
    message: {
      succes: false,
      message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', limiter);
  app.use('/api/auth/connexion', limiterAuth);
  app.use('/api/auth/inscription', limiterAuth);

  // ============================================
  // MIDDLEWARES DE PARSING
  // ============================================

  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // ============================================
  // PASSPORT
  // ============================================

  app.use(passport.initialize());
  configurerPassport();

  // ============================================
  // ROUTES
  // ============================================

  // Route de santé
  app.get('/api/sante', (req, res) => {
    res.status(200).json({
      succes: true,
      message: 'API La Première Pierre opérationnelle',
      timestamp: new Date().toISOString(),
    });
  });

  // Routes d'authentification
  app.use('/api/auth', authRoutes);

  // ============================================
  // GESTION DES ERREURS
  // ============================================

  // Route non trouvée
  app.use(routeNonTrouvee);

  // Gestion globale des erreurs
  app.use(gestionErreurs);

  return app;
};
