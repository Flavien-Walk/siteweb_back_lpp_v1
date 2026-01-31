import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import authRoutes from './routes/authRoutes.js';
import projetRoutes from './routes/projetRoutes.js';
import feedRoutes from './routes/feedRoutes.js';
import evenementRoutes from './routes/evenementRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import profilRoutes from './routes/profilRoutes.js';
import publicationRoutes from './routes/publicationRoutes.js';
import messagerieRoutes from './routes/messagerieRoutes.js';
import utilisateurRoutes from './routes/utilisateurRoutes.js';
import { gestionErreurs, routeNonTrouvee } from './middlewares/gestionErreurs.js';
import { configurerPassport } from './config/passport.js';

/**
 * Créer et configurer l'application Express
 */
export const creerApp = (): Application => {
  const app = express();

  // ============================================
  // CONFIGURATION PROXY (Render, Heroku, etc.)
  // ============================================
  app.set('trust proxy', 1);

  // ============================================
  // MIDDLEWARES DE SÉCURITÉ
  // ============================================

  // Helmet - headers de sécurité
  app.use(helmet());

  // CORS - autoriser les requêtes du frontend (prod + previews Vercel)
  const allowedOrigins = [
    process.env.CLIENT_URL, // ex: https://siteweb-front-lpp-v100.vercel.app
    'http://localhost:5173',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  // Autorise les previews Vercel du projet (ex: https://siteweb-front-lpp-v100-xxxxx.vercel.app)
  const vercelPreviewRegex =
    /^https:\/\/siteweb-front-lpp-v100-[a-z0-9-]+\.vercel\.app$/i;

  app.use(
    cors({
      origin: (origin, cb) => {
        // Requêtes sans Origin (Postman, curl, server-to-server)
        if (!origin) return cb(null, true);

        // Prod / Local / Preview Vercel
        if (allowedOrigins.includes(origin) || vercelPreviewRegex.test(origin)) {
          return cb(null, true);
        }

        return cb(new Error('Not allowed by CORS: ' + origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Important : répondre aux requêtes preflight OPTIONS
  app.options('*', cors());

  // ============================================
  // RATE LIMITING
  // ============================================

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

  // Limite pour l'upload de médias base64 (avatars, photos, vidéos)
  // 20MB est suffisant pour images compressées et vidéos courtes
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Cookie parser pour les cookies httpOnly (OAuth)
  app.use(cookieParser());

  // ============================================
  // PASSPORT
  // ============================================

  app.use(passport.initialize());
  configurerPassport();

  // ============================================
  // ROUTES
  // ============================================

  // Route de santé
  app.get('/api/sante', (_req, res) => {
    res.status(200).json({
      succes: true,
      message: 'API La Première Pierre opérationnelle',
      timestamp: new Date().toISOString(),
    });
  });

  // Routes d'authentification
  app.use('/api/auth', authRoutes);

  // Routes métier
  app.use('/api/projets', projetRoutes);
  app.use('/api/feed', feedRoutes);
  app.use('/api/evenements', evenementRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/profil', profilRoutes);
  app.use('/api/publications', publicationRoutes);
  app.use('/api/messagerie', messagerieRoutes);
  app.use('/api/utilisateurs', utilisateurRoutes);

  // ============================================
  // GESTION DES ERREURS
  // ============================================

  // Route non trouvée
  app.use(routeNonTrouvee);

  // Gestion globale des erreurs
  app.use(gestionErreurs);

  return app;
};
