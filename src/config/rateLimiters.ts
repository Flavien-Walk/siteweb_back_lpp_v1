/**
 * Configuration centralisee des rate limiters
 * Extraits de app.ts pour lisibilite
 */

import rateLimit from 'express-rate-limit';
import type { Application } from 'express';
import { hideAdminRoutes } from '../middlewares/security/index.js';

// ============================================
// DEFINITIONS DES RATE LIMITERS
// ============================================

/** Global : 300 req / 15 min */
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    succes: false,
    message: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // SEC-AUTH-04: Activer la validation trust proxy pour que l'IP soit correcte
  validate: { trustProxy: true },
});

/** Auth : 10 tentatives / 15 min */
export const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    succes: false,
    message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** VULN-03: Inscription : 3 comptes / heure */
export const limiterInscription = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    succes: false,
    message: 'Trop de tentatives d\'inscription. Veuillez réessayer plus tard.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Admin : 200 req / 15 min */
export const limiterAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    succes: false,
    message: 'Trop de requêtes admin. Veuillez réessayer dans quelques minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** PENTEST-05: Actions moderation (sanctions) : 50 / heure */
export const limiterModerationActions = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    succes: false,
    message: 'Trop d\'actions de modération. Veuillez patienter.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** P0-4: Heartbeat /auth/moi : 20 / min */
export const limiterHeartbeat = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    succes: false,
    message: 'Trop de requêtes heartbeat. Veuillez patienter.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Ecriture (publications, amis, etc.) : 30 / 15 min */
export const limiterWrite = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    succes: false,
    message: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Messages : 60 / 15 min (usage intensif) */
export const limiterMessages = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    succes: false,
    message: 'Trop de messages envoyés. Veuillez patienter.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Renvoi code verification : 3 / 10 min */
export const limiterRenvoyerCode = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: {
    succes: false,
    message: 'Trop de demandes de code. Reessayez dans quelques minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Liaison OAuth : 5 / 15 min */
export const limiterOAuthLink = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    succes: false,
    message: 'Trop de tentatives de liaison. Reessayez dans quelques minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** PENTEST-02: Lecture publique (anti-scraping) : 30 / min */
export const limiterPublicRead = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    succes: false,
    message: 'Trop de requetes. Veuillez patienter.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// APPLICATION DES RATE LIMITERS
// ============================================

/**
 * Applique tous les rate limiters sur l'application Express.
 * Appele depuis app.ts apres les middlewares de securite.
 */
export const applyRateLimiters = (app: Application): void => {
  // Global
  app.use('/api/', limiter);

  // Auth
  app.use('/api/auth/connexion', limiterAuth);
  app.use('/api/auth/inscription', limiterInscription);
  app.use('/api/auth/moi', limiterHeartbeat);
  app.use('/api/auth/renvoyer-code', limiterRenvoyerCode);
  app.use('/api/auth/link/', limiterOAuthLink);

  // PENTEST-02: Anti-scraping sur endpoints publics
  app.use('/api/projets', limiterPublicRead);
  app.use('/api/feed', limiterPublicRead);
  app.use('/api/utilisateurs', limiterPublicRead);

  // PENTEST-03: Masquer existence des routes admin (404 au lieu de 401 sans token)
  app.use('/api/admin/', hideAdminRoutes);
  app.use('/api/moderation/', hideAdminRoutes);

  // Admin & moderation
  app.use('/api/admin/', limiterAdmin);
  app.use('/api/moderation/', limiterAdmin);
  app.use('/api/moderation/users/:id/warn', limiterModerationActions);
  app.use('/api/moderation/users/:id/suspend', limiterModerationActions);
  app.use('/api/moderation/users/:id/ban', limiterModerationActions);

  // Operations d'ecriture
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
};
