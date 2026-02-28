"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifierJwt_js_1 = require("../middlewares/verifierJwt.js");
const checkUserStatus_js_1 = require("../middlewares/checkUserStatus.js");
const reportController_js_1 = require("../controllers/reportController.js");
const auditController_js_1 = require("../controllers/auditController.js");
const securityController_js_1 = require("../controllers/securityController.js");
const staffChatController_js_1 = require("../controllers/staffChatController.js");
const dashboardController_js_1 = require("../controllers/dashboardController.js");
const broadcastController_js_1 = require("../controllers/broadcastController.js");
const supportTicketController_js_1 = require("../controllers/supportTicketController.js");
const gamificationController_js_1 = require("../controllers/gamificationController.js");
const moderationController_js_1 = require("../controllers/moderationController.js");
const index_js_1 = require("../controllers/adminMarketplace/index.js");
const router = (0, express_1.Router)();
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
router.get('/me', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.requireStaff, dashboardController_js_1.getMe);
// GET /api/admin/dashboard - Données du dashboard (agrégées)
router.get('/dashboard', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.requireStaff, dashboardController_js_1.getDashboard);
// GET /api/admin/dashboard/stats - Alias pour dashboard (compatibilité outil modération)
router.get('/dashboard/stats', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.requireStaff, dashboardController_js_1.getDashboard);
// ============ UTILISATEURS ============
// GET /api/admin/users/stats - Statistiques globales des utilisateurs
router.get('/users/stats', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.getUsersStats);
// GET /api/admin/users/surveillance - Utilisateurs sous surveillance
router.get('/users/surveillance', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.listSurveillanceUsers);
// GET /api/admin/users/at-risk - Utilisateurs à risque
router.get('/users/at-risk', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.getAtRiskUsers);
// GET /api/admin/users - Lister les utilisateurs avec filtres
router.get('/users', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.listUsers);
// GET /api/admin/users/search - Recherche utilisateurs (même endpoint avec query param)
router.get('/users/search', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.listUsers);
// GET /api/admin/users/:id - Détails d'un utilisateur
router.get('/users/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.getUserModerationDetails);
// GET /api/admin/users/:id/audit - Historique d'audit d'un utilisateur
router.get('/users/:id/audit', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), moderationController_js_1.getUserAuditHistory);
// GET /api/admin/users/:id/timeline - Timeline de modération d'un utilisateur
router.get('/users/:id/timeline', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.getUserModerationTimeline);
// GET /api/admin/users/:id/activity - Activité complète d'un utilisateur
router.get('/users/:id/activity', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.getUserActivity);
// GET /api/admin/users/:id/reports - Reports créés par l'utilisateur
router.get('/users/:id/reports', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.getUserReports);
// POST /api/admin/users/:id/warn - Avertir un utilisateur (alias)
router.post('/users/:id/warn', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:warn'), moderationController_js_1.warnUser);
// POST /api/admin/users/:id/suspend - Suspendre un utilisateur (alias)
router.post('/users/:id/suspend', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:suspend'), moderationController_js_1.suspendUser);
// POST /api/admin/users/:id/ban - Bannir un utilisateur (alias)
router.post('/users/:id/ban', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:ban'), moderationController_js_1.banUser);
// POST /api/admin/users/:id/unban - Débannir un utilisateur (alias)
router.post('/users/:id/unban', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:unban'), moderationController_js_1.unbanUser);
// PATCH /api/admin/users/:id/role - Changer le rôle d'un utilisateur (alias)
router.patch('/users/:id/role', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:edit_roles'), moderationController_js_1.changeUserRole);
// POST /api/admin/users/:id/surveillance - Toggle surveillance (alias)
router.post('/users/:id/surveillance', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:warn'), moderationController_js_1.toggleSurveillance);
// ============ SIGNALEMENTS ============
// GET /api/admin/reports - Lister les signalements
router.get('/reports', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:view'), reportController_js_1.listerReports);
// GET /api/admin/reports/stats - Stats des signalements
router.get('/reports/stats', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:view'), reportController_js_1.getReportStats);
// GET /api/admin/reports/aggregated - Signalements agrégés par cible
router.get('/reports/aggregated', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:view'), reportController_js_1.getAggregatedReports);
// GET /api/admin/reports/:id - Détail d'un signalement
router.get('/reports/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:view'), reportController_js_1.getReportById);
// PATCH /api/admin/reports/:id - Traiter un signalement
router.patch('/reports/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:process'), reportController_js_1.traiterReport);
// POST /api/admin/reports/:id/process - Traiter un signalement (alias pour l'outil)
router.post('/reports/:id/process', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:process'), reportController_js_1.traiterReport);
// POST /api/admin/reports/:id/escalate - Escalader un signalement
router.post('/reports/:id/escalate', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:escalate'), reportController_js_1.escalateReport);
// POST /api/admin/reports/:id/assign - Assigner un signalement
router.post('/reports/:id/assign', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:process'), reportController_js_1.assignReport);
// POST /api/admin/reports/:id/notes - Ajouter une note interne à un signalement
router.post('/reports/:id/notes', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('reports:process'), reportController_js_1.addReportNote);
// ============ AUDIT LOGS ============
// GET /api/admin/audit - Lister les audit logs
router.get('/audit', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), auditController_js_1.listAuditLogs);
// GET /api/admin/audit/stats - Stats des audit logs
router.get('/audit/stats', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), auditController_js_1.getAuditStats);
// GET /api/admin/audit/export - Exporter les audit logs en CSV
router.get('/audit/export', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:export'), auditController_js_1.exportAuditLogs);
// GET /api/admin/audit/actions - Liste des types d'actions (pour filtres)
router.get('/audit/actions', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), (_req, res) => {
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
router.get('/audit/target/:targetType/:targetId', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), auditController_js_1.getTargetHistory);
// GET /api/admin/audit/:id - Détail d'un audit log
router.get('/audit/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), auditController_js_1.getAuditLog);
// ============ STAFF CHAT ============
// Original endpoints
// GET /api/admin/staff-chat - Récupérer les messages
router.get('/staff-chat', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.getStaffMessages);
// POST /api/admin/staff-chat - Envoyer un message
router.post('/staff-chat', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.sendStaffMessage);
// GET /api/admin/staff-chat/unread-count - Nombre de messages non lus
router.get('/staff-chat/unread-count', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.getUnreadCount);
// POST /api/admin/staff-chat/read - Marquer comme lus
router.post('/staff-chat/read', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.markMessagesAsRead);
// --- Messages privés (DM) ---
// GET /api/admin/staff-chat/dm - Liste des conversations privées
router.get('/staff-chat/dm', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.getDMConversations);
// GET /api/admin/staff-chat/dm/:userId - Messages d'une conversation privée
router.get('/staff-chat/dm/:userId', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.getDMMessages);
// POST /api/admin/staff-chat/dm/:userId - Envoyer un message privé
router.post('/staff-chat/dm/:userId', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.sendDMMessage);
// DELETE /api/admin/staff-chat/:id - Supprimer un message
router.delete('/staff-chat/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.deleteStaffMessage);
// Alias endpoints pour l'outil de modération (/api/admin/chat)
// GET /api/admin/chat - Récupérer les messages (alias)
router.get('/chat', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.getStaffMessages);
// POST /api/admin/chat - Envoyer un message (alias)
router.post('/chat', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.sendStaffMessage);
// GET /api/admin/chat/unread - Nombre de messages non lus (alias)
router.get('/chat/unread', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.getUnreadCount);
// POST /api/admin/chat/read - Marquer comme lus (alias)
router.post('/chat/read', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.markMessagesAsRead);
// --- Messages privés (DM) alias ---
router.get('/chat/dm', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.getDMConversations);
router.get('/chat/dm/:userId', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.getDMMessages);
router.post('/chat/dm/:userId', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.sendDMMessage);
// DELETE /api/admin/chat/:id - Supprimer un message (alias)
router.delete('/chat/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('staff:chat'), staffChatController_js_1.deleteStaffMessage);
// ============ PUBLICATIONS ============
// GET /api/admin/publications - Lister les publications
router.get('/publications', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:hide'), moderationController_js_1.listPublications);
// GET /api/admin/publications/:id - Détail d'une publication
router.get('/publications/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:hide'), moderationController_js_1.getPublicationDetail);
// ============ COMMENTAIRES ============
// GET /api/admin/commentaires - Lister les commentaires
router.get('/commentaires', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:hide'), moderationController_js_1.listCommentaires);
// GET /api/admin/commentaires/:id/thread - Thread d'un commentaire
router.get('/commentaires/:id/thread', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:hide'), moderationController_js_1.getCommentaireThread);
// PATCH /api/admin/commentaires/:id - Editer un commentaire (alias)
router.patch('/commentaires/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:edit'), moderationController_js_1.editCommentaire);
// ============ PROJETS ============
// GET /api/admin/projets - Lister les projets
router.get('/projets', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:hide'), moderationController_js_1.listProjets);
// GET /api/admin/projets/:id - Détail d'un projet
router.get('/projets/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:hide'), moderationController_js_1.getProjetDetail);
// PATCH /api/admin/projets/:id - Editer un projet (alias)
router.patch('/projets/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:edit'), moderationController_js_1.editProjet);
// PATCH /api/admin/projets/:id/status - Changer statut projet (alias)
router.patch('/projets/:id/status', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:edit'), moderationController_js_1.changeProjetStatus);
// ============ CONVERSATIONS ============
// GET /api/admin/conversations - Lister les conversations
router.get('/conversations', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.listConversations);
// GET /api/admin/conversations/:id/messages - Messages d'une conversation
router.get('/conversations/:id/messages', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), moderationController_js_1.getConversationMessages);
// ============ LIVES ============
// GET /api/admin/lives - Lister les lives
router.get('/lives', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:hide'), moderationController_js_1.listLives);
// ============ EVENEMENTS ============
// GET /api/admin/evenements - Lister les événements
router.get('/evenements', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('content:hide'), moderationController_js_1.listEvenements);
// ============ SECURITE ============
// GET /api/admin/security/dashboard - Tableau de bord securite
router.get('/security/dashboard', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), securityController_js_1.getSecurityDashboard);
// GET /api/admin/security/events - Liste des evenements avec filtres
router.get('/security/events', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), securityController_js_1.getSecurityEvents);
// GET /api/admin/security/events/:id - Detail d'un evenement
router.get('/security/events/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), securityController_js_1.getSecurityEventDetail);
// GET /api/admin/security/investigate/:ip - Enquete approfondie sur une IP
router.get('/security/investigate/:ip', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), securityController_js_1.investigateIP);
// GET /api/admin/security/blocked-ips - Liste des IPs bloquees
router.get('/security/blocked-ips', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('audit:view'), securityController_js_1.getBlockedIPs);
// POST /api/admin/security/block-ip - Bloquer une IP
router.post('/security/block-ip', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), securityController_js_1.blockIP);
// DELETE /api/admin/security/unblock-ip/:id - Debloquer une IP
router.delete('/security/unblock-ip/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), securityController_js_1.unblockIP);
// GET /api/admin/security/health - Analyse sante backend temps reel
router.get('/security/health', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), securityController_js_1.getBackendHealth);
// --- Appareils bannis (anti IP dynamique) ---
// GET /api/admin/security/banned-devices - Liste des appareils bannis
router.get('/security/banned-devices', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), securityController_js_1.getBannedDevices);
// POST /api/admin/security/ban-device - Bannir un appareil
router.post('/security/ban-device', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), securityController_js_1.banDevice);
// DELETE /api/admin/security/unban-device/:id - Debannir un appareil
router.delete('/security/unban-device/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), securityController_js_1.unbanDevice);
// DELETE /api/admin/security/purge - Purger toutes les donnees de securite (super_admin uniquement)
router.delete('/security/purge', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('super_admin'), securityController_js_1.purgeSecurityData);
// GET /api/admin/security/purge-history - Historique des purges
router.get('/security/purge-history', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), securityController_js_1.getPurgeHistory);
// GET /api/admin/security/purge-history/:id - Detail d'une purge archivee
router.get('/security/purge-history/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), securityController_js_1.getPurgeDetail);
// DELETE /api/admin/security/purge-history/:id - Supprimer definitivement une archive
router.delete('/security/purge-history/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('super_admin'), securityController_js_1.deletePurge);
// ============ GAMIFICATION ============
// GET /api/admin/gamification/:userId - Donnees gamification d'un utilisateur (lecture seule)
router.get('/gamification/:userId', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('users:view'), gamificationController_js_1.getAdminGamification);
// ============ NOTIFICATIONS BROADCAST ============
// GET /api/admin/notifications/broadcast - Historique des notifications broadcast
router.get('/notifications/broadcast', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), broadcastController_js_1.listBroadcasts);
// POST /api/admin/notifications/broadcast - Envoyer une notification broadcast
router.post('/notifications/broadcast', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requireMinRole)('admin_modo'), broadcastController_js_1.sendBroadcast);
// ============ TICKETS SUPPORT ============
// GET /api/admin/tickets/stats - Stats des tickets (dashboard)
router.get('/tickets/stats', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('tickets:view'), supportTicketController_js_1.getTicketStats);
// GET /api/admin/tickets - Lister tous les tickets
router.get('/tickets', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('tickets:view'), supportTicketController_js_1.listerTicketsAdmin);
// GET /api/admin/tickets/:id - Detail d'un ticket
router.get('/tickets/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('tickets:view'), supportTicketController_js_1.getTicketAdmin);
// POST /api/admin/tickets/:id/respond - Repondre a un ticket
router.post('/tickets/:id/respond', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('tickets:respond'), supportTicketController_js_1.repondreTicketAdmin);
// PATCH /api/admin/tickets/:id/status - Changer le statut d'un ticket
router.patch('/tickets/:id/status', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('tickets:respond'), supportTicketController_js_1.changerStatutTicket);
// POST /api/admin/tickets/:id/assign - Assigner un ticket
router.post('/tickets/:id/assign', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('tickets:respond'), supportTicketController_js_1.assignerTicket);
// ============ MARKETPLACE ============
// GET /api/admin/marketplace/commandes - Lister toutes les commandes
router.get('/marketplace/commandes', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('marketplace:view'), index_js_1.listerCommandes);
// GET /api/admin/marketplace/commandes/stats - Stats des commandes
router.get('/marketplace/commandes/stats', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('marketplace:view'), index_js_1.getCommandesStats);
// GET /api/admin/marketplace/commandes/:id - Detail d'une commande
router.get('/marketplace/commandes/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('marketplace:view'), index_js_1.getCommandeDetail);
// GET /api/admin/marketplace/services - Lister tous les services
router.get('/marketplace/services', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('marketplace:view'), index_js_1.listerServices);
// GET /api/admin/marketplace/services/:id - Detail d'un service
router.get('/marketplace/services/:id', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('marketplace:view'), index_js_1.getServiceDetail);
// GET /api/admin/marketplace/litiges - Lister les commandes en litige
router.get('/marketplace/litiges', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('marketplace:view'), index_js_1.listerLitiges);
// POST /api/admin/marketplace/litiges/:id/resoudre - Resoudre un litige
router.post('/marketplace/litiges/:id/resoudre', verifierJwt_js_1.verifierJwt, (0, checkUserStatus_js_1.requirePermission)('marketplace:manage_disputes'), index_js_1.resoudreLitige);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map