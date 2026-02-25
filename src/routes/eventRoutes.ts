import { Router } from 'express';
import { ingestEvents } from '../controllers/eventController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limit: 100 requetes / minute par user (events batch)
const limiterEvents = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    succes: false,
    message: 'Trop d\'events. Veuillez réessayer dans quelques secondes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/events
 * Ingestion batch d'events d'engagement
 * Auth requise + rate limit
 */
router.post('/', limiterEvents, verifierJwt, checkUserStatus, ingestEvents);

export default router;
