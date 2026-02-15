import { Router } from 'express';
import {
  getMonParcours,
  enregistrerAction,
  getQuetes,
} from '../controllers/parcoursController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

// Toutes les routes sont protegees
router.use(verifierJwt);
router.use(checkUserStatus);

/**
 * GET /api/parcours/moi
 * Retourne le parcours de l'utilisateur connecte + defi actif + quetes
 */
router.get('/moi', getMonParcours);

/**
 * POST /api/parcours/action
 * Enregistre une action gamifiee (follow, like, comment, etc.)
 */
router.post('/action', enregistrerAction);

/**
 * GET /api/parcours/quetes
 * Liste de toutes les quetes avec statut de completion
 */
router.get('/quetes', getQuetes);

export default router;
