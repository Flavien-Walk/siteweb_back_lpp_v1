/**
 * State machine pour les commandes marketplace.
 * Centralise les transitions, validations et autorisations.
 */
import mongoose from 'mongoose';
import { OrderStatut } from '../../models/MarketplaceOrder.js';
export interface TransitionResult {
    ok: boolean;
    message: string;
}
/**
 * Verifie si une transition est valide
 */
export declare function isTransitionValide(de: OrderStatut, vers: OrderStatut): boolean;
/**
 * Verifie si un utilisateur est autorise a effectuer une transition
 */
export declare function isAutorise(de: OrderStatut, vers: OrderStatut, userId: mongoose.Types.ObjectId, acheteurId: mongoose.Types.ObjectId, vendeurId: mongoose.Types.ObjectId): TransitionResult;
/**
 * Validations metier supplementaires selon la transition
 */
export declare function validationsMetier(de: OrderStatut, vers: OrderStatut, commande: {
    deliverables: any[];
}): TransitionResult;
//# sourceMappingURL=orderStateMachine.d.ts.map