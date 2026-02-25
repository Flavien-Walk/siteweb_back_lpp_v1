import { Router } from 'express';
import { getRecommendedProjects, getRecommendationDebug, saveOnboardingInterests } from '../controllers/recommendationController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { verifierAdmin } from '../middlewares/verifierAdmin.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

/**
 * GET /api/recommendations/projects
 * Feed personnalise "Pour Toi" (auth requise)
 */
router.get('/projects', verifierJwt, checkUserStatus, getRecommendedProjects);

/**
 * POST /api/recommendations/onboarding-interests
 * Sauvegarder les interets de l'onboarding
 */
router.post('/onboarding-interests', verifierJwt, checkUserStatus, saveOnboardingInterests);

/**
 * GET /api/recommendations/debug
 * Debug du feed d'un utilisateur (admin only)
 */
router.get('/debug', verifierJwt, checkUserStatus, verifierAdmin, getRecommendationDebug);

export default router;
