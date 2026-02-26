"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supprimerReview = exports.modifierReview = exports.getReviewsService = exports.creerReview = void 0;
const MarketplaceReview_js_1 = __importDefault(require("../../models/MarketplaceReview.js"));
const MarketplaceOrder_js_1 = __importDefault(require("../../models/MarketplaceOrder.js"));
const helpers_js_1 = require("./helpers.js");
/**
 * Creer un avis sur un service apres une commande terminee
 * POST /api/marketplace/reviews
 */
const creerReview = async (req, res) => {
    try {
        const { commandeId, note, commentaire } = req.body;
        if (!commandeId || !note || !commentaire) {
            return res.status(400).json({
                succes: false,
                message: 'Les champs commandeId, note et commentaire sont requis.',
            });
        }
        // Verifier que la commande existe
        const commande = await MarketplaceOrder_js_1.default.findById(commandeId);
        if (!commande) {
            return res.status(404).json({
                succes: false,
                message: 'Commande introuvable.',
            });
        }
        // Verifier que la commande est terminee
        if (commande.statut !== 'termine') {
            return res.status(400).json({
                succes: false,
                message: 'Seules les commandes terminees peuvent recevoir un avis.',
            });
        }
        // Verifier que l'utilisateur est l'acheteur de la commande
        if (!commande.acheteur.equals(req.utilisateur._id)) {
            return res.status(403).json({
                succes: false,
                message: 'Seul l\'acheteur peut laisser un avis.',
            });
        }
        // Verifier qu'aucun avis n'a deja ete laisse
        if (commande.aReview) {
            return res.status(409).json({
                succes: false,
                message: 'Un avis a deja ete laisse pour cette commande.',
            });
        }
        // Creer l'avis
        const review = await MarketplaceReview_js_1.default.create({
            service: commande.service,
            commande: commandeId,
            auteur: req.utilisateur._id,
            note,
            commentaire,
        });
        // Marquer la commande comme ayant un avis
        commande.aReview = true;
        await commande.save();
        // Recalculer les stats du service
        await (0, helpers_js_1.recomputeServiceStats)(commande.service);
        return res.status(201).json({
            succes: true,
            data: { review },
        });
    }
    catch (error) {
        console.error('[marketplace:reviews] Erreur creerReview:', error);
        return res.status(500).json({
            succes: false,
            message: 'Erreur serveur lors de la creation de l\'avis.',
        });
    }
};
exports.creerReview = creerReview;
/**
 * Recuperer les avis d'un service (public)
 * GET /api/marketplace/reviews/:serviceId
 */
const getReviewsService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        // Compter le total d'avis pour la pagination
        const total = await MarketplaceReview_js_1.default.countDocuments({ service: serviceId });
        // Recuperer les avis avec pagination
        const reviews = await MarketplaceReview_js_1.default.find({ service: serviceId })
            .sort({ dateCreation: -1 })
            .skip(skip)
            .limit(limit)
            .populate('auteur', 'prenom nom avatar')
            .lean();
        // Formater les avis pour le client
        const formattedReviews = reviews.map((r) => ({
            id: r._id.toString(),
            auteur: r.auteur
                ? `${r.auteur.prenom || ''} ${(r.auteur.nom || '').charAt(0)}.`.trim()
                : 'Utilisateur',
            avatar: r.auteur?.avatar || undefined,
            note: r.note,
            commentaire: r.commentaire,
            date: r.dateCreation
                ? new Date(r.dateCreation).toISOString().split('T')[0]
                : '',
        }));
        return res.status(200).json({
            succes: true,
            data: {
                reviews: formattedReviews,
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
        console.error('[marketplace:reviews] Erreur getReviewsService:', error);
        return res.status(500).json({
            succes: false,
            message: 'Erreur serveur lors de la recuperation des avis.',
        });
    }
};
exports.getReviewsService = getReviewsService;
/**
 * Modifier un avis existant (proprietaire uniquement, dans les 7 jours)
 * PATCH /api/marketplace/reviews/:id
 */
const modifierReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { note, commentaire } = req.body;
        // Recuperer l'avis
        const review = await MarketplaceReview_js_1.default.findById(id);
        if (!review) {
            return res.status(404).json({
                succes: false,
                message: 'Avis introuvable.',
            });
        }
        // Verifier que l'utilisateur est l'auteur
        if (!review.auteur.equals(req.utilisateur._id)) {
            return res.status(403).json({
                succes: false,
                message: 'Seul l\'auteur peut modifier son avis.',
            });
        }
        // Verifier le delai de 7 jours
        const septJoursMs = 7 * 24 * 3600 * 1000;
        const dateCreation = new Date(review.dateCreation).getTime();
        if (Date.now() - dateCreation > septJoursMs) {
            return res.status(400).json({
                succes: false,
                message: 'L\'avis ne peut plus etre modifie apres 7 jours.',
            });
        }
        // Mettre a jour les champs fournis
        if (note !== undefined)
            review.note = note;
        if (commentaire !== undefined)
            review.commentaire = commentaire;
        await review.save();
        // Recalculer les stats du service
        await (0, helpers_js_1.recomputeServiceStats)(review.service);
        return res.status(200).json({
            succes: true,
            data: { review },
        });
    }
    catch (error) {
        console.error('[marketplace:reviews] Erreur modifierReview:', error);
        return res.status(500).json({
            succes: false,
            message: 'Erreur serveur lors de la modification de l\'avis.',
        });
    }
};
exports.modifierReview = modifierReview;
/**
 * Supprimer un avis (proprietaire uniquement)
 * DELETE /api/marketplace/reviews/:id
 */
const supprimerReview = async (req, res) => {
    try {
        const { id } = req.params;
        // Recuperer l'avis
        const review = await MarketplaceReview_js_1.default.findById(id);
        if (!review) {
            return res.status(404).json({
                succes: false,
                message: 'Avis introuvable.',
            });
        }
        // Verifier que l'utilisateur est l'auteur
        if (!review.auteur.equals(req.utilisateur._id)) {
            return res.status(403).json({
                succes: false,
                message: 'Seul l\'auteur peut supprimer son avis.',
            });
        }
        const serviceId = review.service;
        const commandeId = review.commande;
        // Remettre le flag aReview a false sur la commande
        await MarketplaceOrder_js_1.default.findByIdAndUpdate(commandeId, { aReview: false });
        // Supprimer l'avis
        await MarketplaceReview_js_1.default.findByIdAndDelete(id);
        // Recalculer les stats du service
        await (0, helpers_js_1.recomputeServiceStats)(serviceId);
        return res.status(200).json({
            succes: true,
            message: 'Avis supprime.',
        });
    }
    catch (error) {
        console.error('[marketplace:reviews] Erreur supprimerReview:', error);
        return res.status(500).json({
            succes: false,
            message: 'Erreur serveur lors de la suppression de l\'avis.',
        });
    }
};
exports.supprimerReview = supprimerReview;
//# sourceMappingURL=reviews.js.map