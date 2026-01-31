import { Router } from 'express';
import {
  getPublications,
  getPublication,
  creerPublication,
  modifierPublication,
  supprimerPublication,
  toggleLikePublication,
  getCommentaires,
  ajouterCommentaire,
  modifierCommentaire,
  supprimerCommentaire,
  toggleLikeCommentaire,
} from '../controllers/publicationController.js';
import { verifierJwt, chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';

const router = Router();

/**
 * GET /api/publications
 * Liste des publications (accessible sans auth)
 */
router.get('/', chargerUtilisateurOptionnel, getPublications);

/**
 * GET /api/publications/:id
 * Détail d'une publication
 */
router.get('/:id', chargerUtilisateurOptionnel, getPublication);

/**
 * POST /api/publications
 * Créer une publication (auth requise)
 */
router.post('/', verifierJwt, creerPublication);

/**
 * PATCH /api/publications/:id
 * Modifier une publication (auth requise, auteur uniquement)
 */
router.patch('/:id', verifierJwt, modifierPublication);

/**
 * DELETE /api/publications/:id
 * Supprimer une publication (auth requise, auteur uniquement)
 */
router.delete('/:id', verifierJwt, supprimerPublication);

/**
 * POST /api/publications/:id/like
 * Liker/unliker une publication
 */
router.post('/:id/like', verifierJwt, toggleLikePublication);

/**
 * GET /api/publications/:id/commentaires
 * Liste des commentaires d'une publication
 */
router.get('/:id/commentaires', chargerUtilisateurOptionnel, getCommentaires);

/**
 * POST /api/publications/:id/commentaires
 * Ajouter un commentaire
 */
router.post('/:id/commentaires', verifierJwt, ajouterCommentaire);

/**
 * PATCH /api/publications/:pubId/commentaires/:comId
 * Modifier un commentaire (auteur uniquement)
 */
router.patch('/:pubId/commentaires/:comId', verifierJwt, modifierCommentaire);

/**
 * DELETE /api/publications/:pubId/commentaires/:comId
 * Supprimer un commentaire
 */
router.delete('/:pubId/commentaires/:comId', verifierJwt, supprimerCommentaire);

/**
 * POST /api/publications/:pubId/commentaires/:comId/like
 * Liker/unliker un commentaire
 */
router.post('/:pubId/commentaires/:comId/like', verifierJwt, toggleLikeCommentaire);

export default router;
