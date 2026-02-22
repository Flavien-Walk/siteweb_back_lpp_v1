import { Router } from 'express';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';
import {
  getSubscription,
  activateSubscription,
  cancelSubscription,
  reactivateSubscription,
} from '../controllers/subscriptionController.js';

const router = Router();

// Toutes les routes necessitent une authentification
router.use(verifierJwt, checkUserStatus);

// GET /api/subscriptions/lpp-plus — Statut de l'abonnement
router.get('/lpp-plus', getSubscription);

// POST /api/subscriptions/lpp-plus/activate — Activer l'abonnement
router.post('/lpp-plus/activate', activateSubscription);

// POST /api/subscriptions/lpp-plus/cancel — Resilier l'abonnement
router.post('/lpp-plus/cancel', cancelSubscription);

// POST /api/subscriptions/lpp-plus/reactivate — Reactiver l'abonnement
router.post('/lpp-plus/reactivate', reactivateSubscription);

export default router;
