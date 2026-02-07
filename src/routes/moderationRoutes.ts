import { Router } from 'express';
import { verifierJwt } from '../middlewares/verifierJwt.js';
import {
  requirePermission,
  requireMinRole,
  requireAnyPermission,
} from '../middlewares/checkUserStatus.js';
import {
  warnUser,
  removeWarning,
  suspendUser,
  unsuspendUser,
  banUser,
  unbanUser,
  changeUserRole,
  hidePublication,
  unhidePublication,
  deletePublication,
  deleteCommentaire,
  getUserModerationDetails,
  listUsers,
  // Stories moderation
  getStoriesModeration,
  getStoryModeration,
  hideStory,
  unhideStory,
  deleteStoryModeration,
  // Projets moderation
  hideProjet,
  unhideProjet,
  deleteProjet,
} from '../controllers/moderationController.js';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(verifierJwt);

// ============ ROUTES UTILISATEURS ============

/**
 * GET /api/moderation/users
 * Lister les utilisateurs avec filtres
 * Permission: users:view
 */
router.get('/users', requirePermission('users:view'), listUsers);

/**
 * GET /api/moderation/users/:id
 * Détails de modération d'un utilisateur
 * Permission: users:view
 */
router.get('/users/:id', requirePermission('users:view'), getUserModerationDetails);

/**
 * POST /api/moderation/users/:id/warn
 * Avertir un utilisateur
 * Permission: users:warn
 */
router.post('/users/:id/warn', requirePermission('users:warn'), warnUser);

/**
 * DELETE /api/moderation/users/:id/warnings/:warningId
 * Retirer un avertissement
 * Permission: users:warn
 */
router.delete('/users/:id/warnings/:warningId', requirePermission('users:warn'), removeWarning);

/**
 * POST /api/moderation/users/:id/suspend
 * Suspendre temporairement un utilisateur
 * Permission: users:suspend
 */
router.post('/users/:id/suspend', requirePermission('users:suspend'), suspendUser);

/**
 * POST /api/moderation/users/:id/unsuspend
 * Lever une suspension
 * Permission: users:suspend
 */
router.post('/users/:id/unsuspend', requirePermission('users:suspend'), unsuspendUser);

/**
 * POST /api/moderation/users/:id/ban
 * Bannir définitivement un utilisateur
 * Permission: users:ban
 */
router.post('/users/:id/ban', requirePermission('users:ban'), banUser);

/**
 * POST /api/moderation/users/:id/unban
 * Débannir un utilisateur
 * Permission: users:unban
 */
router.post('/users/:id/unban', requirePermission('users:unban'), unbanUser);

/**
 * PATCH /api/moderation/users/:id/role
 * Changer le rôle d'un utilisateur
 * Permission: users:edit_roles (super_admin uniquement)
 */
router.patch('/users/:id/role', requirePermission('users:edit_roles'), changeUserRole);

// ============ ROUTES CONTENU ============

/**
 * POST /api/moderation/content/publication/:id/hide
 * Masquer une publication
 * Permission: content:hide
 */
router.post('/content/publication/:id/hide', requirePermission('content:hide'), hidePublication);

/**
 * POST /api/moderation/content/publication/:id/unhide
 * Réafficher une publication masquée
 * Permission: content:hide
 */
router.post('/content/publication/:id/unhide', requirePermission('content:hide'), unhidePublication);

/**
 * DELETE /api/moderation/content/publication/:id
 * Supprimer définitivement une publication
 * Permission: content:delete
 */
router.delete('/content/publication/:id', requirePermission('content:delete'), deletePublication);

/**
 * DELETE /api/moderation/content/commentaire/:id
 * Supprimer un commentaire
 * Permission: content:delete
 */
router.delete('/content/commentaire/:id', requirePermission('content:delete'), deleteCommentaire);

// ============ ROUTES STORIES ============

/**
 * GET /api/moderation/stories
 * Lister les stories pour la modération
 * Permission: content:hide
 */
router.get('/stories', requirePermission('content:hide'), getStoriesModeration);

/**
 * GET /api/moderation/stories/:id
 * Détails d'une story
 * Permission: content:hide
 */
router.get('/stories/:id', requirePermission('content:hide'), getStoryModeration);

/**
 * POST /api/moderation/stories/:id/hide
 * Masquer une story
 * Permission: content:hide
 */
router.post('/stories/:id/hide', requirePermission('content:hide'), hideStory);

/**
 * POST /api/moderation/stories/:id/unhide
 * Réafficher une story masquée
 * Permission: content:hide
 */
router.post('/stories/:id/unhide', requirePermission('content:hide'), unhideStory);

/**
 * DELETE /api/moderation/stories/:id
 * Supprimer définitivement une story
 * Permission: content:delete
 */
router.delete('/stories/:id', requirePermission('content:delete'), deleteStoryModeration);

// ============ ROUTES PROJETS ============

/**
 * POST /api/moderation/content/projet/:id/hide
 * Masquer un projet
 * Permission: content:hide
 */
router.post('/content/projet/:id/hide', requirePermission('content:hide'), hideProjet);

/**
 * POST /api/moderation/content/projet/:id/unhide
 * Réafficher un projet masqué
 * Permission: content:hide
 */
router.post('/content/projet/:id/unhide', requirePermission('content:hide'), unhideProjet);

/**
 * DELETE /api/moderation/content/projet/:id
 * Supprimer définitivement un projet
 * Permission: content:delete
 */
router.delete('/content/projet/:id', requirePermission('content:delete'), deleteProjet);

export default router;
