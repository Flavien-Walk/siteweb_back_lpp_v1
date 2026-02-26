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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKETPLACE_CATEGORIES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Categories autorisees pour les services marketplace
 */
exports.MARKETPLACE_CATEGORIES = [
    'service', 'formation', 'produit', 'outil', 'accompagnement',
];
const optionSchema = new mongoose_1.Schema({
    label: {
        type: String,
        required: [true, "Le label de l'option est requis"],
        trim: true,
        maxlength: [80, "Le label ne peut pas depasser 80 caracteres"],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, "La description ne peut pas depasser 200 caracteres"],
        default: '',
    },
    prix: {
        type: Number,
        required: [true, "Le prix de l'option est requis"],
        min: [0, "Le prix ne peut pas etre negatif"],
    },
    devise: {
        type: String,
        default: 'EUR',
        enum: ['EUR'],
    },
}, { _id: true });
const faqSchema = new mongoose_1.Schema({
    question: {
        type: String,
        required: [true, "La question est requise"],
        trim: true,
        maxlength: [200, "La question ne peut pas depasser 200 caracteres"],
    },
    answer: {
        type: String,
        required: [true, "La reponse est requise"],
        trim: true,
        maxlength: [1000, "La reponse ne peut pas depasser 1000 caracteres"],
    },
}, { _id: false });
const marketplaceServiceSchema = new mongoose_1.Schema({
    createur: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: [true, "Le createur est requis"],
        index: true,
    },
    nom: {
        type: String,
        required: [true, "Le nom du service est requis"],
        trim: true,
        minlength: [5, "Le nom doit contenir au moins 5 caracteres"],
        maxlength: [100, "Le nom ne peut pas depasser 100 caracteres"],
    },
    description: {
        type: String,
        required: [true, "La description est requise"],
        trim: true,
        minlength: [20, "La description doit contenir au moins 20 caracteres"],
        maxlength: [200, "La description ne peut pas depasser 200 caracteres"],
    },
    descriptionLongue: {
        type: String,
        required: [true, "La description detaillee est requise"],
        trim: true,
        minlength: [50, "La description detaillee doit contenir au moins 50 caracteres"],
        maxlength: [5000, "La description detaillee ne peut pas depasser 5000 caracteres"],
    },
    categorie: {
        type: String,
        enum: {
            values: exports.MARKETPLACE_CATEGORIES,
            message: "Categorie invalide: {VALUE}",
        },
        required: [true, "La categorie est requise"],
        index: true,
    },
    prix: {
        type: Number,
        default: null,
        min: [0, "Le prix ne peut pas etre negatif"],
        max: [50000, "Le prix ne peut pas depasser 50000"],
    },
    devise: {
        type: String,
        default: 'EUR',
        enum: ['EUR'],
    },
    image: {
        type: String,
        required: [true, "L'image principale est requise"],
    },
    gallery: {
        type: [String],
        default: [],
        validate: {
            validator: function (v) { return v.length <= 5; },
            message: "La galerie ne peut pas contenir plus de 5 images",
        },
    },
    tags: {
        type: [String],
        default: [],
        validate: {
            validator: function (v) { return v.length <= 8; },
            message: "Maximum 8 tags autorises",
        },
    },
    delaiLivraison: {
        type: String,
        required: [true, "Le delai de livraison est requis"],
        trim: true,
        maxlength: [50, "Le delai ne peut pas depasser 50 caracteres"],
    },
    options: {
        type: [optionSchema],
        default: [],
        validate: {
            validator: function (v) { return v.length <= 10; },
            message: "Maximum 10 options autorisees",
        },
    },
    faq: {
        type: [faqSchema],
        default: [],
        validate: {
            validator: function (v) { return v.length <= 10; },
            message: "Maximum 10 questions FAQ autorisees",
        },
    },
    statut: {
        type: String,
        enum: {
            values: ['brouillon', 'actif', 'pause', 'archive'],
            message: "Statut invalide: {VALUE}",
        },
        default: 'actif',
        index: true,
    },
    statsCache: {
        noteGlobale: { type: Number, default: 0 },
        nombreAvis: { type: Number, default: 0 },
        commandesRealisees: { type: Number, default: 0 },
        vues: { type: Number, default: 0 },
    },
}, {
    timestamps: {
        createdAt: 'dateCreation',
        updatedAt: 'dateMiseAJour',
    },
});
// Index composites pour les requetes frequentes
marketplaceServiceSchema.index({ statut: 1, categorie: 1 });
marketplaceServiceSchema.index({ statut: 1, dateCreation: -1 });
marketplaceServiceSchema.index({ createur: 1, statut: 1 });
marketplaceServiceSchema.index({ tags: 1 });
// Index texte pour la recherche
marketplaceServiceSchema.index({ nom: 'text', description: 'text', tags: 'text' }, {
    weights: { nom: 10, tags: 5, description: 3 },
    name: 'marketplace_search',
});
const MarketplaceService = mongoose_1.default.model('MarketplaceService', marketplaceServiceSchema);
exports.default = MarketplaceService;
