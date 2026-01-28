import { Router } from 'express';
import {
  modifierProfil,
  changerMotDePasse,
  supprimerCompte,
  getAvatarsDefaut,
  modifierAvatar,
} from '../controllers/profilController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';

const router = Router();

/**
 * GET /api/profil/avatars
 * Liste des avatars par défaut (accessible sans auth)
 */
router.get('/avatars', getAvatarsDefaut);

// Routes protégées
router.use(verifierJwt);

/**
 * PATCH /api/profil
 * Modifier le profil
 */
router.patch('/', modifierProfil);

/**
 * PATCH /api/profil/mot-de-passe
 * Changer le mot de passe
 */
router.patch('/mot-de-passe', changerMotDePasse);

/**
 * PATCH /api/profil/avatar
 * Modifier l'avatar
 */
router.patch('/avatar', modifierAvatar);

/**
 * DELETE /api/profil
 * Supprimer le compte
 */
router.delete('/', supprimerCompte);

export default router;
