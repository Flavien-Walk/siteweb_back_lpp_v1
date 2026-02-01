import { Router } from 'express';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { verifierAdmin } from '../middlewares/verifierAdmin.js';
import {
  listerReports,
  traiterReport,
  getReportStats,
} from '../controllers/reportController.js';

const router = Router();

/**
 * Routes d'administration
 * Toutes les routes nécessitent authentification + rôle admin
 */

// ============ SIGNALEMENTS ============

// GET /api/admin/reports - Lister les signalements
router.get('/reports', verifierJwt, verifierAdmin, listerReports);

// GET /api/admin/reports/stats - Stats des signalements
router.get('/reports/stats', verifierJwt, verifierAdmin, getReportStats);

// PATCH /api/admin/reports/:id - Traiter un signalement
router.patch('/reports/:id', verifierJwt, verifierAdmin, traiterReport);

export default router;
