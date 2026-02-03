/**
 * Routes Live - Endpoints pour les diffusions vidéo en direct
 */

import { Router } from 'express';
import {
  startLive,
  endLive,
  getActiveLives,
  getAgoraTokenEndpoint,
  joinLive,
  leaveLive,
  getUserLiveStatus,
} from '../controllers/liveController.js';
import { verifierJwt, chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

/**
 * GET /api/live/active
 * Liste des lives en cours (auth optionnelle)
 */
router.get('/active', chargerUtilisateurOptionnel, getActiveLives);

/**
 * GET /api/live/user/:userId
 * Vérifier si un utilisateur est en live (auth optionnelle)
 */
router.get('/user/:userId', chargerUtilisateurOptionnel, getUserLiveStatus);

/**
 * POST /api/live/start
 * Démarrer un nouveau live (auth requise)
 */
router.post('/start', verifierJwt, checkUserStatus, startLive);

/**
 * POST /api/live/end
 * Arrêter son live (auth requise, hôte uniquement)
 */
router.post('/end', verifierJwt, checkUserStatus, endLive);

/**
 * POST /api/live/token
 * Obtenir un token Agora (auth requise)
 */
router.post('/token', verifierJwt, checkUserStatus, getAgoraTokenEndpoint);

/**
 * POST /api/live/:id/join
 * Rejoindre un live (incrémenter viewers)
 */
router.post('/:id/join', verifierJwt, checkUserStatus, joinLive);

/**
 * POST /api/live/:id/leave
 * Quitter un live (décrémenter viewers)
 */
router.post('/:id/leave', verifierJwt, checkUserStatus, leaveLive);

export default router;
