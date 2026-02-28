"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifierJwt_js_1 = require("../middlewares/verifierJwt.js");
const checkUserStatus_js_1 = require("../middlewares/checkUserStatus.js");
const checkEntrepreneur_js_1 = require("../middlewares/checkEntrepreneur.js");
const ctrl = __importStar(require("../controllers/marketplace/index.js"));
const router = (0, express_1.Router)();
// ============================================
// SERVICES
// ============================================
router.get('/mes-services', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.getMesServices);
router.post('/services', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.creerService);
router.patch('/services/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.modifierService);
router.delete('/services/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.archiverService);
router.get('/services', verifierJwt_js_1.chargerUtilisateurOptionnel, ctrl.listerServices);
router.get('/services/:id', verifierJwt_js_1.chargerUtilisateurOptionnel, ctrl.getService);
// ============================================
// COMMANDES — CRUD
// ============================================
router.post('/orders', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.creerCommande);
router.get('/orders/achats', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.getMesAchats);
router.get('/orders/ventes', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.getMesVentes);
router.get('/orders/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.getOrderDetail);
// ============================================
// COMMANDES — ACTIONS WORKFLOW
// ============================================
/** Vendeur : accepter / refuser */
router.post('/orders/:id/accept', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.accepterCommande);
router.post('/orders/:id/refuse', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.refuserCommande);
/** Vendeur : avancement + livraison */
router.post('/orders/:id/progress', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.ajouterProgression);
router.post('/orders/:id/deliver', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.livrerCommande);
/** Acheteur : valider / revision */
router.post('/orders/:id/complete', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.validerCommande);
router.post('/orders/:id/revision', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.demanderRevision);
/** Vendeur : prolonger deadline */
router.post('/orders/:id/extend-deadline', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.prolongerDeadline);
/** Les deux : annuler / litige */
router.post('/orders/:id/cancel', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.annulerCommande);
router.post('/orders/:id/dispute', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.ouvrirLitige);
// ============================================
// MEDIATION (litige en cours)
// ============================================
/** Recuperer mes messages de mediation */
router.get('/orders/:id/mediation', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.getMesMediationMessages);
/** Envoyer un message de mediation */
router.post('/orders/:id/mediation', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.envoyerMediationMessage);
// ============================================
// AVIS
// ============================================
router.post('/reviews', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.creerReview);
router.get('/reviews/:serviceId', ctrl.getReviewsService);
router.patch('/reviews/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.modifierReview);
router.delete('/reviews/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.supprimerReview);
// ============================================
// TRENDING + EVENTS
// ============================================
router.get('/trending', ctrl.getTrending);
router.post('/events/view', verifierJwt_js_1.chargerUtilisateurOptionnel, ctrl.trackView);
exports.default = router;
//# sourceMappingURL=marketplaceRoutes.js.map