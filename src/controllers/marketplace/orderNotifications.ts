/**
 * Notifications commandes marketplace
 * Cree des notifications in-app + push socket pour chaque transition de commande
 */
import mongoose from 'mongoose';
import Notification, { TypeNotification } from '../../models/Notification.js';
import Utilisateur from '../../models/Utilisateur.js';
import { emitNewNotification } from '../../socket/emitters.js';
import {
  envoyerEmailNouvelleCommande,
  envoyerEmailCommandeAcceptee,
  envoyerEmailLivraison,
  envoyerEmailCommandeTerminee,
} from '../../services/emailService.js';

/** Recupere l'email + prenom d'un user (pour les emails transactionnels) */
async function getUserEmail(userId: string): Promise<{ email: string; prenom: string } | null> {
  try {
    const u = await Utilisateur.findById(userId).select('email prenom').lean();
    if (!u?.email) return null;
    return { email: u.email, prenom: u.prenom };
  } catch { return null; }
}

interface NotifCommandeParams {
  commandeId: string;
  serviceNom: string;
  // Qui declenche l'action
  acteur: { _id: string; prenom: string; nom: string; avatar?: string };
  // Qui recoit la notif
  destinataireId: string;
}

/**
 * Cree une notification commande + l'emet via socket
 */
async function creerNotifCommande(
  type: TypeNotification,
  titre: string,
  message: string,
  params: NotifCommandeParams,
) {
  try {
    const notif = await Notification.create({
      destinataire: params.destinataireId,
      type,
      titre,
      message,
      data: {
        userId: params.acteur._id,
        userNom: params.acteur.nom,
        userPrenom: params.acteur.prenom,
        userAvatar: params.acteur.avatar,
        commandeId: params.commandeId,
        serviceNom: params.serviceNom,
      },
    });

    // Push temps reel
    emitNewNotification(params.destinataireId, {
      _id: notif._id.toString(),
      type: notif.type,
      titre: notif.titre,
      message: notif.message,
      lu: false,
      dateCreation: notif.dateCreation.toISOString(),
    });
  } catch (err) {
    console.error('[orderNotifications] Erreur creation notif:', err);
  }
}

// ============ NOTIFICATIONS PAR EVENEMENT ============

/**
 * Nouvelle commande recue (→ vendeur)
 */
export async function notifierNouvelleCommande(
  commandeId: string,
  serviceNom: string,
  acheteur: { _id: string; prenom: string; nom: string; avatar?: string },
  vendeurId: string,
  montant?: string,
) {
  await creerNotifCommande('commande_nouvelle',
    'Nouvelle commande',
    `${acheteur.prenom} a commande "${serviceNom}"`,
    { commandeId, serviceNom, acteur: acheteur, destinataireId: vendeurId },
  );
  // Email transactionnel
  const vendeur = await getUserEmail(vendeurId);
  if (vendeur) {
    envoyerEmailNouvelleCommande(vendeur.email, vendeur.prenom, serviceNom, acheteur.prenom, montant || 'Sur devis');
  }
}

/**
 * Commande acceptee (→ acheteur)
 */
export async function notifierCommandeAcceptee(
  commandeId: string,
  serviceNom: string,
  vendeur: { _id: string; prenom: string; nom: string; avatar?: string },
  acheteurId: string,
) {
  await creerNotifCommande('commande_acceptee',
    'Commande acceptee',
    `${vendeur.prenom} a accepte votre commande "${serviceNom}"`,
    { commandeId, serviceNom, acteur: vendeur, destinataireId: acheteurId },
  );
  const acheteur = await getUserEmail(acheteurId);
  if (acheteur) {
    envoyerEmailCommandeAcceptee(acheteur.email, acheteur.prenom, serviceNom, vendeur.prenom);
  }
}

/**
 * Commande refusee (→ acheteur)
 */
export function notifierCommandeRefusee(
  commandeId: string,
  serviceNom: string,
  vendeur: { _id: string; prenom: string; nom: string; avatar?: string },
  acheteurId: string,
) {
  return creerNotifCommande('commande_refusee',
    'Commande refusee',
    `${vendeur.prenom} a refuse votre commande "${serviceNom}"`,
    { commandeId, serviceNom, acteur: vendeur, destinataireId: acheteurId },
  );
}

/**
 * Commande livree (→ acheteur)
 */
export async function notifierCommandeLivree(
  commandeId: string,
  serviceNom: string,
  vendeur: { _id: string; prenom: string; nom: string; avatar?: string },
  acheteurId: string,
) {
  await creerNotifCommande('commande_livree',
    'Livraison recue',
    `${vendeur.prenom} a livre votre commande "${serviceNom}"`,
    { commandeId, serviceNom, acteur: vendeur, destinataireId: acheteurId },
  );
  const acheteur = await getUserEmail(acheteurId);
  if (acheteur) {
    envoyerEmailLivraison(acheteur.email, acheteur.prenom, serviceNom, vendeur.prenom);
  }
}

/**
 * Commande terminee / validee (→ vendeur)
 */
export async function notifierCommandeTerminee(
  commandeId: string,
  serviceNom: string,
  acheteur: { _id: string; prenom: string; nom: string; avatar?: string },
  vendeurId: string,
) {
  await creerNotifCommande('commande_terminee',
    'Commande terminee',
    `${acheteur.prenom} a valide la livraison de "${serviceNom}"`,
    { commandeId, serviceNom, acteur: acheteur, destinataireId: vendeurId },
  );
  const vendeur = await getUserEmail(vendeurId);
  if (vendeur) {
    envoyerEmailCommandeTerminee(vendeur.email, vendeur.prenom, serviceNom, acheteur.prenom);
  }
}

/**
 * Demande de revision (→ vendeur)
 */
export function notifierRevisionDemandee(
  commandeId: string,
  serviceNom: string,
  acheteur: { _id: string; prenom: string; nom: string; avatar?: string },
  vendeurId: string,
) {
  return creerNotifCommande('commande_revision',
    'Revision demandee',
    `${acheteur.prenom} demande une revision sur "${serviceNom}"`,
    { commandeId, serviceNom, acteur: acheteur, destinataireId: vendeurId },
  );
}

/**
 * Commande annulee (→ l'autre partie)
 */
export function notifierCommandeAnnulee(
  commandeId: string,
  serviceNom: string,
  acteur: { _id: string; prenom: string; nom: string; avatar?: string },
  destinataireId: string,
) {
  return creerNotifCommande('commande_annulee',
    'Commande annulee',
    `${acteur.prenom} a annule la commande "${serviceNom}"`,
    { commandeId, serviceNom, acteur, destinataireId },
  );
}

/**
 * Litige ouvert (→ l'autre partie)
 */
export function notifierLitige(
  commandeId: string,
  serviceNom: string,
  acteur: { _id: string; prenom: string; nom: string; avatar?: string },
  destinataireId: string,
) {
  return creerNotifCommande('commande_litige',
    'Litige ouvert',
    `${acteur.prenom} a ouvert un litige sur "${serviceNom}"`,
    { commandeId, serviceNom, acteur, destinataireId },
  );
}

/**
 * Progression ajoutee (→ acheteur)
 */
export function notifierProgressionAjoutee(
  commandeId: string,
  serviceNom: string,
  vendeur: { _id: string; prenom: string; nom: string; avatar?: string },
  acheteurId: string,
  percent: number,
) {
  return creerNotifCommande('commande_en_cours',
    'Avancement mis a jour',
    `${vendeur.prenom} a mis a jour l'avancement (${percent}%) de "${serviceNom}"`,
    { commandeId, serviceNom, acteur: vendeur, destinataireId: acheteurId },
  );
}
