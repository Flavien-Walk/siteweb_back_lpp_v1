import { Router } from 'express';
import {
  logShare,
  getActivityStats,
  getUserActivity,
} from '../controllers/activityController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { verifierAdmin } from '../middlewares/verifierAdmin.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

// Toutes les routes nécessitent l'authentification et vérification du statut
router.use(verifierJwt);
router.use(checkUserStatus);

/**
 * POST /api/activity/share
 * Logger un partage de publication
 * Accessible à tous les utilisateurs connectés
 */
router.post('/share', logShare);

/**
 * GET /api/activity/stats/:targetType/:targetId
 * Statistiques d'activité pour une cible
 * Staff uniquement
 */
router.get('/stats/:targetType/:targetId', verifierAdmin, getActivityStats);

/**
 * GET /api/activity/user/:userId
 * Historique d'activité d'un utilisateur
 * Staff uniquement
 */
router.get('/user/:userId', verifierAdmin, getUserActivity);

export default router;
