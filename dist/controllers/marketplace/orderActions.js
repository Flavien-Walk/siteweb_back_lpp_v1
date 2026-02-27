"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ouvrirLitige = exports.annulerCommande = exports.demanderRevision = exports.validerCommande = exports.livrerCommande = exports.ajouterProgression = exports.refuserCommande = exports.accepterCommande = void 0;
const MarketplaceOrder_js_1 = __importDefault(require("../../models/MarketplaceOrder.js"));
const orderStateMachine_js_1 = require("../../services/marketplace/orderStateMachine.js");
const helpers_js_1 = require("./helpers.js");
// ============ HELPERS ============
/**
 * Charge une commande + verifie que le user est partie prenante
 */
async function loadOrder(req, res) {
    const { id } = req.params;
    const commande = await MarketplaceOrder_js_1.default.findById(id);
    if (!commande) {
        res.status(404).json({ succes: false, message: 'Commande introuvable' });
        return null;
    }
    const userId = req.utilisateur._id;
    const isPartie = userId.equals(commande.acheteur) || userId.equals(commande.vendeur);
    if (!isPartie) {
        res.status(403).json({ succes: false, message: "Vous n'avez pas acces a cette commande" });
        return null;
    }
    return commande;
}
/**
 * Effectue une transition de statut avec toutes les validations
 */
async function transitionStatut(req, res, versStatut, opts) {
    try {
        const commande = await loadOrder(req, res);
        if (!commande)
            return;
        const userId = req.utilisateur._id;
        // Validation state machine
        const auth = (0, orderStateMachine_js_1.isAutorise)(commande.statut, versStatut, userId, commande.acheteur, commande.vendeur);
        if (!auth.ok)
            return res.status(403).json({ succes: false, message: auth.message });
        // Validations metier
        const metier = (0, orderStateMachine_js_1.validationsMetier)(commande.statut, versStatut, commande);
        if (!metier.ok)
            return res.status(400).json({ succes: false, message: metier.message });
        // Extra validation optionnelle
        if (opts?.extraValidation) {
            const erreur = opts.extraValidation();
            if (erreur)
                return res.status(400).json({ succes: false, message: erreur });
        }
        // Appliquer
        const ancien = commande.statut;
        commande.statut = versStatut;
        commande.historique.push({
            de: ancien,
            vers: versStatut,
            date: new Date(),
            par: userId,
            commentaire: opts?.commentaire || req.body.commentaire || undefined,
        });
        await commande.save();
        // Stats si termine
        if (versStatut === 'termine') {
            await (0, helpers_js_1.recomputeServiceStats)(commande.service);
        }
        return res.json({ succes: true, data: { commande } });
    }
    catch (error) {
        console.error('[marketplace:orderActions] Erreur transition:', error);
        return res.status(500).json({ succes: false, message: 'Erreur serveur' });
    }
}
// ============ VENDEUR ACTIONS ============
/**
 * POST /api/marketplace/orders/:id/accept
 * Vendeur accepte la commande → acceptee, puis auto-start → en_cours
 */
const accepterCommande = async (req, res) => {
    try {
        const commande = await loadOrder(req, res);
        if (!commande)
            return;
        const userId = req.utilisateur._id;
        const auth = (0, orderStateMachine_js_1.isAutorise)(commande.statut, 'acceptee', userId, commande.acheteur, commande.vendeur);
        if (!auth.ok)
            return res.status(403).json({ succes: false, message: auth.message });
        // Accepter + auto-demarrer (acceptee → en_cours en un seul appel)
        const ancien = commande.statut;
        commande.statut = 'en_cours';
        commande.historique.push({ de: ancien, vers: 'acceptee', date: new Date(), par: userId, commentaire: req.body.commentaire || undefined }, { de: 'acceptee', vers: 'en_cours', date: new Date(), par: userId, commentaire: 'Demarrage automatique' });
        await commande.save();
        return res.json({ succes: true, data: { commande } });
    }
    catch (error) {
        console.error('[marketplace:orderActions] Erreur accepter:', error);
        return res.status(500).json({ succes: false, message: 'Erreur serveur' });
    }
};
exports.accepterCommande = accepterCommande;
/**
 * POST /api/marketplace/orders/:id/refuse
 * Vendeur refuse la commande
 */
const refuserCommande = async (req, res) => {
    return transitionStatut(req, res, 'refusee');
};
exports.refuserCommande = refuserCommande;
/**
 * POST /api/marketplace/orders/:id/progress
 * Vendeur ajoute une mise a jour d'avancement
 */
const ajouterProgression = async (req, res) => {
    try {
        const commande = await loadOrder(req, res);
        if (!commande)
            return;
        const userId = req.utilisateur._id;
        if (!userId.equals(commande.vendeur)) {
            return res.status(403).json({ succes: false, message: 'Seul le vendeur peut ajouter un avancement' });
        }
        if (!['en_cours', 'livre'].includes(commande.statut)) {
            return res.status(400).json({ succes: false, message: 'Avancement possible uniquement en cours ou apres livraison' });
        }
        const { title, message, percent } = req.body;
        if (!title || percent === undefined || percent === null) {
            return res.status(400).json({ succes: false, message: 'title et percent sont requis' });
        }
        if (typeof percent !== 'number' || percent < 0 || percent > 100) {
            return res.status(400).json({ succes: false, message: 'percent doit etre entre 0 et 100' });
        }
        commande.progressUpdates.push({
            title,
            message: message || '',
            percent,
            createdAt: new Date(),
            createdBy: userId,
        });
        await commande.save();
        return res.json({ succes: true, data: { commande } });
    }
    catch (error) {
        console.error('[marketplace:orderActions] Erreur progression:', error);
        return res.status(500).json({ succes: false, message: 'Erreur serveur' });
    }
};
exports.ajouterProgression = ajouterProgression;
/**
 * POST /api/marketplace/orders/:id/deliver
 * Vendeur ajoute des livrables et/ou marque la commande comme livree
 */
const livrerCommande = async (req, res) => {
    try {
        const commande = await loadOrder(req, res);
        if (!commande)
            return;
        const userId = req.utilisateur._id;
        if (!userId.equals(commande.vendeur)) {
            return res.status(403).json({ succes: false, message: 'Seul le vendeur peut livrer' });
        }
        if (commande.statut !== 'en_cours') {
            return res.status(400).json({ succes: false, message: 'La commande doit etre en cours pour livrer' });
        }
        // Ajouter les livrables
        const { deliverables, marquerLivre } = req.body;
        if (Array.isArray(deliverables) && deliverables.length > 0) {
            for (const d of deliverables) {
                if (!d.type || !d.content) {
                    return res.status(400).json({ succes: false, message: 'Chaque livrable doit avoir type et content' });
                }
                if (!['message', 'file', 'link'].includes(d.type)) {
                    return res.status(400).json({ succes: false, message: 'Type de livrable invalide (message/file/link)' });
                }
                commande.deliverables.push({
                    type: d.type,
                    content: d.content,
                    file: d.file || undefined,
                    createdAt: new Date(),
                    createdBy: userId,
                });
            }
        }
        // Marquer comme livre si demande
        if (marquerLivre !== false) {
            // Verifier qu'il y a au moins 1 deliverable
            if (commande.deliverables.length === 0) {
                return res.status(400).json({ succes: false, message: 'Ajoutez au moins un livrable avant de marquer comme livre' });
            }
            commande.statut = 'livre';
            commande.historique.push({
                de: 'en_cours', vers: 'livre',
                date: new Date(), par: userId,
                commentaire: 'Livraison effectuee',
            });
            // Auto progress 100%
            commande.progressUpdates.push({
                title: 'Livraison',
                message: 'Commande livree',
                percent: 100,
                createdAt: new Date(),
                createdBy: userId,
            });
        }
        await commande.save();
        return res.json({ succes: true, data: { commande } });
    }
    catch (error) {
        console.error('[marketplace:orderActions] Erreur livrer:', error);
        return res.status(500).json({ succes: false, message: 'Erreur serveur' });
    }
};
exports.livrerCommande = livrerCommande;
// ============ ACHETEUR ACTIONS ============
/**
 * POST /api/marketplace/orders/:id/complete
 * Acheteur valide la livraison → termine
 */
const validerCommande = async (req, res) => {
    return transitionStatut(req, res, 'termine');
};
exports.validerCommande = validerCommande;
/**
 * POST /api/marketplace/orders/:id/revision
 * Acheteur demande une revision → retour en_cours
 */
const demanderRevision = async (req, res) => {
    const { message } = req.body;
    return transitionStatut(req, res, 'en_cours', {
        commentaire: message || 'Revision demandee par l\'acheteur',
    });
};
exports.demanderRevision = demanderRevision;
// ============ ACTIONS LES DEUX ============
/**
 * POST /api/marketplace/orders/:id/cancel
 * Annuler la commande (regles strictes)
 */
const annulerCommande = async (req, res) => {
    return transitionStatut(req, res, 'annule');
};
exports.annulerCommande = annulerCommande;
/**
 * POST /api/marketplace/orders/:id/dispute
 * Ouvrir un litige
 */
const ouvrirLitige = async (req, res) => {
    const { raison } = req.body;
    if (!raison || raison.trim().length < 10) {
        return res.status(400).json({ succes: false, message: 'La raison du litige doit contenir au moins 10 caracteres' });
    }
    return transitionStatut(req, res, 'litige', { commentaire: raison });
};
exports.ouvrirLitige = ouvrirLitige;
//# sourceMappingURL=orderActions.js.map