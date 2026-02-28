"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMesVentes = exports.getMesAchats = exports.getOrderDetail = exports.creerCommande = void 0;
const MarketplaceOrder_js_1 = __importDefault(require("../../models/MarketplaceOrder.js"));
const MarketplaceService_js_1 = __importDefault(require("../../models/MarketplaceService.js"));
const MarketplaceEvent_js_1 = __importDefault(require("../../models/MarketplaceEvent.js"));
const deadlineUtils_js_1 = require("../../services/marketplace/deadlineUtils.js");
const orderNotifications_js_1 = require("./orderNotifications.js");
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
        // Notification + email → vendeur
        const user = req.utilisateur;
        (0, orderNotifications_js_1.notifierNouvelleCommande)(commande._id.toString(), service.nom, { _id: user._id.toString(), prenom: user.prenom, nom: user.nom, avatar: user.avatar }, service.createur.toString(), montantTotal > 0 ? `${montantTotal.toFixed(2)} EUR` : undefined);
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
        // Calculer deadline a la volee (Option A)
        const deadlineFields = (0, deadlineUtils_js_1.computeDeadlineFields)(commande);
        const enriched = { ...commande };
        if (deadlineFields.deadlineActive || commande.acceptedAt) {
            enriched.deadline = {
                acceptedAt: commande.acceptedAt,
                initialDeliverySeconds: commande.initialDeliverySeconds,
                currentDeadlineAt: commande.currentDeadlineAt,
                remainingSeconds: deadlineFields.remainingSeconds,
                isLate: deadlineFields.isLate,
                lateSince: deadlineFields.lateSince,
                deadlineActive: deadlineFields.deadlineActive,
                extensions: commande.extensions || [],
                deadlineHistory: commande.deadlineHistory || [],
            };
            // Persister isLate a la premiere detection (fire-and-forget)
            if (deadlineFields.isLate && !commande.isLate) {
                MarketplaceOrder_js_1.default.findByIdAndUpdate(commande._id, {
                    isLate: true,
                    lateSince: deadlineFields.lateSince,
                }).catch(() => { });
                // Notification retard (une seule fois)
                const vendeurObj = commande.vendeur;
                const vendeurId = vendeurObj._id?.toString() || vendeurObj.toString();
                const acheteurObj = commande.acheteur;
                const acheteurId = acheteurObj._id?.toString() || acheteurObj.toString();
                const vendeurProfil = {
                    _id: vendeurId,
                    prenom: vendeurObj.prenom || 'Vendeur',
                    nom: vendeurObj.nom || '',
                };
                (0, orderNotifications_js_1.notifierCommandeEnRetard)(commande._id.toString(), commande.serviceSnapshot?.nom || 'Service', vendeurProfil, acheteurId, vendeurId).catch(() => { });
            }
        }
        // Revision info
        const settings = commande.revisionSettings || { accepteRevisions: true, revisionsIncluses: 2 };
        const revisionsUtilisees = (commande.historique || []).filter((h) => h.de === 'livre' && h.vers === 'en_cours').length;
        const revisionsRestantes = Math.max(0, settings.revisionsIncluses - revisionsUtilisees);
        enriched.revisionInfo = {
            accepteRevisions: settings.accepteRevisions,
            revisionsIncluses: settings.revisionsIncluses,
            revisionsUtilisees,
            revisionsRestantes,
            peutDemanderRevision: settings.accepteRevisions && revisionsRestantes > 0 && commande.statut === 'livre',
        };
        return res.json({ succes: true, data: { commande: enriched } });
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
        const [commandesRaw, total] = await Promise.all([
            MarketplaceOrder_js_1.default.find(filtre)
                .sort({ dateCreation: -1 })
                .skip(skip)
                .limit(limit)
                .populate('service', 'nom image')
                .populate('vendeur', 'prenom nom avatar')
                .lean(),
            MarketplaceOrder_js_1.default.countDocuments(filtre),
        ]);
        // Enrichir chaque commande avec deadline legere
        const commandes = commandesRaw.map((c) => {
            if (!c.acceptedAt || !c.currentDeadlineAt)
                return c;
            const df = (0, deadlineUtils_js_1.computeDeadlineFields)(c);
            return { ...c, deadline: { currentDeadlineAt: c.currentDeadlineAt, remainingSeconds: df.remainingSeconds, isLate: df.isLate, deadlineActive: df.deadlineActive } };
        });
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
        const [commandesRaw, total] = await Promise.all([
            MarketplaceOrder_js_1.default.find(filtre)
                .sort({ dateCreation: -1 })
                .skip(skip)
                .limit(limit)
                .populate('service', 'nom image')
                .populate('acheteur', 'prenom nom avatar')
                .lean(),
            MarketplaceOrder_js_1.default.countDocuments(filtre),
        ]);
        // Enrichir chaque commande avec deadline legere
        const commandes = commandesRaw.map((c) => {
            if (!c.acceptedAt || !c.currentDeadlineAt)
                return c;
            const df = (0, deadlineUtils_js_1.computeDeadlineFields)(c);
            return { ...c, deadline: { currentDeadlineAt: c.currentDeadlineAt, remainingSeconds: df.remainingSeconds, isLate: df.isLate, deadlineActive: df.deadlineActive } };
        });
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