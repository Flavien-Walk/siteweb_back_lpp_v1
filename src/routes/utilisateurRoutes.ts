import { Router } from 'express';
import {
  rechercherUtilisateurs,
  getUtilisateur,
  envoyerDemandeAmi,
  annulerDemandeAmi,
  accepterDemandeAmi,
  refuserDemandeAmi,
  supprimerAmi,
  getDemandesAmis,
  getMesAmis,
} from '../controllers/utilisateurController.js';
import { verifierJwt, chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';

const router = Router();

// ============ ROUTES PUBLIQUES / OPTIONNELLES ============

/**
 * GET /api/utilisateurs/recherche
 * Rechercher des utilisateurs par nom/prénom
 * Query params: q (recherche), limit (max 20)
 */
router.get('/recherche', chargerUtilisateurOptionnel, rechercherUtilisateurs);

// ============ ROUTES PROTÉGÉES (AMIS) ============

/**
 * GET /api/utilisateurs/demandes-amis
 * Récupérer mes demandes d'amis reçues
 */
router.get('/demandes-amis', verifierJwt, getDemandesAmis);

/**
 * GET /api/utilisateurs/mes-amis
 * Récupérer ma liste d'amis
 */
router.get('/mes-amis', verifierJwt, getMesAmis);

/**
 * POST /api/utilisateurs/:id/demande-ami
 * Envoyer une demande d'ami
 */
router.post('/:id/demande-ami', verifierJwt, envoyerDemandeAmi);

/**
 * DELETE /api/utilisateurs/:id/demande-ami
 * Annuler une demande d'ami envoyée
 */
router.delete('/:id/demande-ami', verifierJwt, annulerDemandeAmi);

/**
 * POST /api/utilisateurs/:id/accepter-ami
 * Accepter une demande d'ami
 */
router.post('/:id/accepter-ami', verifierJwt, accepterDemandeAmi);

/**
 * POST /api/utilisateurs/:id/refuser-ami
 * Refuser une demande d'ami
 */
router.post('/:id/refuser-ami', verifierJwt, refuserDemandeAmi);

/**
 * DELETE /api/utilisateurs/:id/ami
 * Supprimer un ami
 */
router.delete('/:id/ami', verifierJwt, supprimerAmi);

// ============ ROUTES AVEC PARAMÈTRE ID ============

/**
 * GET /api/utilisateurs/:id
 * Profil public d'un utilisateur
 * Inclut le statut d'amitié si authentifié
 */
router.get('/:id', chargerUtilisateurOptionnel, getUtilisateur);

export default router;
