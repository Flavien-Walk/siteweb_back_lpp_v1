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
/**
 * GET /api/marketplace/mes-services
 * Liste des services de l'entrepreneur connecte
 * (AVANT la route :id pour eviter conflit)
 */
router.get('/mes-services', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.getMesServices);
/**
 * POST /api/marketplace/services
 * Creer un service (entrepreneur uniquement)
 */
router.post('/services', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.creerService);
/**
 * PATCH /api/marketplace/services/:id
 * Modifier un service (proprietaire uniquement)
 */
router.patch('/services/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.modifierService);
/**
 * DELETE /api/marketplace/services/:id
 * Archiver un service (soft delete, proprietaire uniquement)
 */
router.delete('/services/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.archiverService);
/**
 * GET /api/marketplace/services
 * Lister les services actifs (public)
 */
router.get('/services', verifierJwt_js_1.chargerUtilisateurOptionnel, ctrl.listerServices);
/**
 * GET /api/marketplace/services/:id
 * Details d'un service (public)
 */
router.get('/services/:id', verifierJwt_js_1.chargerUtilisateurOptionnel, ctrl.getService);
// ============================================
// COMMANDES
// ============================================
/**
 * POST /api/marketplace/orders
 * Creer une commande
 */
router.post('/orders', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.creerCommande);
/**
 * GET /api/marketplace/orders/achats
 * Mes achats (acheteur)
 */
router.get('/orders/achats', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.getMesAchats);
/**
 * GET /api/marketplace/orders/ventes
 * Mes ventes (vendeur/entrepreneur)
 */
router.get('/orders/ventes', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, checkEntrepreneur_js_1.checkEntrepreneur, ctrl.getMesVentes);
/**
 * PATCH /api/marketplace/orders/:id/statut
 * Changer le statut d'une commande
 */
router.patch('/orders/:id/statut', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.changerStatutCommande);
// ============================================
// AVIS
// ============================================
/**
 * POST /api/marketplace/reviews
 * Laisser un avis (acheteur, commande terminee)
 */
router.post('/reviews', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.creerReview);
/**
 * GET /api/marketplace/reviews/:serviceId
 * Avis d'un service (public)
 */
router.get('/reviews/:serviceId', ctrl.getReviewsService);
/**
 * PATCH /api/marketplace/reviews/:id
 * Modifier un avis (auteur, < 7 jours)
 */
router.patch('/reviews/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.modifierReview);
/**
 * DELETE /api/marketplace/reviews/:id
 * Supprimer un avis (auteur)
 */
router.delete('/reviews/:id', verifierJwt_js_1.verifierJwt, checkUserStatus_js_1.checkUserStatus, ctrl.supprimerReview);
// ============================================
// TRENDING + EVENTS
// ============================================
/**
 * GET /api/marketplace/trending
 * Services tendances
 */
router.get('/trending', ctrl.getTrending);
/**
 * POST /api/marketplace/events/view
 * Tracker une vue (public, debounce 1h)
 */
router.post('/events/view', verifierJwt_js_1.chargerUtilisateurOptionnel, ctrl.trackView);
exports.default = router;
//# sourceMappingURL=marketplaceRoutes.js.map