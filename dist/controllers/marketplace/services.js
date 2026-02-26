"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMesServices = exports.getService = exports.listerServices = exports.archiverService = exports.modifierService = exports.creerService = void 0;
const MarketplaceService_js_1 = __importDefault(require("../../models/MarketplaceService.js"));
const MarketplaceReview_js_1 = __importDefault(require("../../models/MarketplaceReview.js"));
const cloudinary_js_1 = require("../../utils/cloudinary.js");
const helpers_js_1 = require("./helpers.js");
// --- Constantes de validation ---
const CATEGORIES_VALIDES = ['service', 'formation', 'produit', 'outil', 'accompagnement'];
const LIMITES = {
    nom: { min: 5, max: 100 },
    description: { min: 20, max: 200 },
    descriptionLongue: { min: 50, max: 5000 },
    tags: 8,
    gallery: 5,
    options: 10,
};
/**
 * Upload une image vers Cloudinary si c'est du base64, sinon retourne l'URL telle quelle
 */
const traiterImage = async (valeur) => {
    if (valeur && valeur.startsWith('data:image')) {
        const result = await (0, cloudinary_js_1.uploadImage)(valeur, 'lpp/marketplace');
        return result.url;
    }
    return valeur;
};
/**
 * Upload un tableau d'images (gallery) - base64 ou URLs
 */
const traiterGallery = async (gallery) => {
    if (!gallery || !Array.isArray(gallery))
        return [];
    const resultats = [];
    for (const item of gallery) {
        const url = await traiterImage(item);
        if (url)
            resultats.push(url);
    }
    return resultats;
};
/**
 * POST /api/marketplace/services
 * Creer un nouveau service marketplace
 */
const creerService = async (req, res) => {
    try {
        const { nom, description, descriptionLongue, categorie, prix, image, gallery, tags, delaiLivraison, options, faq, } = req.body;
        // --- Validations ---
        if (!nom || nom.length < LIMITES.nom.min || nom.length > LIMITES.nom.max) {
            return res.status(400).json({
                succes: false,
                message: `Le nom doit contenir entre ${LIMITES.nom.min} et ${LIMITES.nom.max} caracteres.`,
            });
        }
        if (!description || description.length < LIMITES.description.min || description.length > LIMITES.description.max) {
            return res.status(400).json({
                succes: false,
                message: `La description doit contenir entre ${LIMITES.description.min} et ${LIMITES.description.max} caracteres.`,
            });
        }
        if (!descriptionLongue || descriptionLongue.length < LIMITES.descriptionLongue.min || descriptionLongue.length > LIMITES.descriptionLongue.max) {
            return res.status(400).json({
                succes: false,
                message: `La description longue doit contenir entre ${LIMITES.descriptionLongue.min} et ${LIMITES.descriptionLongue.max} caracteres.`,
            });
        }
        if (!categorie || !CATEGORIES_VALIDES.includes(categorie)) {
            return res.status(400).json({
                succes: false,
                message: `La categorie doit etre parmi : ${CATEGORIES_VALIDES.join(', ')}.`,
            });
        }
        if (tags && tags.length > LIMITES.tags) {
            return res.status(400).json({
                succes: false,
                message: `Maximum ${LIMITES.tags} tags autorises.`,
            });
        }
        if (gallery && gallery.length > LIMITES.gallery) {
            return res.status(400).json({
                succes: false,
                message: `Maximum ${LIMITES.gallery} images dans la gallery.`,
            });
        }
        if (options && options.length > LIMITES.options) {
            return res.status(400).json({
                succes: false,
                message: `Maximum ${LIMITES.options} options autorisees.`,
            });
        }
        // --- Upload image principale et gallery ---
        const imageUrl = await traiterImage(image);
        const galleryUrls = await traiterGallery(gallery);
        // --- Creation du service ---
        const service = await MarketplaceService_js_1.default.create({
            createur: req.utilisateur._id,
            nom,
            description,
            descriptionLongue,
            categorie,
            prix,
            image: imageUrl,
            gallery: galleryUrls,
            tags: tags || [],
            delaiLivraison,
            options: options || [],
            faq: faq || [],
            statut: 'actif',
        });
        res.status(201).json({
            succes: true,
            data: { service },
        });
    }
    catch (error) {
        console.error('[marketplace:services] Error:', error);
        res.status(500).json({ succes: false, message: 'Erreur serveur.' });
    }
};
exports.creerService = creerService;
/**
 * PATCH /api/marketplace/services/:id
 * Modifier un service existant (proprietaire uniquement)
 */
const modifierService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await MarketplaceService_js_1.default.findById(id);
        if (!service) {
            return res.status(404).json({
                succes: false,
                message: 'Service non trouve.',
            });
        }
        // Verification proprietaire
        if (!service.createur.equals(req.utilisateur._id)) {
            return res.status(403).json({
                succes: false,
                message: 'Vous ne pouvez modifier que vos propres services.',
            });
        }
        // --- Mise a jour partielle : seuls les champs fournis ---
        const champsModifiables = [
            'nom', 'description', 'descriptionLongue', 'categorie',
            'prix', 'tags', 'delaiLivraison', 'options', 'faq',
        ];
        for (const champ of champsModifiables) {
            if (req.body[champ] !== undefined) {
                service[champ] = req.body[champ];
            }
        }
        // Traitement image principale (upload si base64)
        if (req.body.image !== undefined) {
            service.image = await traiterImage(req.body.image);
        }
        // Traitement gallery (upload si base64)
        if (req.body.gallery !== undefined) {
            service.gallery = await traiterGallery(req.body.gallery);
        }
        await service.save();
        res.json({
            succes: true,
            data: { service },
        });
    }
    catch (error) {
        console.error('[marketplace:services] Error:', error);
        res.status(500).json({ succes: false, message: 'Erreur serveur.' });
    }
};
exports.modifierService = modifierService;
/**
 * DELETE /api/marketplace/services/:id
 * Archiver un service (soft delete - proprietaire uniquement)
 */
const archiverService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await MarketplaceService_js_1.default.findById(id);
        if (!service) {
            return res.status(404).json({
                succes: false,
                message: 'Service non trouve.',
            });
        }
        // Verification proprietaire
        if (!service.createur.equals(req.utilisateur._id)) {
            return res.status(403).json({
                succes: false,
                message: 'Vous ne pouvez archiver que vos propres services.',
            });
        }
        service.statut = 'archive';
        await service.save();
        res.json({
            succes: true,
            message: 'Service archive avec succes.',
        });
    }
    catch (error) {
        console.error('[marketplace:services] Error:', error);
        res.status(500).json({ succes: false, message: 'Erreur serveur.' });
    }
};
exports.archiverService = archiverService;
/**
 * GET /api/marketplace/services
 * Lister les services actifs (public, pas d'auth requise)
 * Query: ?categorie=X&q=searchterm&page=1&limit=20&tri=recent|populaire|note
 */
const listerServices = async (req, res) => {
    try {
        const { categorie, q, page = '1', limit = '20', tri = 'recent', } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;
        // --- Filtre de base : services actifs ---
        const filtre = { statut: 'actif' };
        if (categorie && CATEGORIES_VALIDES.includes(categorie)) {
            filtre.categorie = categorie;
        }
        if (q) {
            filtre.$text = { $search: q };
        }
        // --- Tri ---
        let sort = { dateCreation: -1 };
        if (tri === 'populaire') {
            sort = { 'statsCache.commandesRealisees': -1 };
        }
        else if (tri === 'note') {
            sort = { 'statsCache.noteGlobale': -1 };
        }
        // --- Requete paginee ---
        const [servicesRaw, total] = await Promise.all([
            MarketplaceService_js_1.default.find(filtre)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .populate('createur', 'prenom nom avatar dateCreation')
                .lean(),
            MarketplaceService_js_1.default.countDocuments(filtre),
        ]);
        // Formater chaque service pour le mobile
        const services = await Promise.all(servicesRaw.map((s) => (0, helpers_js_1.formatServicePourMobile)(s, [])));
        res.json({
            succes: true,
            data: {
                services,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error('[marketplace:services] Error:', error);
        res.status(500).json({ succes: false, message: 'Erreur serveur.' });
    }
};
exports.listerServices = listerServices;
/**
 * GET /api/marketplace/services/:id
 * Detail d'un service (public)
 */
const getService = async (req, res) => {
    try {
        const { id } = req.params;
        const service = await MarketplaceService_js_1.default.findById(id)
            .populate('createur', 'prenom nom avatar dateCreation');
        if (!service) {
            return res.status(404).json({
                succes: false,
                message: 'Service non trouve.',
            });
        }
        // Recuperer les 10 derniers avis
        const reviews = await MarketplaceReview_js_1.default.find({ service: id })
            .sort({ dateCreation: -1 })
            .limit(10)
            .populate('auteur', 'prenom nom avatar')
            .lean();
        // Formater pour le mobile
        const formattedService = await (0, helpers_js_1.formatServicePourMobile)(service, reviews);
        res.json({
            succes: true,
            data: { service: formattedService },
        });
    }
    catch (error) {
        console.error('[marketplace:services] Error:', error);
        res.status(500).json({ succes: false, message: 'Erreur serveur.' });
    }
};
exports.getService = getService;
/**
 * GET /api/marketplace/mes-services
 * Liste des services de l'entrepreneur connecte (tous statuts)
 */
const getMesServices = async (req, res) => {
    try {
        const services = await MarketplaceService_js_1.default.find({
            createur: req.utilisateur._id,
        }).sort({ dateCreation: -1 }).lean();
        res.json({
            succes: true,
            data: { services },
        });
    }
    catch (error) {
        console.error('[marketplace:services] Error:', error);
        res.status(500).json({ succes: false, message: 'Erreur serveur.' });
    }
};
exports.getMesServices = getMesServices;
//# sourceMappingURL=services.js.map