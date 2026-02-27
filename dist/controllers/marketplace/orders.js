"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMesVentes = exports.getMesAchats = exports.getOrderDetail = exports.creerCommande = void 0;
const MarketplaceOrder_js_1 = __importDefault(require("../../models/MarketplaceOrder.js"));
const MarketplaceService_js_1 = __importDefault(require("../../models/MarketplaceService.js"));
const MarketplaceEvent_js_1 = __importDefault(require("../../models/MarketplaceEvent.js"));
/**
 * POST /api/marketplace/orders
 * Creer une nouvelle commande avec brief acheteur.
 * Body: { serviceId, optionsSelectionnees?: number[], buyerBrief?: { message, attachments? } }
 */
const creerCommande = async (req, res) => {
    try {
        const { serviceId, optionsSelectionnees, buyerBrief } = req.body;
        if (!serviceId) {
            return res.status(400).json({ succes: false, message: 'Le serviceId est requis' });
        }
        const service = await MarketplaceService_js_1.default.findById(serviceId);
        if (!service) {
            return res.status(404).json({ succes: false, message: 'Service introuvable' });
        }
        if (service.statut !== 'actif') {
            return res.status(400).json({ succes: false, message: "Ce service n'est pas disponible a la commande" });
        }
        // Pas commander son propre service
        if (service.createur.equals(req.utilisateur._id)) {
            return res.status(403).json({ succes: false, message: 'Vous ne pouvez pas commander votre propre service' });
        }
        // Construire le snapshot des options selectionnees
        const optionsSnapshot = [];
        if (Array.isArray(optionsSelectionnees) && optionsSelectionnees.length > 0) {
            for (const index of optionsSelectionnees) {
                if (typeof index !== 'number' || index < 0 || index >= (service.options || []).length) {
                    return res.status(400).json({ succes: false, message: `Index d'option invalide: ${index}` });
                }
                const opt = service.options[index];
                optionsSnapshot.push({ label: opt.label, prix: opt.prix, devise: opt.devise || 'EUR' });
            }
        }
        // Calculer le montant total
        let montantTotal = 0;
        if (service.prix !== null && service.prix !== undefined) {
            montantTotal = service.prix;
            for (const opt of optionsSnapshot)
                montantTotal += opt.prix;
        }
        // Preparer le brief
        const brief = {
            message: buyerBrief?.message || '',
            attachments: Array.isArray(buyerBrief?.attachments) ? buyerBrief.attachments : [],
            submittedAt: new Date(),
        };
        // Creer la commande
        const commande = await MarketplaceOrder_js_1.default.create({
            service: service._id,
            acheteur: req.utilisateur._id,
            vendeur: service.createur,
            serviceSnapshot: {
                nom: service.nom,
                prix: service.prix,
                devise: service.devise || 'EUR',
                image: service.image,
            },
            optionsSelectionnees: optionsSnapshot,
            montantTotal,
            buyerBrief: brief,
            statut: 'en_attente',
            historique: [{
                    de: 'creation',
                    vers: 'en_attente',
                    date: new Date(),
                    par: req.utilisateur._id,
                    commentaire: 'Commande creee',
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
        return res.status(500).json({ succes: false, message: 'Erreur lors de la creation de la commande' });
    }
};
exports.creerCommande = creerCommande;
/**
 * GET /api/marketplace/orders/:id
 * Detail complet d'une commande (acheteur ou vendeur uniquement)
 */
const getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const commande = await MarketplaceOrder_js_1.default.findById(id)
            .populate('acheteur', 'prenom nom avatar')
            .populate('vendeur', 'prenom nom avatar')
            .populate('service', 'nom image categorie')
            .lean();
        if (!commande) {
            return res.status(404).json({ succes: false, message: 'Commande introuvable' });
        }
        // Verifier acces : acheteur ou vendeur
        const userId = req.utilisateur._id;
        const isPartie = userId.equals(commande.acheteur._id || commande.acheteur)
            || userId.equals(commande.vendeur._id || commande.vendeur);
        if (!isPartie) {
            return res.status(403).json({ succes: false, message: "Vous n'avez pas acces a cette commande" });
        }
        return res.json({ succes: true, data: { commande } });
    }
    catch (error) {
        console.error('[marketplace:orders] Erreur getOrderDetail:', error);
        return res.status(500).json({ succes: false, message: 'Erreur serveur' });
    }
};
exports.getOrderDetail = getOrderDetail;
/**
 * GET /api/marketplace/orders/achats
 * Mes achats. Query: ?statut, ?page, ?limit
 */
const getMesAchats = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const filtre = { acheteur: req.utilisateur._id };
        if (req.query.statut) {
            filtre.statut = req.query.statut;
        }
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
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    }
    catch (error) {
        console.error('[marketplace:orders] Erreur getMesAchats:', error);
        return res.status(500).json({ succes: false, message: 'Erreur lors de la recuperation des achats' });
    }
};
exports.getMesAchats = getMesAchats;
/**
 * GET /api/marketplace/orders/ventes
 * Mes ventes. Query: ?statut, ?page, ?limit
 */
const getMesVentes = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;
        const filtre = { vendeur: req.utilisateur._id };
        if (req.query.statut) {
            filtre.statut = req.query.statut;
        }
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
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    }
    catch (error) {
        console.error('[marketplace:orders] Erreur getMesVentes:', error);
        return res.status(500).json({ succes: false, message: 'Erreur lors de la recuperation des ventes' });
    }
};
exports.getMesVentes = getMesVentes;
//# sourceMappingURL=orders.js.map