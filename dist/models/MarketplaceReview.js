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
const mongoose_1 = __importStar(require("mongoose"));
const marketplaceReviewSchema = new mongoose_1.Schema({
    service: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'MarketplaceService',
        required: [true, "Le service est requis"],
        index: true,
    },
    commande: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'MarketplaceOrder',
        required: [true, "La commande est requise"],
        unique: true,
    },
    auteur: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: [true, "L'auteur est requis"],
    },
    note: {
        type: Number,
        required: [true, "La note est requise"],
        min: [1, "La note minimum est 1"],
        max: [5, "La note maximum est 5"],
    },
    commentaire: {
        type: String,
        required: [true, "Le commentaire est requis"],
        trim: true,
        minlength: [10, "Le commentaire doit contenir au moins 10 caracteres"],
        maxlength: [1000, "Le commentaire ne peut pas depasser 1000 caracteres"],
    },
}, {
    timestamps: {
        createdAt: 'dateCreation',
        updatedAt: 'dateMiseAJour',
    },
});
// Index pour lister les avis d'un service
marketplaceReviewSchema.index({ service: 1, dateCreation: -1 });
// Index pour verifier unicite review par auteur + commande
marketplaceReviewSchema.index({ auteur: 1, commande: 1 });
const MarketplaceReview = mongoose_1.default.model('MarketplaceReview', marketplaceReviewSchema);
exports.default = MarketplaceReview;
