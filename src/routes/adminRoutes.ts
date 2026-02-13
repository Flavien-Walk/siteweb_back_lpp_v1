import { Router } from 'express';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import { requirePermission, requireStaff, requireMinRole } from '../middlewares/checkUserStatus.js';
import {
  listerReports,
  traiterReport,
  getReportStats,
  escalateReport,
  assignReport,
  getAggregatedReports,
  getReportById,
  addReportNote,
} from '../controllers/reportController.js';
import {
  listAuditLogs,
  getAuditLog,
  getTargetHistory,
  getAuditStats,
  exportAuditLogs,
} from '../controllers/auditController.js';
import {
  getSecurityDashboard,
  getSecurityEventDetail,
  investigateIP,
  blockIP,
  unblockIP,
  getBlockedIPs,
  getSecurityEvents,
  getBackendHealth,
} from '../controllers/securityController.js';
import {
  getStaffMessages,
  sendStaffMessage,
  markMessagesAsRead,
  getUnreadCount,
  deleteStaffMessage,
  getDMConversations,
  getDMMessages,
  sendDMMessage,
} from '../controllers/staffChatController.js';
import {
  getDashboard,
  getMe,
} from '../controllers/dashboardController.js';
import {
  sendBroadcast,
  listBroadcasts,
} from '../controllers/broadcastController.js';
import {
  listUsers,
  getUserModerationDetails,
  getUserAuditHistory,
  getUserModerationTimeline,
  getUserReports,
  getUserActivity,
  getUsersStats,
  warnUser,
  suspendUser,
  banUser,
  unbanUser,
  changeUserRole,
  listPublications,
  getPublicationDetail,
  listCommentaires,
  listProjets,
  getProjetDetail,
  listConversations,
  getConversationMessages,
  listLives,
  listEvenements,
  // Nouvelles fonctions
  editCommentaire,
  editProjet,
  changeProjetStatus,
  toggleSurveillance,
  listSurveillanceUsers,
  getAtRiskUsers,
  getCommentaireThread,
} from '../controllers/moderationController.js';

const router = Router();

/**
 * Routes d'administration
 * Toutes les routes nécessitent authentification + permissions appropriées
 *
 * Mapping des routes pour l'outil de modération:
 * - /api/admin/me → info modérateur connecté
 * - /api/admin/dashboard → stats dashboard
 * - /api/admin/dashboard/stats → alias dashboard
 * - /api/admin/reports → signalements
 * - /api/admin/users → utilisateurs (liste, détails, audit, timeline)
 * - /api/admin/audit → audit logs
 * - /api/admin/chat → staff chat (alias de staff-chat)
 * - /api/admin/staff-chat → staff chat (original)
 */

// ============ DASHBOARD / INFO ============

// GET /api/admin/me - Info du modérateur connecté
router.get('/me', verifierJwt, requireStaff, getMe);

// GET /api/admin/dashboard - Données du dashboard (agrégées)
router.get('/dashboard', verifierJwt, requireStaff, getDashboard);

// GET /api/admin/dashboard/stats - Alias pour dashboard (compatibilité outil modération)
router.get('/dashboard/stats', verifierJwt, requireStaff, getDashboard);

// ============ UTILISATEURS ============

// GET /api/admin/users/stats - Statistiques globales des utilisateurs
router.get('/users/stats', verifierJwt, requirePermission('users:view'), getUsersStats);

// GET /api/admin/users/surveillance - Utilisateurs sous surveillance
router.get('/users/surveillance', verifierJwt, requirePermission('users:view'), listSurveillanceUsers);

// GET /api/admin/users/at-risk - Utilisateurs à risque
router.get('/users/at-risk', verifierJwt, requirePermission('users:view'), getAtRiskUsers);

// GET /api/admin/users - Lister les utilisateurs avec filtres
router.get('/users', verifierJwt, requirePermission('users:view'), listUsers);

// GET /api/admin/users/search - Recherche utilisateurs (même endpoint avec query param)
router.get('/users/search', verifierJwt, requirePermission('users:view'), listUsers);

// GET /api/admin/users/:id - Détails d'un utilisateur
router.get('/users/:id', verifierJwt, requirePermission('users:view'), getUserModerationDetails);

// GET /api/admin/users/:id/audit - Historique d'audit d'un utilisateur
router.get('/users/:id/audit', verifierJwt, requirePermission('audit:view'), getUserAuditHistory);

// GET /api/admin/users/:id/timeline - Timeline de modération d'un utilisateur
router.get('/users/:id/timeline', verifierJwt, requirePermission('users:view'), getUserModerationTimeline);

// GET /api/admin/users/:id/activity - Activité complète d'un utilisateur
router.get('/users/:id/activity', verifierJwt, requirePermission('users:view'), getUserActivity);

// GET /api/admin/users/:id/reports - Reports créés par l'utilisateur
router.get('/users/:id/reports', verifierJwt, requirePermission('users:view'), getUserReports);

// POST /api/admin/users/:id/warn - Avertir un utilisateur (alias)
router.post('/users/:id/warn', verifierJwt, requirePermission('users:warn'), warnUser);

// POST /api/admin/users/:id/suspend - Suspendre un utilisateur (alias)
router.post('/users/:id/suspend', verifierJwt, requirePermission('users:suspend'), suspendUser);

// POST /api/admin/users/:id/ban - Bannir un utilisateur (alias)
router.post('/users/:id/ban', verifierJwt, requirePermission('users:ban'), banUser);

// POST /api/admin/users/:id/unban - Débannir un utilisateur (alias)
router.post('/users/:id/unban', verifierJwt, requirePermission('users:unban'), unbanUser);

// PATCH /api/admin/users/:id/role - Changer le rôle d'un utilisateur (alias)
router.patch('/users/:id/role', verifierJwt, requirePermission('users:edit_roles'), changeUserRole);

// POST /api/admin/users/:id/surveillance - Toggle surveillance (alias)
router.post('/users/:id/surveillance', verifierJwt, requirePermission('users:warn'), toggleSurveillance);

// ============ SIGNALEMENTS ============

// GET /api/admin/reports - Lister les signalements
router.get('/reports', verifierJwt, requirePermission('reports:view'), listerReports);

// GET /api/admin/reports/stats - Stats des signalements
router.get('/reports/stats', verifierJwt, requirePermission('reports:view'), getReportStats);

// GET /api/admin/reports/aggregated - Signalements agrégés par cible
router.get('/reports/aggregated', verifierJwt, requirePermission('reports:view'), getAggregatedReports);

// GET /api/admin/reports/:id - Détail d'un signalement
router.get('/reports/:id', verifierJwt, requirePermission('reports:view'), getReportById);

// PATCH /api/admin/reports/:id - Traiter un signalement
router.patch('/reports/:id', verifierJwt, requirePermission('reports:process'), traiterReport);

// POST /api/admin/reports/:id/process - Traiter un signalement (alias pour l'outil)
router.post('/reports/:id/process', verifierJwt, requirePermission('reports:process'), traiterReport);

// POST /api/admin/reports/:id/escalate - Escalader un signalement
router.post('/reports/:id/escalate', verifierJwt, requirePermission('reports:escalate'), escalateReport);

// POST /api/admin/reports/:id/assign - Assigner un signalement
router.post('/reports/:id/assign', verifierJwt, requirePermission('reports:process'), assignReport);

// POST /api/admin/reports/:id/notes - Ajouter une note interne à un signalement
router.post('/reports/:id/notes', verifierJwt, requirePermission('reports:process'), addReportNote);

// ============ AUDIT LOGS ============

// GET /api/admin/audit - Lister les audit logs
router.get('/audit', verifierJwt, requirePermission('audit:view'), listAuditLogs);

// GET /api/admin/audit/stats - Stats des audit logs
router.get('/audit/stats', verifierJwt, requirePermission('audit:view'), getAuditStats);

// GET /api/admin/audit/export - Exporter les audit logs en CSV
router.get('/audit/export', verifierJwt, requirePermission('audit:export'), exportAuditLogs);

// GET /api/admin/audit/actions - Liste des types d'actions (pour filtres)
router.get('/audit/actions', verifierJwt, requirePermission('audit:view'), (_req, res) => {
  res.status(200).json({
    succes: true,
    data: {
      actions: [
        'user:warn', 'user:warn_remove', 'user:suspend', 'user:unsuspend',
        'user:ban', 'user:unban', 'user:role_change',
        'user:permission_add', 'user:permission_remove',
        'user:surveillance_on', 'user:surveillance_off',
        'content:hide', 'content:unhide', 'content:delete', 'content:restore', 'content:edit',
        'report:process', 'report:escalate', 'report:dismiss', 'report:assign',
        'config:update', 'staff:login', 'staff:logout',
      ],
    },
  });
});

// GET /api/admin/audit/target/:targetType/:targetId - Historique d'une cible
router.get('/audit/target/:targetType/:targetId', verifierJwt, requirePermission('audit:view'), getTargetHistory);

// GET /api/admin/audit/:id - Détail d'un audit log
router.get('/audit/:id', verifierJwt, requirePermission('audit:view'), getAuditLog);

// ============ STAFF CHAT ============

// Original endpoints
// GET /api/admin/staff-chat - Récupérer les messages
router.get('/staff-chat', verifierJwt, requirePermission('staff:chat'), getStaffMessages);

// POST /api/admin/staff-chat - Envoyer un message
router.post('/staff-chat', verifierJwt, requirePermission('staff:chat'), sendStaffMessage);

// GET /api/admin/staff-chat/unread-count - Nombre de messages non lus
router.get('/staff-chat/unread-count', verifierJwt, requirePermission('staff:chat'), getUnreadCount);

// POST /api/admin/staff-chat/read - Marquer comme lus
router.post('/staff-chat/read', verifierJwt, requirePermission('staff:chat'), markMessagesAsRead);

// --- Messages privés (DM) ---
// GET /api/admin/staff-chat/dm - Liste des conversations privées
router.get('/staff-chat/dm', verifierJwt, requirePermission('staff:chat'), getDMConversations);

// GET /api/admin/staff-chat/dm/:userId - Messages d'une conversation privée
router.get('/staff-chat/dm/:userId', verifierJwt, requirePermission('staff:chat'), getDMMessages);

// POST /api/admin/staff-chat/dm/:userId - Envoyer un message privé
router.post('/staff-chat/dm/:userId', verifierJwt, requirePermission('staff:chat'), sendDMMessage);

// DELETE /api/admin/staff-chat/:id - Supprimer un message
router.delete('/staff-chat/:id', verifierJwt, requirePermission('staff:chat'), deleteStaffMessage);

// Alias endpoints pour l'outil de modération (/api/admin/chat)
// GET /api/admin/chat - Récupérer les messages (alias)
router.get('/chat', verifierJwt, requirePermission('staff:chat'), getStaffMessages);

// POST /api/admin/chat - Envoyer un message (alias)
router.post('/chat', verifierJwt, requirePermission('staff:chat'), sendStaffMessage);

// GET /api/admin/chat/unread - Nombre de messages non lus (alias)
router.get('/chat/unread', verifierJwt, requirePermission('staff:chat'), getUnreadCount);

// POST /api/admin/chat/read - Marquer comme lus (alias)
router.post('/chat/read', verifierJwt, requirePermission('staff:chat'), markMessagesAsRead);

// --- Messages privés (DM) alias ---
router.get('/chat/dm', verifierJwt, requirePermission('staff:chat'), getDMConversations);
router.get('/chat/dm/:userId', verifierJwt, requirePermission('staff:chat'), getDMMessages);
router.post('/chat/dm/:userId', verifierJwt, requirePermission('staff:chat'), sendDMMessage);

// DELETE /api/admin/chat/:id - Supprimer un message (alias)
router.delete('/chat/:id', verifierJwt, requirePermission('staff:chat'), deleteStaffMessage);

// ============ PUBLICATIONS ============

// GET /api/admin/publications - Lister les publications
router.get('/publications', verifierJwt, requirePermission('content:hide'), listPublications);

// GET /api/admin/publications/:id - Détail d'une publication
router.get('/publications/:id', verifierJwt, requirePermission('content:hide'), getPublicationDetail);

// ============ COMMENTAIRES ============

// GET /api/admin/commentaires - Lister les commentaires
router.get('/commentaires', verifierJwt, requirePermission('content:hide'), listCommentaires);

// GET /api/admin/commentaires/:id/thread - Thread d'un commentaire
router.get('/commentaires/:id/thread', verifierJwt, requirePermission('content:hide'), getCommentaireThread);

// PATCH /api/admin/commentaires/:id - Editer un commentaire (alias)
router.patch('/commentaires/:id', verifierJwt, requirePermission('content:edit'), editCommentaire);

// ============ PROJETS ============

// GET /api/admin/projets - Lister les projets
router.get('/projets', verifierJwt, requirePermission('content:hide'), listProjets);

// GET /api/admin/projets/:id - Détail d'un projet
router.get('/projets/:id', verifierJwt, requirePermission('content:hide'), getProjetDetail);

// PATCH /api/admin/projets/:id - Editer un projet (alias)
router.patch('/projets/:id', verifierJwt, requirePermission('content:edit'), editProjet);

// PATCH /api/admin/projets/:id/status - Changer statut projet (alias)
router.patch('/projets/:id/status', verifierJwt, requirePermission('content:edit'), changeProjetStatus);

// ============ CONVERSATIONS ============

// GET /api/admin/conversations - Lister les conversations
router.get('/conversations', verifierJwt, requirePermission('users:view'), listConversations);

// GET /api/admin/conversations/:id/messages - Messages d'une conversation
router.get('/conversations/:id/messages', verifierJwt, requirePermission('users:view'), getConversationMessages);

// ============ LIVES ============

// GET /api/admin/lives - Lister les lives
router.get('/lives', verifierJwt, requirePermission('content:hide'), listLives);

// ============ EVENEMENTS ============

// GET /api/admin/evenements - Lister les événements
router.get('/evenements', verifierJwt, requirePermission('content:hide'), listEvenements);

// ============ SECURITE ============

// GET /api/admin/security/dashboard - Tableau de bord securite
router.get('/security/dashboard', verifierJwt, requirePermission('audit:view'), getSecurityDashboard);

// GET /api/admin/security/events - Liste des evenements avec filtres
router.get('/security/events', verifierJwt, requirePermission('audit:view'), getSecurityEvents);

// GET /api/admin/security/events/:id - Detail d'un evenement
router.get('/security/events/:id', verifierJwt, requirePermission('audit:view'), getSecurityEventDetail);

// GET /api/admin/security/investigate/:ip - Enquete approfondie sur une IP
router.get('/security/investigate/:ip', verifierJwt, requirePermission('audit:view'), investigateIP);

// GET /api/admin/security/blocked-ips - Liste des IPs bloquees
router.get('/security/blocked-ips', verifierJwt, requirePermission('audit:view'), getBlockedIPs);

// POST /api/admin/security/block-ip - Bloquer une IP
router.post('/security/block-ip', verifierJwt, requireMinRole('admin_modo'), blockIP);

// DELETE /api/admin/security/unblock-ip/:id - Debloquer une IP
router.delete('/security/unblock-ip/:id', verifierJwt, requireMinRole('admin_modo'), unblockIP);

// GET /api/admin/security/health - Analyse sante backend temps reel
router.get('/security/health', verifierJwt, requireMinRole('admin_modo'), getBackendHealth);

// ============ NOTIFICATIONS BROADCAST ============

// GET /api/admin/notifications/broadcast - Historique des notifications broadcast
router.get('/notifications/broadcast', verifierJwt, requireMinRole('admin_modo'), listBroadcasts);

// POST /api/admin/notifications/broadcast - Envoyer une notification broadcast
router.post('/notifications/broadcast', verifierJwt, requireMinRole('admin_modo'), sendBroadcast);

export default router;
