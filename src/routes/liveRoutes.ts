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
router.post('/start', verifierJwt, startLive);

/**
 * POST /api/live/end
 * Arrêter son live (auth requise, hôte uniquement)
 */
router.post('/end', verifierJwt, endLive);

/**
 * POST /api/live/token
 * Obtenir un token Agora (auth requise)
 */
router.post('/token', verifierJwt, getAgoraTokenEndpoint);

/**
 * POST /api/live/:id/join
 * Rejoindre un live (incrémenter viewers)
 */
router.post('/:id/join', verifierJwt, joinLive);

/**
 * POST /api/live/:id/leave
 * Quitter un live (décrémenter viewers)
 */
router.post('/:id/leave', verifierJwt, leaveLive);

export default router;
