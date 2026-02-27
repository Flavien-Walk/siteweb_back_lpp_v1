"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTransitionValide = isTransitionValide;
exports.isAutorise = isAutorise;
exports.validationsMetier = validationsMetier;
const MarketplaceOrder_js_1 = require("../../models/MarketplaceOrder.js");
/**
 * Verifie si une transition est valide
 */
function isTransitionValide(de, vers) {
    const transitions = MarketplaceOrder_js_1.TRANSITIONS_AUTORISEES[de];
    return !!transitions && transitions.includes(vers);
}
/**
 * Verifie si un utilisateur est autorise a effectuer une transition
 */
function isAutorise(de, vers, userId, acheteurId, vendeurId) {
    // 1. Transition valide ?
    if (!isTransitionValide(de, vers)) {
        return { ok: false, message: `Transition impossible: ${de} → ${vers}` };
    }
    // 2. Qui peut ?
    const cle = `${de}->${vers}`;
    const regle = MarketplaceOrder_js_1.QUI_PEUT_TRANSITIONNER[cle];
    if (!regle) {
        return { ok: false, message: `Regle de transition non definie pour ${cle}` };
    }
    const isAcheteur = userId.equals(acheteurId);
    const isVendeur = userId.equals(vendeurId);
    switch (regle) {
        case 'acheteur':
            if (!isAcheteur)
                return { ok: false, message: "Seul l'acheteur peut effectuer cette action" };
            break;
        case 'vendeur':
            if (!isVendeur)
                return { ok: false, message: 'Seul le vendeur peut effectuer cette action' };
            break;
        case 'les_deux':
            if (!isAcheteur && !isVendeur)
                return { ok: false, message: "Vous n'etes pas partie prenante de cette commande" };
            break;
        default:
            return { ok: false, message: 'Regle inconnue' };
    }
    return { ok: true, message: 'OK' };
}
/**
 * Validations metier supplementaires selon la transition
 */
function validationsMetier(de, vers, commande) {
    // Livrer requiert au moins 1 deliverable
    if (de === 'en_cours' && vers === 'livre') {
        if (!commande.deliverables || commande.deliverables.length === 0) {
            return { ok: false, message: 'Vous devez ajouter au moins un livrable avant de marquer comme livre' };
        }
    }
    return { ok: true, message: 'OK' };
}
//# sourceMappingURL=orderStateMachine.js.map