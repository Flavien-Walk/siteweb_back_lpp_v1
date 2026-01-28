import { Router } from 'express';
import {
  rechercherUtilisateurs,
  getUtilisateur,
} from '../controllers/utilisateurController.js';
import { chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';

const router = Router();

/**
 * GET /api/utilisateurs/recherche
 * Rechercher des utilisateurs par nom/prénom
 * Query params: q (recherche), limit (max 20)
 */
router.get('/recherche', chargerUtilisateurOptionnel, rechercherUtilisateurs);

/**
 * GET /api/utilisateurs/:id
 * Profil public d'un utilisateur
 */
router.get('/:id', getUtilisateur);

export default router;
