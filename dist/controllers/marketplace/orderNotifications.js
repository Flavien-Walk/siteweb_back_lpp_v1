"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifierNouvelleCommande = notifierNouvelleCommande;
exports.notifierCommandeAcceptee = notifierCommandeAcceptee;
exports.notifierCommandeRefusee = notifierCommandeRefusee;
exports.notifierCommandeLivree = notifierCommandeLivree;
exports.notifierCommandeTerminee = notifierCommandeTerminee;
exports.notifierRevisionDemandee = notifierRevisionDemandee;
exports.notifierCommandeAnnulee = notifierCommandeAnnulee;
exports.notifierLitige = notifierLitige;
exports.notifierProgressionAjoutee = notifierProgressionAjoutee;
const Notification_js_1 = __importDefault(require("../../models/Notification.js"));
const Utilisateur_js_1 = __importDefault(require("../../models/Utilisateur.js"));
const emitters_js_1 = require("../../socket/emitters.js");
const emailService_js_1 = require("../../services/emailService.js");
/** Recupere l'email + prenom d'un user (pour les emails transactionnels) */
async function getUserEmail(userId) {
    try {
        const u = await Utilisateur_js_1.default.findById(userId).select('email prenom').lean();
        if (!u?.email)
            return null;
        return { email: u.email, prenom: u.prenom };
    }
    catch {
        return null;
    }
}
/**
 * Cree une notification commande + l'emet via socket
 */
async function creerNotifCommande(type, titre, message, params) {
    try {
        const notif = await Notification_js_1.default.create({
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
        (0, emitters_js_1.emitNewNotification)(params.destinataireId, {
            _id: notif._id.toString(),
            type: notif.type,
            titre: notif.titre,
            message: notif.message,
            lu: false,
            dateCreation: notif.dateCreation.toISOString(),
        });
    }
    catch (err) {
        console.error('[orderNotifications] Erreur creation notif:', err);
    }
}
// ============ NOTIFICATIONS PAR EVENEMENT ============
/**
 * Nouvelle commande recue (→ vendeur)
 */
async function notifierNouvelleCommande(commandeId, serviceNom, acheteur, vendeurId, montant) {
    await creerNotifCommande('commande_nouvelle', 'Nouvelle commande', `${acheteur.prenom} a commande "${serviceNom}"`, { commandeId, serviceNom, acteur: acheteur, destinataireId: vendeurId });
    // Email transactionnel
    const vendeur = await getUserEmail(vendeurId);
    if (vendeur) {
        (0, emailService_js_1.envoyerEmailNouvelleCommande)(vendeur.email, vendeur.prenom, serviceNom, acheteur.prenom, montant || 'Sur devis');
    }
}
/**
 * Commande acceptee (→ acheteur)
 */
async function notifierCommandeAcceptee(commandeId, serviceNom, vendeur, acheteurId) {
    await creerNotifCommande('commande_acceptee', 'Commande acceptee', `${vendeur.prenom} a accepte votre commande "${serviceNom}"`, { commandeId, serviceNom, acteur: vendeur, destinataireId: acheteurId });
    const acheteur = await getUserEmail(acheteurId);
    if (acheteur) {
        (0, emailService_js_1.envoyerEmailCommandeAcceptee)(acheteur.email, acheteur.prenom, serviceNom, vendeur.prenom);
    }
}
/**
 * Commande refusee (→ acheteur)
 */
function notifierCommandeRefusee(commandeId, serviceNom, vendeur, acheteurId) {
    return creerNotifCommande('commande_refusee', 'Commande refusee', `${vendeur.prenom} a refuse votre commande "${serviceNom}"`, { commandeId, serviceNom, acteur: vendeur, destinataireId: acheteurId });
}
/**
 * Commande livree (→ acheteur)
 */
async function notifierCommandeLivree(commandeId, serviceNom, vendeur, acheteurId) {
    await creerNotifCommande('commande_livree', 'Livraison recue', `${vendeur.prenom} a livre votre commande "${serviceNom}"`, { commandeId, serviceNom, acteur: vendeur, destinataireId: acheteurId });
    const acheteur = await getUserEmail(acheteurId);
    if (acheteur) {
        (0, emailService_js_1.envoyerEmailLivraison)(acheteur.email, acheteur.prenom, serviceNom, vendeur.prenom);
    }
}
/**
 * Commande terminee / validee (→ vendeur)
 */
async function notifierCommandeTerminee(commandeId, serviceNom, acheteur, vendeurId) {
    await creerNotifCommande('commande_terminee', 'Commande terminee', `${acheteur.prenom} a valide la livraison de "${serviceNom}"`, { commandeId, serviceNom, acteur: acheteur, destinataireId: vendeurId });
    const vendeur = await getUserEmail(vendeurId);
    if (vendeur) {
        (0, emailService_js_1.envoyerEmailCommandeTerminee)(vendeur.email, vendeur.prenom, serviceNom, acheteur.prenom);
    }
}
/**
 * Demande de revision (→ vendeur)
 */
function notifierRevisionDemandee(commandeId, serviceNom, acheteur, vendeurId) {
    return creerNotifCommande('commande_revision', 'Revision demandee', `${acheteur.prenom} demande une revision sur "${serviceNom}"`, { commandeId, serviceNom, acteur: acheteur, destinataireId: vendeurId });
}
/**
 * Commande annulee (→ l'autre partie)
 */
function notifierCommandeAnnulee(commandeId, serviceNom, acteur, destinataireId) {
    return creerNotifCommande('commande_annulee', 'Commande annulee', `${acteur.prenom} a annule la commande "${serviceNom}"`, { commandeId, serviceNom, acteur, destinataireId });
}
/**
 * Litige ouvert (→ l'autre partie)
 */
function notifierLitige(commandeId, serviceNom, acteur, destinataireId) {
    return creerNotifCommande('commande_litige', 'Litige ouvert', `${acteur.prenom} a ouvert un litige sur "${serviceNom}"`, { commandeId, serviceNom, acteur, destinataireId });
}
/**
 * Progression ajoutee (→ acheteur)
 */
function notifierProgressionAjoutee(commandeId, serviceNom, vendeur, acheteurId, percent) {
    return creerNotifCommande('commande_en_cours', 'Avancement mis a jour', `${vendeur.prenom} a mis a jour l'avancement (${percent}%) de "${serviceNom}"`, { commandeId, serviceNom, acteur: vendeur, destinataireId: acheteurId });
}
//# sourceMappingURL=orderNotifications.js.map