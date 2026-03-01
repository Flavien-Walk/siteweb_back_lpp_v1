import { Router } from 'express';
import {
  mesNotifications,
  marquerLue,
  marquerToutLu,
  supprimerNotification,
  supprimerToutesNotifications,
  enregistrerPushToken,
  supprimerPushToken,
  getPreferencesNotifications,
  majPreferencesNotifications,
  testPush,
} from '../controllers/notificationController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

const router = Router();

// Toutes les routes nécessitent l'authentification et vérification du statut
router.use(verifierJwt);
router.use(checkUserStatus);

/**
 * GET /api/notifications
 * Mes notifications
 */
router.get('/', mesNotifications);

/**
 * POST /api/notifications/push-token
 * Enregistrer un push token Expo
 */
router.post('/push-token', enregistrerPushToken);

/**
 * DELETE /api/notifications/push-token
 * Supprimer un push token (logout)
 */
router.delete('/push-token', supprimerPushToken);

/**
 * GET /api/notifications/preferences
 * Récupérer les préférences push
 */
router.get('/preferences', getPreferencesNotifications);

/**
 * PATCH /api/notifications/preferences
 * Mettre à jour les préférences push
 */
router.patch('/preferences', majPreferencesNotifications);

/**
 * POST /api/notifications/test-push
 * Envoyer une push de test (diagnostic)
 */
router.post('/test-push', testPush);

/**
 * PATCH /api/notifications/lire-tout
 * Marquer toutes comme lues (doit être avant /:id)
 */
router.patch('/lire-tout', marquerToutLu);

/**
 * DELETE /api/notifications/toutes
 * Supprimer toutes les notifications (doit être avant /:id)
 */
router.delete('/toutes', supprimerToutesNotifications);

/**
 * PATCH /api/notifications/:id/lue
 * Marquer une notification comme lue
 */
router.patch('/:id/lue', marquerLue);

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 */
router.delete('/:id', supprimerNotification);

export default router;
