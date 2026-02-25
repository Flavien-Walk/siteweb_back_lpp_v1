import { Router } from 'express';
import { getRecommendedProjects, getRecommendationDebug } from '../controllers/recommendationController.js';
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
 * GET /api/recommendations/debug
 * Debug du feed d'un utilisateur (admin only)
 */
router.get('/debug', verifierJwt, checkUserStatus, verifierAdmin, getRecommendationDebug);

export default router;
