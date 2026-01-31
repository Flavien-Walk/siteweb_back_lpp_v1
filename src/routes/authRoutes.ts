import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import {
  inscription,
  connexion,
  moi,
  callbackOAuth,
  getOAuthToken,
} from '../controllers/authController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';

const router = Router();

/**
 * Middleware pour capturer la plateforme (web/mobile) et la passer dans le state OAuth
 */
const capturerPlateforme = (provider: string) => (req: Request, res: Response, next: NextFunction) => {
  const platform = req.query.platform as string;

  // Encoder la plateforme dans le state OAuth (base64 pour compatibilite)
  const stateData = { platform: platform || 'web' };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

  // Passer le state a passport via query
  (req as any).authState = state;
  next();
};

// ============================================
// ROUTES AUTH EMAIL/PASSWORD
// ============================================

/**
 * POST /api/auth/inscription
 * Inscription d'un nouvel utilisateur
 */
router.post('/inscription', inscription);

/**
 * POST /api/auth/connexion
 * Connexion d'un utilisateur existant
 */
router.post('/connexion', connexion);

/**
 * GET /api/auth/moi
 * Recuperer les informations de l'utilisateur connecte
 */
router.get('/moi', verifierJwt, moi);

// ============================================
// ROUTES OAUTH - GOOGLE
// ============================================

/**
 * GET /api/auth/google
 * Initier le flux OAuth Google
 * Accepte ?platform=mobile pour les clients mobiles
 */
router.get(
  '/google',
  capturerPlateforme('google'),
  (req, res, next) => {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: (req as any).authState,
    })(req, res, next);
  }
);

/**
 * GET /api/auth/google/callback
 * Callback apres authentification Google
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/connexion?erreur=google_echec`,
  }),
  callbackOAuth
);

// ============================================
// ROUTES OAUTH - FACEBOOK
// ============================================

/**
 * GET /api/auth/facebook
 * Initier le flux OAuth Facebook
 * Accepte ?platform=mobile pour les clients mobiles
 */
router.get(
  '/facebook',
  capturerPlateforme('facebook'),
  (req, res, next) => {
    passport.authenticate('facebook', {
      scope: ['public_profile'],
      session: false,
      state: (req as any).authState,
    })(req, res, next);
  }
);

/**
 * GET /api/auth/facebook/callback
 * Callback apres authentification Facebook
 */
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/connexion?erreur=facebook_echec`,
  }),
  callbackOAuth
);

// ============================================
// ROUTES OAUTH - APPLE
// ============================================

/**
 * GET /api/auth/apple
 * Initier le flux OAuth Apple
 * Accepte ?platform=mobile pour les clients mobiles
 */
router.get(
  '/apple',
  capturerPlateforme('apple'),
  (req, res, next) => {
    passport.authenticate('apple', {
      scope: ['name', 'email'],
      session: false,
      state: (req as any).authState,
    })(req, res, next);
  }
);

/**
 * POST /api/auth/apple/callback
 * Callback apres authentification Apple (Apple utilise POST)
 */
router.post(
  '/apple/callback',
  passport.authenticate('apple', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/connexion?erreur=apple_echec`,
  }),
  callbackOAuth
);

// ============================================
// ROUTE DE RECUPERATION DU TOKEN OAUTH
// ============================================

/**
 * GET /api/auth/oauth/token
 * Recuperer le token OAuth depuis le cookie httpOnly
 * Le frontend appelle cette route apres redirection OAuth
 */
router.get('/oauth/token', getOAuthToken);

export default router;