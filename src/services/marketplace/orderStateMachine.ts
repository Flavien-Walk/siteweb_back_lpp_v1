/**
 * State machine pour les commandes marketplace.
 * Centralise les transitions, validations et autorisations.
 */
import mongoose from 'mongoose';
import { OrderStatut, TRANSITIONS_AUTORISEES, QUI_PEUT_TRANSITIONNER } from '../../models/MarketplaceOrder.js';

export interface TransitionResult {
  ok: boolean;
  message: string;
}

/**
 * Verifie si une transition est valide
 */
export function isTransitionValide(de: OrderStatut, vers: OrderStatut): boolean {
  const transitions = TRANSITIONS_AUTORISEES[de];
  return !!transitions && transitions.includes(vers);
}

/**
 * Verifie si un utilisateur est autorise a effectuer une transition
 */
export function isAutorise(
  de: OrderStatut,
  vers: OrderStatut,
  userId: mongoose.Types.ObjectId,
  acheteurId: mongoose.Types.ObjectId,
  vendeurId: mongoose.Types.ObjectId,
): TransitionResult {
  // 1. Transition valide ?
  if (!isTransitionValide(de, vers)) {
    return { ok: false, message: `Transition impossible: ${de} → ${vers}` };
  }

  // 2. Qui peut ?
  const cle = `${de}->${vers}`;
  const regle = QUI_PEUT_TRANSITIONNER[cle];

  if (!regle) {
    return { ok: false, message: `Regle de transition non definie pour ${cle}` };
  }

  const isAcheteur = userId.equals(acheteurId);
  const isVendeur = userId.equals(vendeurId);

  switch (regle) {
    case 'acheteur':
      if (!isAcheteur) return { ok: false, message: "Seul l'acheteur peut effectuer cette action" };
      break;
    case 'vendeur':
      if (!isVendeur) return { ok: false, message: 'Seul le vendeur peut effectuer cette action' };
      break;
    case 'les_deux':
      if (!isAcheteur && !isVendeur) return { ok: false, message: "Vous n'etes pas partie prenante de cette commande" };
      break;
    default:
      return { ok: false, message: 'Regle inconnue' };
  }

  return { ok: true, message: 'OK' };
}

/**
 * Validations metier supplementaires selon la transition
 */
export function validationsMetier(
  de: OrderStatut,
  vers: OrderStatut,
  commande: { deliverables: any[] },
): TransitionResult {
  // Livrer requiert au moins 1 deliverable
  if (de === 'en_cours' && vers === 'livre') {
    if (!commande.deliverables || commande.deliverables.length === 0) {
      return { ok: false, message: 'Vous devez ajouter au moins un livrable avant de marquer comme livre' };
    }
  }

  return { ok: true, message: 'OK' };
}
