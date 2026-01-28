import { Router } from 'express';
import { getFeed } from '../controllers/feedController.js';
import { chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';

const router = Router();

/**
 * GET /api/feed
 * Fil d'actualité
 */
router.get('/', chargerUtilisateurOptionnel, getFeed);

export default router;
