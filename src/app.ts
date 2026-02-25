import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { corsOptions } from './config/cors.js';
import { applyRateLimiters } from './config/rateLimiters.js';

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
import supportTicketRoutes from './routes/supportTicketRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import { gestionErreurs, routeNonTrouvee } from './middlewares/gestionErreurs.js';
import { configurerPassport } from './config/passport.js';
import { securityMonitor, checkBlockedIP, sanitizeQueryParams, invalidateBlockedIPCache, purgeAutoBlocks } from './middlewares/securityMonitor.js';
import BlockedIP from './models/BlockedIP.js';
import BannedDevice, { generateDeviceFingerprint } from './models/BannedDevice.js';

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

  // CORS - configuration centralisee dans config/cors.ts
  app.use(cors(corsOptions));
  app.options('*', cors());

  // ============================================
  // RATE LIMITING (config centralisee dans config/rateLimiters.ts)
  // ============================================

  // Route de sante AVANT les checks securite (monitoring / health check doit toujours repondre)
  app.get('/api/sante', (_req, res) => {
    res.status(200).json({
      succes: true,
      message: 'API La Première Pierre opérationnelle',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // ENDPOINT D'URGENCE - Deblocage IP/Device
  // Protege par EMERGENCY_TOKEN (variable d'environnement Render)
  // Place AVANT le security middleware pour etre accessible meme si IP bloquee
  // ============================================
  app.post('/api/emergency/unblock', async (req, res) => {
    try {
      const token = req.headers['x-emergency-token'] || req.query.token;
      const expectedToken = process.env.EMERGENCY_TOKEN;

      if (!expectedToken || token !== expectedToken) {
        res.status(404).json({ succes: false, message: 'Route non trouvee.' });
        return;
      }

      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const ua = req.headers['user-agent'] || '';

      const results: string[] = [];

      // 1. Debloquer l'IP
      const ipResult = await BlockedIP.deleteMany({ ip });
      if (ipResult.deletedCount > 0) {
        results.push(`IP ${ip}: ${ipResult.deletedCount} blocage(s) supprime(s)`);
        invalidateBlockedIPCache(ip);
      } else {
        results.push(`IP ${ip}: aucun blocage trouve`);
      }

      // 2. Debannir l'appareil
      if (ua && ua.length >= 5) {
        const fingerprint = generateDeviceFingerprint(ua);
        const deviceResult = await BannedDevice.deleteMany({ fingerprint });
        if (deviceResult.deletedCount > 0) {
          results.push(`Appareil (${fingerprint.slice(0, 12)}...): ${deviceResult.deletedCount} ban(s) supprime(s)`);
        } else {
          results.push(`Appareil: aucun ban trouve`);
        }
      }

      console.log(`[EMERGENCY] Deblocage par ${ip}:`, results);
      res.status(200).json({ succes: true, message: 'Deblocage effectue', details: results, ip });
    } catch (error) {
      console.error('[EMERGENCY] Erreur deblocage:', error);
      res.status(500).json({ succes: false, message: 'Erreur interne' });
    }
  });

  // Middleware de verification IP bloquee (tout en premier)
  app.use('/api/', checkBlockedIP);

  // Middleware de detection d'intrusion (avant les routes, apres le parsing)
  app.use('/api/', securityMonitor);

  // PENTEST-01: Sanitisation des query params (strip operateurs MongoDB $gt, $ne, etc.)
  app.use('/api/', sanitizeQueryParams);

  applyRateLimiters(app);

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
  app.use('/api/support', supportTicketRoutes);
  app.use('/api/gamification', gamificationRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);

  // ============================================
  // GESTION DES ERREURS
  // ============================================

  // Route non trouvée
  app.use(routeNonTrouvee);

  // Gestion globale des erreurs
  app.use(gestionErreurs);

  return app;
};
