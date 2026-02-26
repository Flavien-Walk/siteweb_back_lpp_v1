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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changerStatutCommande = exports.getMesVentes = exports.getMesAchats = exports.creerCommande = void 0;
const MarketplaceOrder_js_1 = __importStar(require("../../models/MarketplaceOrder.js"));
const MarketplaceService_js_1 = __importDefault(require("../../models/MarketplaceService.js"));
const MarketplaceEvent_js_1 = __importDefault(require("../../models/MarketplaceEvent.js"));
const helpers_js_1 = require("./helpers.js");
/**
 * POST /api/marketplace/orders
 * Creer une nouvelle commande pour un service actif.
 * Body: { serviceId, optionsSelectionnees?: number[] }
 */
const creerCommande = async (req, res) => {
    try {
        const { serviceId, optionsSelectionnees } = req.body;
        if (!serviceId) {
            return res.status(400).json({ succes: false, message: "Le serviceId est requis" });
        }
        // Verifier que le service existe et est actif
        const service = await MarketplaceService_js_1.default.findById(serviceId);
        if (!service) {
            return res.status(404).json({ succes: false, message: "Service introuvable" });
        }
        if (service.statut !== 'actif') {
            return res.status(400).json({ succes: false, message: "Ce service n'est pas disponible a la commande" });
        }
        // L'acheteur ne peut pas commander son propre service
        if (service.createur.equals(req.utilisateur._id)) {
            return res.status(403).json({ succes: false, message: "Vous ne pouvez pas commander votre propre service" });
        }
        // Construire le snapshot des options selectionnees
        const optionsSnapshot = [];
        if (Array.isArray(optionsSelectionnees) && optionsSelectionnees.length > 0) {
            for (const index of optionsSelectionnees) {
                if (typeof index !== 'number' || index < 0 || index >= (service.options || []).length) {
                    return res.status(400).json({
                        succes: false,
                        message: `Index d'option invalide: ${index}`,
                    });
                }
                const opt = service.options[index];
                optionsSnapshot.push({
                    label: opt.label,
                    prix: opt.prix,
                    devise: opt.devise || 'EUR',
                });
            }
        }
        // Calculer le montant total
        // Si le prix du service est null ("Sur devis"), montantTotal = 0 (placeholder)
        let montantTotal = 0;
        if (service.prix !== null && service.prix !== undefined) {
            montantTotal = service.prix;
            for (const opt of optionsSnapshot) {
                montantTotal += opt.prix;
            }
        }
        // Creer la commande
        const commande = await MarketplaceOrder_js_1.default.create({
            service: service._id,
            acheteur: req.utilisateur._id,
            vendeur: service.createur,
            serviceSnapshot: {
                nom: service.nom,
                prix: service.prix,
                devise: service.devise || 'EUR',
            },
            optionsSelectionnees: optionsSnapshot,
            montantTotal,
            statut: 'en_attente',
            historique: [{
                    de: 'en_attente',
                    vers: 'en_attente',
                    par: req.utilisateur._id,
                }],
        });
        // Tracker l'evenement analytics
        await MarketplaceEvent_js_1.default.create({
            service: service._id,
            type: 'order',
            utilisateur: req.utilisateur._id,
        });
        return res.status(201).json({ succes: true, data: { commande } });
    }
    catch (error) {
        console.error('[marketplace:orders] Erreur creerCommande:', error);
        return res.status(500).json({ succes: false, message: "Erreur lors de la creation de la commande" });
    }
};
exports.creerCommande = creerCommande;
/**
 * GET /api/marketplace/orders/achats
 * Recuperer les commandes passees par l'utilisateur connecte (role acheteur).
 * Query: page, limit
 */
const getMesAchats = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const filtre = { acheteur: req.utilisateur._id };
        const [commandes, total] = await Promise.all([
            MarketplaceOrder_js_1.default.find(filtre)
                .sort({ dateCreation: -1 })
                .skip(skip)
                .limit(limit)
                .populate('service', 'nom image')
                .populate('vendeur', 'prenom nom avatar')
                .lean(),
            MarketplaceOrder_js_1.default.countDocuments(filtre),
        ]);
        return res.json({
            succes: true,
            data: {
                commandes,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    }
    catch (error) {
        console.error('[marketplace:orders] Erreur getMesAchats:', error);
        return res.status(500).json({ succes: false, message: "Erreur lors de la recuperation des achats" });
    }
};
exports.getMesAchats = getMesAchats;
/**
 * GET /api/marketplace/orders/ventes
 * Recuperer les commandes recues par l'utilisateur connecte (role vendeur/entrepreneur).
 * Query: page, limit
 */
const getMesVentes = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const filtre = { vendeur: req.utilisateur._id };
        const [commandes, total] = await Promise.all([
            MarketplaceOrder_js_1.default.find(filtre)
                .sort({ dateCreation: -1 })
                .skip(skip)
                .limit(limit)
                .populate('service', 'nom image')
                .populate('acheteur', 'prenom nom avatar')
                .lean(),
            MarketplaceOrder_js_1.default.countDocuments(filtre),
        ]);
        return res.json({
            succes: true,
            data: {
                commandes,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    }
    catch (error) {
        console.error('[marketplace:orders] Erreur getMesVentes:', error);
        return res.status(500).json({ succes: false, message: "Erreur lors de la recuperation des ventes" });
    }
};
exports.getMesVentes = getMesVentes;
/**
 * PATCH /api/marketplace/orders/:id/statut
 * Changer le statut d'une commande (machine a etats).
 * Body: { statut, commentaire? }
 */
const changerStatutCommande = async (req, res) => {
    try {
        const { id } = req.params;
        const { statut: nouveauStatut, commentaire } = req.body;
        if (!nouveauStatut) {
            return res.status(400).json({ succes: false, message: "Le nouveau statut est requis" });
        }
        // Charger la commande
        const commande = await MarketplaceOrder_js_1.default.findById(id);
        if (!commande) {
            return res.status(404).json({ succes: false, message: "Commande introuvable" });
        }
        // Verifier que la transition est autorisee
        const transitionsValides = MarketplaceOrder_js_1.TRANSITIONS_AUTORISEES[commande.statut];
        if (!transitionsValides || !transitionsValides.includes(nouveauStatut)) {
            return res.status(400).json({
                succes: false,
                message: `Transition impossible: ${commande.statut} -> ${nouveauStatut}`,
            });
        }
        // Verifier que l'utilisateur a le droit d'effectuer cette transition
        const cle = commande.statut + '->' + nouveauStatut;
        const regle = MarketplaceOrder_js_1.QUI_PEUT_TRANSITIONNER[cle];
        let autorise = false;
        switch (regle) {
            case 'acheteur':
                autorise = req.utilisateur._id.equals(commande.acheteur);
                break;
            case 'vendeur':
                autorise = req.utilisateur._id.equals(commande.vendeur);
                break;
            case 'both':
                autorise = req.utilisateur._id.equals(commande.acheteur)
                    || req.utilisateur._id.equals(commande.vendeur);
                break;
            case 'staff':
                autorise = req.utilisateur.isStaff();
                break;
            default:
                autorise = false;
        }
        if (!autorise) {
            return res.status(403).json({
                succes: false,
                message: "Vous n'etes pas autorise a effectuer cette transition",
            });
        }
        // Appliquer la transition
        const ancienStatut = commande.statut;
        commande.statut = nouveauStatut;
        commande.historique.push({
            de: ancienStatut,
            vers: nouveauStatut,
            date: new Date(),
            par: req.utilisateur._id,
            commentaire: commentaire || undefined,
        });
        await commande.save();
        // Si la commande est terminee, recalculer les stats du service
        if (nouveauStatut === 'termine') {
            await (0, helpers_js_1.recomputeServiceStats)(commande.service);
        }
        return res.json({ succes: true, data: { commande } });
    }
    catch (error) {
        console.error('[marketplace:orders] Erreur changerStatutCommande:', error);
        return res.status(500).json({ succes: false, message: "Erreur lors du changement de statut" });
    }
};
exports.changerStatutCommande = changerStatutCommande;
//# sourceMappingURL=orders.js.map