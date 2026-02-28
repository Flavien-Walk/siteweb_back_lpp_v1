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
// ============ STATE MACHINE ============
exports.TRANSITIONS_AUTORISEES = {
    en_attente: ['acceptee', 'refusee', 'annule'],
    acceptee: ['en_cours', 'annule'],
    refusee: [],
    en_cours: ['livre', 'litige', 'annule'],
    livre: ['termine', 'en_cours', 'litige'],
    termine: [],
    annule: [],
    litige: ['en_cours', 'annule'],
};
/**
 * Qui peut effectuer chaque transition (cle = "de->vers")
 * vendeur / acheteur / les_deux
 */
exports.QUI_PEUT_TRANSITIONNER = {
    // Vendeur accepte / refuse
    'en_attente->acceptee': 'vendeur',
    'en_attente->refusee': 'vendeur',
    'en_attente->annule': 'les_deux',
    // Vendeur demarre
    'acceptee->en_cours': 'vendeur',
    'acceptee->annule': 'vendeur',
    // Vendeur livre
    'en_cours->livre': 'vendeur',
    'en_cours->litige': 'les_deux',
    'en_cours->annule': 'les_deux',
    // Acheteur valide ou demande revision
    'livre->termine': 'acheteur',
    'livre->en_cours': 'acheteur', // revision
    'livre->litige': 'les_deux',
    // Resolution litige
    'litige->en_cours': 'les_deux',
    'litige->annule': 'les_deux',
};
// ============ SCHEMA ============
const attachmentSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    name: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: 'application/octet-stream' },
}, { _id: false });
const deliverableSchema = new mongoose_1.Schema({
    type: { type: String, enum: ['message', 'file', 'link'], required: true },
    content: { type: String, required: true },
    file: {
        type: { url: String, name: String, size: Number, mimeType: String },
        default: undefined,
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
}, { _id: true });
const progressUpdateSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    message: { type: String, default: '' },
    percent: { type: Number, min: 0, max: 100, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
}, { _id: true });
const extensionSchema = new mongoose_1.Schema({
    requestedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    secondsAdded: { type: Number, required: true },
    reason: { type: String },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const deadlineHistorySchema = new mongoose_1.Schema({
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    reason: { type: String },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const mediationMessageSchema = new mongoose_1.Schema({
    canal: {
        type: String,
        enum: ['acheteur', 'vendeur'],
        required: true,
    },
    auteur: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
    },
    auteurRole: {
        type: String,
        enum: ['moderateur', 'acheteur', 'vendeur'],
        required: true,
    },
    contenu: {
        type: String,
        required: [true, 'Le contenu du message est requis'],
        maxlength: [2000, 'Le message ne peut pas depasser 2000 caracteres'],
        trim: true,
    },
    dateCreation: {
        type: Date,
        default: Date.now,
    },
    lu: {
        type: Boolean,
        default: false,
    },
}, { _id: true });
const marketplaceOrderSchema = new mongoose_1.Schema({
    service: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MarketplaceService', required: true },
    acheteur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    vendeur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    serviceSnapshot: {
        nom: { type: String, required: true },
        prix: { type: Number, default: null },
        devise: { type: String, default: 'EUR' },
        image: { type: String },
    },
    optionsSelectionnees: [{ label: String, prix: Number, devise: { type: String, default: 'EUR' } }],
    montantTotal: { type: Number, required: true },
    devise: { type: String, default: 'EUR' },
    statut: {
        type: String,
        enum: ['en_attente', 'acceptee', 'refusee', 'en_cours', 'livre', 'termine', 'annule', 'litige'],
        default: 'en_attente',
    },
    historique: [{
            de: String, vers: String,
            date: { type: Date, default: Date.now },
            par: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur' },
            commentaire: String,
        }],
    buyerBrief: {
        type: {
            message: { type: String, default: '' },
            attachments: { type: [attachmentSchema], default: [] },
            submittedAt: { type: Date, default: Date.now },
        },
        default: { message: '', attachments: [], submittedAt: new Date() },
    },
    deliverables: { type: [deliverableSchema], default: [] },
    progressUpdates: { type: [progressUpdateSchema], default: [] },
    aReview: { type: Boolean, default: false },
    conversationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Conversation' },
    // Revision settings (snapshot from service at accept)
    revisionSettings: {
        type: {
            accepteRevisions: { type: Boolean, default: true },
            revisionsIncluses: { type: Number, default: 2 },
        },
        default: { accepteRevisions: true, revisionsIncluses: 2 },
    },
    // Deadline
    acceptedAt: { type: Date },
    initialDeliverySeconds: { type: Number, default: 259200 }, // 3 jours
    currentDeadlineAt: { type: Date },
    isLate: { type: Boolean, default: false },
    lateSince: { type: Date },
    extensions: { type: [extensionSchema], default: [] },
    deadlineHistory: { type: [deadlineHistorySchema], default: [] },
    mediationMessages: { type: [mediationMessageSchema], default: [] },
}, { timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' } });
marketplaceOrderSchema.index({ acheteur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ vendeur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ service: 1 });
marketplaceOrderSchema.index({ statut: 1 });
const MarketplaceOrder = mongoose_1.default.model('MarketplaceOrder', marketplaceOrderSchema);
exports.default = MarketplaceOrder;
//# sourceMappingURL=MarketplaceOrder.js.map