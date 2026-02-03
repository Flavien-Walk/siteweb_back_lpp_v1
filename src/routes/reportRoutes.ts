import { Router } from 'express';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';
import { creerReport } from '../controllers/reportController.js';

const router = Router();

/**
 * Routes de signalement (utilisateurs authentifiés)
 */

// POST /api/reports - Créer un signalement
router.post('/', verifierJwt, checkUserStatus, creerReport);

export default router;
