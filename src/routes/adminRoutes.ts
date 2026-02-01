import { Router } from 'express';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { requirePermission, requireStaff } from '../middlewares/checkUserStatus.js';
import {
  listerReports,
  traiterReport,
  getReportStats,
  escalateReport,
  assignReport,
  getAggregatedReports,
} from '../controllers/reportController.js';
import {
  listAuditLogs,
  getAuditLog,
  getTargetHistory,
  getAuditStats,
  exportAuditLogs,
} from '../controllers/auditController.js';
import {
  getStaffMessages,
  sendStaffMessage,
  markMessagesAsRead,
  getUnreadCount,
} from '../controllers/staffChatController.js';
import {
  getDashboard,
  getMe,
} from '../controllers/dashboardController.js';

const router = Router();

/**
 * Routes d'administration
 * Toutes les routes nécessitent authentification + permissions appropriées
 *
 * Permissions utilisées :
 * - reports:view : voir les signalements
 * - reports:process : traiter les signalements
 * - reports:escalate : escalader les signalements
 * - audit:view : voir les audit logs
 * - audit:export : exporter les audit logs
 * - staff:chat : accéder au staff chat
 */

// ============ SIGNALEMENTS ============

// GET /api/admin/reports - Lister les signalements
router.get('/reports', verifierJwt, requirePermission('reports:view'), listerReports);

// GET /api/admin/reports/stats - Stats des signalements
router.get('/reports/stats', verifierJwt, requirePermission('reports:view'), getReportStats);

// GET /api/admin/reports/aggregated - Signalements agrégés par cible
router.get('/reports/aggregated', verifierJwt, requirePermission('reports:view'), getAggregatedReports);

// PATCH /api/admin/reports/:id - Traiter un signalement
router.patch('/reports/:id', verifierJwt, requirePermission('reports:process'), traiterReport);

// POST /api/admin/reports/:id/escalate - Escalader un signalement
router.post('/reports/:id/escalate', verifierJwt, requirePermission('reports:escalate'), escalateReport);

// POST /api/admin/reports/:id/assign - Assigner un signalement
router.post('/reports/:id/assign', verifierJwt, requirePermission('reports:process'), assignReport);

// ============ AUDIT LOGS ============

// GET /api/admin/audit - Lister les audit logs
router.get('/audit', verifierJwt, requirePermission('audit:view'), listAuditLogs);

// GET /api/admin/audit/stats - Stats des audit logs
router.get('/audit/stats', verifierJwt, requirePermission('audit:view'), getAuditStats);

// GET /api/admin/audit/export - Exporter les audit logs en CSV
router.get('/audit/export', verifierJwt, requirePermission('audit:export'), exportAuditLogs);

// GET /api/admin/audit/target/:targetType/:targetId - Historique d'une cible
router.get('/audit/target/:targetType/:targetId', verifierJwt, requirePermission('audit:view'), getTargetHistory);

// GET /api/admin/audit/:id - Détail d'un audit log
router.get('/audit/:id', verifierJwt, requirePermission('audit:view'), getAuditLog);

// ============ STAFF CHAT ============

// GET /api/admin/staff-chat - Récupérer les messages
router.get('/staff-chat', verifierJwt, requirePermission('staff:chat'), getStaffMessages);

// POST /api/admin/staff-chat - Envoyer un message
router.post('/staff-chat', verifierJwt, requirePermission('staff:chat'), sendStaffMessage);

// GET /api/admin/staff-chat/unread-count - Nombre de messages non lus
router.get('/staff-chat/unread-count', verifierJwt, requirePermission('staff:chat'), getUnreadCount);

// POST /api/admin/staff-chat/read - Marquer comme lus
router.post('/staff-chat/read', verifierJwt, requirePermission('staff:chat'), markMessagesAsRead);

// ============ DASHBOARD / INFO ============

// GET /api/admin/dashboard - Données du dashboard (agrégées)
router.get('/dashboard', verifierJwt, requireStaff, getDashboard);

// GET /api/admin/me - Info du modérateur connecté
router.get('/me', verifierJwt, requireStaff, getMe);

export default router;
