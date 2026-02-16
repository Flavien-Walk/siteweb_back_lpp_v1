import { Router } from 'express';
import {
  getMyGamification,
  getQuickQuests,
  dismissOnboarding,
  resumeOnboarding,
  getPublicGamification,
} from '../controllers/gamificationController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

/**
 * GET /api/gamification/me
 * Etat complet gamification (auth requise)
 */
router.get('/me', verifierJwt, checkUserStatus, getMyGamification);

/**
 * GET /api/gamification/quick-quests
 * Quetes rapides actives pour la home (auth requise)
 */
router.get('/quick-quests', verifierJwt, checkUserStatus, getQuickQuests);

/**
 * POST /api/gamification/onboarding/dismiss
 * Mettre l'onboarding en pause
 */
router.post('/onboarding/dismiss', verifierJwt, checkUserStatus, dismissOnboarding);

/**
 * POST /api/gamification/onboarding/resume
 * Reprendre l'onboarding
 */
router.post('/onboarding/resume', verifierJwt, checkUserStatus, resumeOnboarding);

/**
 * GET /api/gamification/public/:userId
 * Badge public d'un utilisateur
 */
router.get('/public/:userId', verifierJwt, getPublicGamification);

export default router;
