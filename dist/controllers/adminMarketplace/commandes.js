"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommandeDetail = exports.getCommandesStats = exports.listerCommandes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MarketplaceOrder_js_1 = __importDefault(require("../../models/MarketplaceOrder.js"));
const MarketplaceReview_js_1 = __importDefault(require("../../models/MarketplaceReview.js"));
const deadlineUtils_js_1 = require("../../services/marketplace/deadlineUtils.js");
const strings_js_1 = require("../../utils/strings.js");
const gestionErreurs_js_1 = require("../../middlewares/gestionErreurs.js");
/**
 * GET /api/admin/marketplace/commandes
 * Liste paginee de toutes les commandes avec filtres
 */
const listerCommandes = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = {};
        const statut = req.query.statut;
        if (statut && ['en_attente', 'acceptee', 'refusee', 'en_cours', 'livre', 'termine', 'annule', 'litige'].includes(statut)) {
            filter.statut = statut;
        }
        const acheteurId = req.query.acheteurId;
        if (acheteurId && mongoose_1.default.Types.ObjectId.isValid(acheteurId)) {
            filter.acheteur = new mongoose_1.default.Types.ObjectId(acheteurId);
        }
        const vendeurId = req.query.vendeurId;
        if (vendeurId && mongoose_1.default.Types.ObjectId.isValid(vendeurId)) {
            filter.vendeur = new mongoose_1.default.Types.ObjectId(vendeurId);
        }
        const serviceId = req.query.serviceId;
        if (serviceId && mongoose_1.default.Types.ObjectId.isValid(serviceId)) {
            filter.service = new mongoose_1.default.Types.ObjectId(serviceId);
        }
        const search = req.query.search;
        if (search && search.length >= 2) {
            filter['serviceSnapshot.nom'] = new RegExp((0, strings_js_1.escapeRegex)(search.slice(0, 100)), 'i');
        }
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;
        if (dateFrom || dateTo) {
            const dateFilter = {};
            if (dateFrom)
                dateFilter.$gte = dateFrom;
            if (dateTo)
                dateFilter.$lte = dateTo;
            filter.dateCreation = dateFilter;
        }
        if (req.query.isLate === 'true') {
            filter.isLate = true;
        }
        const sortField = ['dateCreation', 'montantTotal', 'dateMiseAJour'].includes(req.query.sort)
            ? req.query.sort
            : 'dateCreation';
        const sortOrder = req.query.order === 'asc' ? 1 : -1;
        const [commandes, total] = await Promise.all([
            MarketplaceOrder_js_1.default.find(filter)
                .populate('acheteur', '_id prenom nom avatar email')
                .populate('vendeur', '_id prenom nom avatar email')
                .populate('service', '_id nom image categorie')
                .select('-deliverables -progressUpdates -buyerBrief')
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
            MarketplaceOrder_js_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            succes: true,
            data: {
                commandes,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listerCommandes = listerCommandes;
/**
 * GET /api/admin/marketplace/commandes/stats
 * Stats agregees des commandes
 */
const getCommandesStats = async (req, res, next) => {
    try {
        const [byStatut, total, litiges, montantTotal, last30Days] = await Promise.all([
            MarketplaceOrder_js_1.default.aggregate([
                { $group: { _id: '$statut', count: { $sum: 1 } } },
            ]),
            MarketplaceOrder_js_1.default.countDocuments(),
            MarketplaceOrder_js_1.default.countDocuments({ statut: 'litige' }),
            MarketplaceOrder_js_1.default.aggregate([
                { $match: { statut: 'termine' } },
                { $group: { _id: null, total: { $sum: '$montantTotal' } } },
            ]),
            MarketplaceOrder_js_1.default.countDocuments({
                dateCreation: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            }),
        ]);
        const parStatut = {};
        for (const s of byStatut) {
            parStatut[s._id] = s.count;
        }
        res.status(200).json({
            succes: true,
            data: {
                total,
                litiges,
                last30Days,
                montantTotalTermine: montantTotal[0]?.total || 0,
                parStatut,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCommandesStats = getCommandesStats;
/**
 * GET /api/admin/marketplace/commandes/:id
 * Detail complet d'une commande
 */
const getCommandeDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new gestionErreurs_js_1.ErreurAPI('ID commande invalide', 400);
        }
        const commande = await MarketplaceOrder_js_1.default.findById(id)
            .populate('acheteur', '_id prenom nom avatar email role')
            .populate('vendeur', '_id prenom nom avatar email role')
            .populate('service', '_id nom image categorie prix statut createur')
            .lean();
        if (!commande) {
            throw new gestionErreurs_js_1.ErreurAPI('Commande introuvable', 404);
        }
        const deadlineFields = (0, deadlineUtils_js_1.computeDeadlineFields)(commande);
        const settings = commande.revisionSettings || { accepteRevisions: true, revisionsIncluses: 2 };
        const revisionsUtilisees = (commande.historique || []).filter((h) => h.de === 'livre' && h.vers === 'en_cours').length;
        const review = await MarketplaceReview_js_1.default.findOne({ commande: id })
            .populate('auteur', '_id prenom nom avatar')
            .lean();
        res.status(200).json({
            succes: true,
            data: {
                commande: {
                    ...commande,
                    deadline: {
                        acceptedAt: commande.acceptedAt,
                        initialDeliverySeconds: commande.initialDeliverySeconds,
                        currentDeadlineAt: commande.currentDeadlineAt,
                        remainingSeconds: deadlineFields.remainingSeconds,
                        isLate: deadlineFields.isLate,
                        lateSince: deadlineFields.lateSince,
                        deadlineActive: deadlineFields.deadlineActive,
                    },
                    revisionInfo: {
                        accepteRevisions: settings.accepteRevisions,
                        revisionsIncluses: settings.revisionsIncluses,
                        revisionsUtilisees,
                        revisionsRestantes: Math.max(0, settings.revisionsIncluses - revisionsUtilisees),
                    },
                },
                review,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getCommandeDetail = getCommandeDetail;
//# sourceMappingURL=commandes.js.map