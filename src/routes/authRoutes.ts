import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import {
  inscription,
  connexion,
  moi,
  callbackOAuth,
  getOAuthToken,
  exchangeOAuthCode,
  getSanctionInfo,
} from '../controllers/authController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { generateOAuthState } from '../utils/oauthStore.js';

const router = Router();

/**
 * Middleware pour generer un state OAuth securise avec nonce CSRF
 * Le nonce est stocke cote serveur et valide au callback (anti-CSRF)
 */
const genererStateSecurise = () => (req: Request, res: Response, next: NextFunction) => {
  // Determiner la plateforme (web par defaut, mobile si specifie)
  const platformParam = req.query.platform as string;
  const platform: 'web' | 'mobile' = platformParam === 'mobile' ? 'mobile' : 'web';

  // Generer un state securise avec nonce CSRF
  const state = generateOAuthState(platform);

  // Passer le state a passport
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

/**
 * GET /api/auth/sanction-info
 * Recuperer les informations de sanction (accessible meme si banni/suspendu)
 * Permet d'afficher la raison et le post concerne sur l'ecran de restriction
 */
router.get('/sanction-info', verifierJwt, getSanctionInfo);

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
  genererStateSecurise(),
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
  genererStateSecurise(),
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
  genererStateSecurise(),
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

/**
 * POST /api/auth/exchange-code
 * Echanger un code temporaire contre un token JWT
 * Utilise par le mobile apres le callback OAuth (securise: code one-time)
 */
router.post('/exchange-code', exchangeOAuthCode);

export default router;