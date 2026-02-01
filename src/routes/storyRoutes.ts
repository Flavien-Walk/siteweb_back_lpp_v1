import { Router } from 'express';
import {
  creerStory,
  getStoriesActives,
  getMesStories,
  getStoriesUtilisateur,
  getStory,
  supprimerStory,
  marquerVue,
  getStoryViewers,
} from '../controllers/storyController.js';
import { verifierJwt, chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';

const router = Router();

/**
 * GET /api/stories
 * Liste des stories actives (feed)
 * Auth optionnelle pour identifier l'utilisateur connecté
 */
router.get('/', chargerUtilisateurOptionnel, getStoriesActives);

/**
 * GET /api/stories/mes-stories
 * Mes stories actives
 */
router.get('/mes-stories', verifierJwt, getMesStories);

/**
 * GET /api/stories/utilisateur/:id
 * Stories actives d'un utilisateur spécifique
 */
router.get('/utilisateur/:id', chargerUtilisateurOptionnel, getStoriesUtilisateur);

/**
 * POST /api/stories/:id/seen
 * Marquer une story comme vue (auth requise)
 */
router.post('/:id/seen', verifierJwt, marquerVue);

/**
 * GET /api/stories/:id/viewers
 * Liste des utilisateurs ayant vu la story (owner uniquement)
 */
router.get('/:id/viewers', verifierJwt, getStoryViewers);

/**
 * GET /api/stories/:id
 * Détail d'une story
 */
router.get('/:id', chargerUtilisateurOptionnel, getStory);

/**
 * POST /api/stories
 * Créer une story (auth requise)
 */
router.post('/', verifierJwt, creerStory);

/**
 * DELETE /api/stories/:id
 * Supprimer une story (auth requise, auteur uniquement)
 */
router.delete('/:id', verifierJwt, supprimerStory);

export default router;
