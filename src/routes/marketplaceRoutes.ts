import { Router } from 'express';
import { verifierJwt, chargerUtilisateurOptionnel } from '../middlewares/verifierJwt.js';
import { checkUserStatus } from '../middlewares/checkUserStatus.js';
import { checkEntrepreneur } from '../middlewares/checkEntrepreneur.js';
import * as ctrl from '../controllers/marketplace/index.js';

const router = Router();

// ============================================
// SERVICES
// ============================================

router.get('/mes-services', verifierJwt, checkUserStatus, checkEntrepreneur, ctrl.getMesServices);
router.post('/services', verifierJwt, checkUserStatus, checkEntrepreneur, ctrl.creerService);
router.patch('/services/:id', verifierJwt, checkUserStatus, checkEntrepreneur, ctrl.modifierService);
router.delete('/services/:id', verifierJwt, checkUserStatus, checkEntrepreneur, ctrl.archiverService);
router.get('/services', chargerUtilisateurOptionnel, ctrl.listerServices);
router.get('/services/:id', chargerUtilisateurOptionnel, ctrl.getService);

// ============================================
// COMMANDES — CRUD
// ============================================

router.post('/orders', verifierJwt, checkUserStatus, ctrl.creerCommande);
router.get('/orders/achats', verifierJwt, checkUserStatus, ctrl.getMesAchats);
router.get('/orders/ventes', verifierJwt, checkUserStatus, checkEntrepreneur, ctrl.getMesVentes);
router.get('/orders/:id', verifierJwt, checkUserStatus, ctrl.getOrderDetail);

// ============================================
// COMMANDES — ACTIONS WORKFLOW
// ============================================

/** Vendeur : accepter / refuser */
router.post('/orders/:id/accept', verifierJwt, checkUserStatus, ctrl.accepterCommande);
router.post('/orders/:id/refuse', verifierJwt, checkUserStatus, ctrl.refuserCommande);

/** Vendeur : avancement + livraison */
router.post('/orders/:id/progress', verifierJwt, checkUserStatus, ctrl.ajouterProgression);
router.post('/orders/:id/deliver', verifierJwt, checkUserStatus, ctrl.livrerCommande);

/** Acheteur : valider / revision */
router.post('/orders/:id/complete', verifierJwt, checkUserStatus, ctrl.validerCommande);
router.post('/orders/:id/revision', verifierJwt, checkUserStatus, ctrl.demanderRevision);

/** Vendeur : prolonger deadline */
router.post('/orders/:id/extend-deadline', verifierJwt, checkUserStatus, ctrl.prolongerDeadline);

/** Les deux : annuler / litige */
router.post('/orders/:id/cancel', verifierJwt, checkUserStatus, ctrl.annulerCommande);
router.post('/orders/:id/dispute', verifierJwt, checkUserStatus, ctrl.ouvrirLitige);

// ============================================
// MEDIATION (litige en cours)
// ============================================

/** Recuperer mes messages de mediation */
router.get('/orders/:id/mediation', verifierJwt, checkUserStatus, ctrl.getMesMediationMessages);

/** Envoyer un message de mediation */
router.post('/orders/:id/mediation', verifierJwt, checkUserStatus, ctrl.envoyerMediationMessage);

// ============================================
// AVIS
// ============================================

router.post('/reviews', verifierJwt, checkUserStatus, ctrl.creerReview);
router.get('/reviews/:serviceId', ctrl.getReviewsService);
router.patch('/reviews/:id', verifierJwt, checkUserStatus, ctrl.modifierReview);
router.delete('/reviews/:id', verifierJwt, checkUserStatus, ctrl.supprimerReview);

// ============================================
// TRENDING + EVENTS
// ============================================

router.get('/trending', ctrl.getTrending);
router.post('/events/view', chargerUtilisateurOptionnel, ctrl.trackView);

export default router;
