import { Router } from 'express';
import {
  modifierProfil,
  changerMotDePasse,
  supprimerCompte,
} from '../controllers/profilController.js';
import { verifierJwt } from '../middlewares/verifierJwt.js';

const router = Router();

// Toutes les routes nécessitent l'authentification
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
 * DELETE /api/profil
 * Supprimer le compte
 */
router.delete('/', supprimerCompte);

export default router;
