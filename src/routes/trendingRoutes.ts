import { Router } from 'express';
import { getTrending, getTrendingProjectDebug } from '../controllers/trendingController.js';
import { chargerUtilisateurOptionnel, verifierJwt } from '../middlewares/verifierJwt.js';
import { verifierAdmin } from '../middlewares/verifierAdmin.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

/**
 * GET /api/trending/projects
 * Liste des projets trending (auth optionnelle pour estSuivi)
 */
router.get('/projects', chargerUtilisateurOptionnel, getTrending);

/**
 * GET /api/trending/projects/:id/debug
 * Debug scoring d'un projet (admin only)
 */
router.get('/projects/:id/debug', verifierJwt, checkUserStatus, verifierAdmin, getTrendingProjectDebug);

export default router;
