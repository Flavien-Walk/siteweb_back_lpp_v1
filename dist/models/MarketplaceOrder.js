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
exports.TRANSITIONS_AUTORISEES = exports.QUI_PEUT_TRANSITIONNER = exports.ORDER_STATUTS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Statuts possibles d'une commande marketplace
 */
exports.ORDER_STATUTS = [
    'en_attente', 'paye', 'en_cours', 'livre', 'termine', 'annule', 'litige',
];
/**
 * Qui peut effectuer quelle transition
 * 'acheteur' | 'vendeur' | 'both' | 'staff'
 */
exports.QUI_PEUT_TRANSITIONNER = {
    'en_attente->paye': 'acheteur',
    'en_attente->annule': 'acheteur',
    'paye->en_cours': 'vendeur',
    'paye->annule': 'vendeur',
    'en_cours->livre': 'vendeur',
    'en_cours->litige': 'both',
    'livre->termine': 'acheteur',
    'livre->litige': 'acheteur',
    'litige->termine': 'staff',
    'litige->annule': 'staff',
};
/**
 * Transitions valides par statut
 */
exports.TRANSITIONS_AUTORISEES = {
    en_attente: ['paye', 'annule'],
    paye: ['en_cours', 'annule'],
    en_cours: ['livre', 'litige'],
    livre: ['termine', 'litige'],
    litige: ['termine', 'annule'],
    termine: [],
    annule: [],
};
const historiqueSchema = new mongoose_1.Schema({
    de: {
        type: String,
        enum: exports.ORDER_STATUTS,
        required: true,
    },
    vers: {
        type: String,
        enum: exports.ORDER_STATUTS,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    par: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
    },
    commentaire: {
        type: String,
        maxlength: [500, "Le commentaire ne peut pas depasser 500 caracteres"],
        default: null,
    },
}, { _id: false });
const marketplaceOrderSchema = new mongoose_1.Schema({
    service: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'MarketplaceService',
        required: [true, "Le service est requis"],
        index: true,
    },
    acheteur: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: [true, "L'acheteur est requis"],
        index: true,
    },
    vendeur: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: [true, "Le vendeur est requis"],
        index: true,
    },
    // Snapshot des infos service au moment de la commande
    serviceSnapshot: {
        nom: { type: String, required: true },
        prix: { type: Number, default: null },
        devise: { type: String, default: 'EUR' },
    },
    optionsSelectionnees: [{
        label: { type: String, required: true },
        prix: { type: Number, required: true },
        devise: { type: String, default: 'EUR' },
    }],
    montantTotal: {
        type: Number,
        required: [true, "Le montant total est requis"],
        min: [0, "Le montant ne peut pas etre negatif"],
    },
    devise: {
        type: String,
        default: 'EUR',
        enum: ['EUR'],
    },
    statut: {
        type: String,
        enum: {
            values: exports.ORDER_STATUTS,
            message: "Statut invalide: {VALUE}",
        },
        default: 'en_attente',
        index: true,
    },
    historique: {
        type: [historiqueSchema],
        default: [],
    },
    aReview: {
        type: Boolean,
        default: false,
    },
    conversationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Conversation',
        default: null,
    },
}, {
    timestamps: {
        createdAt: 'dateCreation',
        updatedAt: 'dateMiseAJour',
    },
});
// Index composites
marketplaceOrderSchema.index({ acheteur: 1, statut: 1 });
marketplaceOrderSchema.index({ vendeur: 1, statut: 1 });
marketplaceOrderSchema.index({ service: 1, statut: 1 });
marketplaceOrderSchema.index({ acheteur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ vendeur: 1, dateCreation: -1 });
const MarketplaceOrder = mongoose_1.default.model('MarketplaceOrder', marketplaceOrderSchema);
exports.default = MarketplaceOrder;
