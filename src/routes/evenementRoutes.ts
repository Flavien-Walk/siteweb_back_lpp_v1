import { Router } from 'express';
import { listerEvenements } from '../controllers/evenementController.js';

const router = Router();

/**
 * GET /api/evenements
 * Liste des événements
 */
router.get('/', listerEvenements);

export default router;
