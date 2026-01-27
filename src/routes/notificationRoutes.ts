import { Router } from 'express';
import { mesNotifications, marquerLue, marquerToutLu } from '../controllers/notificationController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';

const router = Router();

// Toutes les routes nécessitent l'authentification
router.use(verifierJwt);

/**
 * GET /api/notifications
 * Mes notifications
 */
router.get('/', mesNotifications);

/**
 * PATCH /api/notifications/lire-tout
 * Marquer toutes comme lues (doit être avant /:id)
 */
router.patch('/lire-tout', marquerToutLu);

/**
 * PATCH /api/notifications/:id/lue
 * Marquer une notification comme lue
 */
router.patch('/:id/lue', marquerLue);

export default router;
