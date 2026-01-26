import { Router } from 'express';
import passport from 'passport';
import {
  inscription,
  connexion,
  moi,
  callbackOAuth,
} from '../controllers/authController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';

const router = Router();

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
 * Récupérer les informations de l'utilisateur connecté
 */
router.get('/moi', verifierJwt, moi);

// ============================================
// ROUTES OAUTH - GOOGLE
// ============================================

/**
 * GET /api/auth/google
 * Initier le flux OAuth Google
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

/**
 * GET /api/auth/google/callback
 * Callback après authentification Google
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
 */
router.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: ['email'],
    session: false,
  })
);

/**
 * GET /api/auth/facebook/callback
 * Callback après authentification Facebook
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
 */
router.get(
  '/apple',
  passport.authenticate('apple', {
    scope: ['name', 'email'],
    session: false,
  })
);

/**
 * POST /api/auth/apple/callback
 * Callback après authentification Apple (Apple utilise POST)
 */
router.post(
  '/apple/callback',
  passport.authenticate('apple', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/connexion?erreur=apple_echec`,
  }),
  callbackOAuth
);

export default router;
