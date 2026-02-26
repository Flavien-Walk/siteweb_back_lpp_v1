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
exports.QUI_PEUT_TRANSITIONNER = exports.TRANSITIONS_AUTORISEES = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.TRANSITIONS_AUTORISEES = {
    en_attente: ['paye', 'annule'],
    paye: ['en_cours', 'annule'],
    en_cours: ['livre', 'litige'],
    livre: ['termine', 'litige'],
    termine: [],
    annule: [],
    litige: ['en_cours', 'annule'],
};
exports.QUI_PEUT_TRANSITIONNER = {
    paye: 'acheteur',
    en_cours: 'vendeur',
    livre: 'vendeur',
    termine: 'acheteur',
    annule: 'les_deux',
    litige: 'les_deux',
};
const marketplaceOrderSchema = new mongoose_1.Schema({
    service: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MarketplaceService', required: true },
    acheteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    vendeur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    serviceSnapshot: {
        nom: { type: String, required: true },
        prix: { type: Number, default: null },
        devise: { type: String, default: 'EUR' },
    },
    optionsSelectionnees: [{ label: String, prix: Number, devise: { type: String, default: 'EUR' } }],
    montantTotal: { type: Number, required: true },
    devise: { type: String, default: 'EUR' },
    statut: { type: String, enum: ['en_attente', 'paye', 'en_cours', 'livre', 'termine', 'annule', 'litige'], default: 'en_attente' },
    historique: [{ de: String, vers: String, date: { type: Date, default: Date.now }, par: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur' }, commentaire: String }],
    aReview: { type: Boolean, default: false },
    conversationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Conversation' },
}, { timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' } });
marketplaceOrderSchema.index({ acheteur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ vendeur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ service: 1 });
const MarketplaceOrder = mongoose_1.default.model('MarketplaceOrder', marketplaceOrderSchema);
exports.default = MarketplaceOrder;
//# sourceMappingURL=MarketplaceOrder.js.map