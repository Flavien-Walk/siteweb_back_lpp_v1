import { Router } from 'express';
import { listerProjets, detailProjet, toggleSuivreProjet, mesProjets } from '../controllers/projetController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

/**
 * GET /api/projets/suivis
 * Mes projets suivis (doit être avant /:id)
 */
router.get('/suivis', verifierJwt, checkUserStatus, mesProjets);

/**
 * GET /api/projets
 * Liste des projets avec filtres
 */
router.get('/', listerProjets);

/**
 * GET /api/projets/:id
 * Détail d'un projet
 */
router.get('/:id', detailProjet);

/**
 * POST /api/projets/:id/suivre
 * Suivre / ne plus suivre un projet
 */
router.post('/:id/suivre', verifierJwt, checkUserStatus, toggleSuivreProjet);

export default router;
