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
  getAmisUtilisateur,
  getProjetsSuivisUtilisateur,
} from '../controllers/utilisateurController.js';
import { verifierJwt, chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';

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
router.get('/demandes-amis', verifierJwt, checkUserStatus, getDemandesAmis);

/**
 * GET /api/utilisateurs/mes-amis
 * Récupérer ma liste d'amis
 */
router.get('/mes-amis', verifierJwt, checkUserStatus, getMesAmis);

/**
 * POST /api/utilisateurs/:id/demande-ami
 * Envoyer une demande d'ami
 */
router.post('/:id/demande-ami', verifierJwt, checkUserStatus, envoyerDemandeAmi);

/**
 * DELETE /api/utilisateurs/:id/demande-ami
 * Annuler une demande d'ami envoyée
 */
router.delete('/:id/demande-ami', verifierJwt, checkUserStatus, annulerDemandeAmi);

/**
 * POST /api/utilisateurs/:id/accepter-ami
 * Accepter une demande d'ami
 */
router.post('/:id/accepter-ami', verifierJwt, checkUserStatus, accepterDemandeAmi);

/**
 * POST /api/utilisateurs/:id/refuser-ami
 * Refuser une demande d'ami
 */
router.post('/:id/refuser-ami', verifierJwt, checkUserStatus, refuserDemandeAmi);

/**
 * DELETE /api/utilisateurs/:id/ami
 * Supprimer un ami
 */
router.delete('/:id/ami', verifierJwt, checkUserStatus, supprimerAmi);

// ============ ROUTES AVEC PARAMÈTRE ID ============

/**
 * GET /api/utilisateurs/:id/amis
 * Récupérer la liste d'amis d'un utilisateur
 * Accessible si ami ou soi-même
 */
router.get('/:id/amis', verifierJwt, checkUserStatus, getAmisUtilisateur);

/**
 * GET /api/utilisateurs/:id/projets-suivis
 * Récupérer les projets suivis par un utilisateur
 */
router.get('/:id/projets-suivis', verifierJwt, checkUserStatus, getProjetsSuivisUtilisateur);

/**
 * GET /api/utilisateurs/:id
 * Profil public d'un utilisateur
 * Inclut le statut d'amitié si authentifié
 */
router.get('/:id', chargerUtilisateurOptionnel, getUtilisateur);

export default router;
