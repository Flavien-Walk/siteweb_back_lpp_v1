import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
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
import storyRoutes from './routes/storyRoutes.js';
import liveRoutes from './routes/liveRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import moderationRoutes from './routes/moderationRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import { gestionErreurs, routeNonTrouvee } from './middlewares/gestionErreurs.js';
import { configurerPassport } from './config/passport.js';
import { securityMonitor, checkBlockedIP, sanitizeQueryParams, hideAdminRoutes } from './middlewares/securityMonitor.js';

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

  // Compression gzip pour réduire la taille des réponses
  app.use(compression());

  // ============================================
  // CORS CONFIGURATION (SÉCURISÉE)
  // ============================================
  //
  // Origins autorisées (JAMAIS de "*"):
  // 1. CLIENT_URL - Frontend production (Vercel)
  // 2. LOCAL_MODERATION_ORIGINS - Outil modération local (staff uniquement)
  // 3. Previews Vercel du projet frontend
  // ============================================

  // Origins de production
  const prodOrigins = [
    process.env.CLIENT_URL, // ex: https://siteweb-front-lpp-v100.vercel.app
  ].filter(Boolean) as string[];

  // Origins de l'outil de modération local (ex: "http://localhost:5173,http://127.0.0.1:5173")
  // Défini via variable d'environnement pour ne pas exposer en dur
  const localModerationOrigins = process.env.LOCAL_MODERATION_ORIGINS
    ? process.env.LOCAL_MODERATION_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];

  // Toutes les origins autorisées
  const allowedOrigins = [...prodOrigins, ...localModerationOrigins];

  // Regex pour les previews Vercel du projet frontend
  const vercelPreviewRegex =
    /^https:\/\/siteweb-front-lpp-v100-[a-z0-9-]+\.vercel\.app$/i;

  // Log au démarrage (debug uniquement)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CORS] Origins autorisées:', allowedOrigins);
    console.log('[CORS] Outil modération local:', localModerationOrigins.length > 0 ? 'ACTIVÉ' : 'DÉSACTIVÉ');
  }

  app.use(
    cors({
      origin: (origin, cb) => {
        // Requêtes sans Origin (apps mobiles natives, Postman en dev)
        if (!origin) {
          return cb(null, true);
        }

        // Origins explicitement autorisées
        if (allowedOrigins.includes(origin)) {
          return cb(null, true);
        }

        // Previews Vercel du frontend
        if (vercelPreviewRegex.test(origin)) {
          return cb(null, true);
        }

        // Origin non autorisée - REFUSER
        console.warn(`[CORS] Origin refusée: ${origin}`);
        return cb(new Error(`Origin non autorisée: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Event-Id'], // P0-1: X-Event-Id pour idempotency
    })
  );

  // Important : répondre aux requêtes preflight OPTIONS
  app.options('*', cors());

  // ============================================
  // RATE LIMITING
  // ============================================

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // max 300 requêtes par fenêtre (mobile fait beaucoup d'appels)
    message: {
      succes: false,
      message: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // SEC-AUTH-04: Activer la validation trust proxy pour que l'IP soit correcte
    // trustProxy: false desactivait la validation, permettant le spoofing via X-Forwarded-For
    validate: { trustProxy: true },
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

  // VULN-03: Rate limiter strict pour inscription (3 comptes par heure par IP)
  const limiterInscription = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 3, // max 3 inscriptions par heure par IP
    message: {
      succes: false,
      message: 'Trop de tentatives d\'inscription. Veuillez réessayer plus tard.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter spécifique pour les actions admin/modération
  // Plus restrictif pour éviter les abus
  const limiterAdmin = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // max 200 requêtes par fenêtre (consultation intensive possible)
    message: {
      succes: false,
      message: 'Trop de requêtes admin. Veuillez réessayer dans quelques minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter strict pour les actions de modération (sanctions)
  const limiterModerationActions = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 50, // max 50 actions de sanction par heure
    message: {
      succes: false,
      message: 'Trop d\'actions de modération. Veuillez patienter.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // P0-4: Rate limiter pour heartbeat /auth/moi
  // Mobile fait un call toutes les 90s, donc ~40/h normal
  // 20/min permet usage normal + marge, bloque abus
  const limiterHeartbeat = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // max 20 requêtes par minute (très généreux)
    message: {
      succes: false,
      message: 'Trop de requêtes heartbeat. Veuillez patienter.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter pour les opérations d'écriture (publications, messages, amis)
  const limiterWrite = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // max 30 créations par fenêtre
    message: {
      succes: false,
      message: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limiter pour les messages (plus permissif car usage intensif)
  const limiterMessages = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // max 60 messages par fenêtre
    message: {
      succes: false,
      message: 'Trop de messages envoyés. Veuillez patienter.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Middleware de verification IP bloquee (tout en premier)
  app.use('/api/', checkBlockedIP);

  // Middleware de detection d'intrusion (avant les routes, apres le parsing)
  app.use('/api/', securityMonitor);

  // PENTEST-01: Sanitisation des query params (strip operateurs MongoDB $gt, $ne, etc.)
  app.use('/api/', sanitizeQueryParams);

  app.use('/api/', limiter);
  app.use('/api/auth/connexion', limiterAuth);
  app.use('/api/auth/inscription', limiterInscription);
  app.use('/api/auth/moi', limiterHeartbeat); // P0-4: Rate limit sur heartbeat

  // PENTEST-02: Rate limit strict sur endpoints publics de lecture (anti-scraping)
  const limiterPublicRead = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // max 30 req/min par IP sur les endpoints publics
    message: {
      succes: false,
      message: 'Trop de requetes. Veuillez patienter.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/projets', limiterPublicRead);
  app.use('/api/feed', limiterPublicRead);
  app.use('/api/utilisateurs', limiterPublicRead);

  // PENTEST-03: Masquer existence des routes admin (404 au lieu de 401 sans token)
  app.use('/api/admin/', hideAdminRoutes);
  app.use('/api/moderation/', hideAdminRoutes);

  app.use('/api/admin/', limiterAdmin);
  app.use('/api/moderation/', limiterAdmin);
  // Actions de sanction spécifiques (warn, suspend, ban)
  app.use('/api/moderation/users/:id/warn', limiterModerationActions);
  app.use('/api/moderation/users/:id/suspend', limiterModerationActions);
  app.use('/api/moderation/users/:id/ban', limiterModerationActions);
  // Opérations d'écriture
  app.use('/api/publications', limiterWrite);
  app.use('/api/projets/entrepreneur', limiterWrite);
  app.use('/api/utilisateurs/:id/demande-ami', limiterWrite);
  app.use('/api/messagerie/envoyer', limiterMessages);
  app.use('/api/messagerie/groupes', limiterWrite);
  // RED-13: Rate limit on story view tracking
  app.use('/api/stories/:id/seen', limiterWrite);
  // RED-08: Rate limit on live join/leave
  app.use('/api/live/:id/join', limiterWrite);
  app.use('/api/live/:id/leave', limiterWrite);

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
  // SANITISATION MONGODB (VULN-02)
  // ============================================
  // Supprime les operateurs MongoDB ($gt, $ne, $in, etc.)
  // de req.body, req.query et req.params pour empecher
  // les injections NoSQL meme si elles passent le securityMonitor
  app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`[MONGO-SANITIZE] Operateur MongoDB supprime dans ${key} depuis ${req.ip} - ${req.originalUrl}`);
    },
  }));

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
  app.use('/api/stories', storyRoutes);
  app.use('/api/live', liveRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/activity', activityRoutes);

  // ============================================
  // GESTION DES ERREURS
  // ============================================

  // Route non trouvée
  app.use(routeNonTrouvee);

  // Gestion globale des erreurs
  app.use(gestionErreurs);

  return app;
};
