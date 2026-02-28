"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceDetail = exports.listerServices = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MarketplaceService_js_1 = __importDefault(require("../../models/MarketplaceService.js"));
const MarketplaceOrder_js_1 = __importDefault(require("../../models/MarketplaceOrder.js"));
const MarketplaceReview_js_1 = __importDefault(require("../../models/MarketplaceReview.js"));
const strings_js_1 = require("../../utils/strings.js");
const gestionErreurs_js_1 = require("../../middlewares/gestionErreurs.js");
/**
 * GET /api/admin/marketplace/services
 * Liste paginee de tous les services avec filtres
 */
const listerServices = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = {};
        const statut = req.query.statut;
        if (statut && ['brouillon', 'actif', 'pause', 'archive'].includes(statut)) {
            filter.statut = statut;
        }
        const categorie = req.query.categorie;
        if (categorie && ['service', 'formation', 'produit', 'outil', 'accompagnement'].includes(categorie)) {
            filter.categorie = categorie;
        }
        const createurId = req.query.createurId;
        if (createurId && mongoose_1.default.Types.ObjectId.isValid(createurId)) {
            filter.createur = new mongoose_1.default.Types.ObjectId(createurId);
        }
        const search = req.query.search;
        if (search && search.length >= 2) {
            const searchRegex = new RegExp((0, strings_js_1.escapeRegex)(search.slice(0, 100)), 'i');
            filter.$or = [
                { nom: searchRegex },
                { description: searchRegex },
            ];
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
        const sortField = ['dateCreation', 'prix', 'statsCache.noteGlobale', 'statsCache.commandesRealisees']
            .includes(req.query.sort) ? req.query.sort : 'dateCreation';
        const sortOrder = req.query.order === 'asc' ? 1 : -1;
        const [services, total] = await Promise.all([
            MarketplaceService_js_1.default.find(filter)
                .populate('createur', '_id prenom nom avatar email')
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .lean(),
            MarketplaceService_js_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            succes: true,
            data: {
                services,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listerServices = listerServices;
/**
 * GET /api/admin/marketplace/services/:id
 * Detail complet d'un service avec stats et avis recents
 */
const getServiceDetail = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new gestionErreurs_js_1.ErreurAPI('ID service invalide', 400);
        }
        const service = await MarketplaceService_js_1.default.findById(id)
            .populate('createur', '_id prenom nom avatar email role dateCreation')
            .lean();
        if (!service) {
            throw new gestionErreurs_js_1.ErreurAPI('Service introuvable', 404);
        }
        const [ordersCount, reviews, ordersByStatut] = await Promise.all([
            MarketplaceOrder_js_1.default.countDocuments({ service: id }),
            MarketplaceReview_js_1.default.find({ service: id })
                .populate('auteur', '_id prenom nom avatar')
                .sort({ dateCreation: -1 })
                .limit(10)
                .lean(),
            MarketplaceOrder_js_1.default.aggregate([
                { $match: { service: new mongoose_1.default.Types.ObjectId(id) } },
                { $group: { _id: '$statut', count: { $sum: 1 } } },
            ]),
        ]);
        const commandesParStatut = {};
        for (const s of ordersByStatut) {
            commandesParStatut[s._id] = s.count;
        }
        res.status(200).json({
            succes: true,
            data: {
                service,
                reviews,
                stats: {
                    totalCommandes: ordersCount,
                    commandesParStatut,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getServiceDetail = getServiceDetail;
//# sourceMappingURL=services.js.map