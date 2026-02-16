import { Router } from 'express';
import {
  getMonParcours,
  enregistrerAction,
  getQuetes,
  getParcoursPublic,
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

/**
 * GET /api/parcours/utilisateur/:id
 * Parcours public d'un utilisateur (profil public ou amis)
 */
router.get('/utilisateur/:id', getParcoursPublic);

export default router;
