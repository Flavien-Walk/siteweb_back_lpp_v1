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
const marketplaceServiceSchema = new mongoose_1.Schema({
    createur: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
    nom: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 200 },
    descriptionLongue: { type: String, required: true, trim: true, minlength: 50, maxlength: 5000 },
    categorie: { type: String, required: true, enum: ['service', 'formation', 'produit', 'outil', 'accompagnement'] },
    prix: { type: Number, default: null },
    devise: { type: String, default: 'EUR' },
    image: { type: String, required: true },
    gallery: { type: [String], default: [], validate: [(v) => v.length <= 5, 'Maximum 5 images'] },
    tags: { type: [String], default: [], validate: [(v) => v.length <= 8, 'Maximum 8 tags'] },
    delaiLivraison: { type: String, required: true },
    accepteRevisions: { type: Boolean, default: true },
    revisionsIncluses: { type: Number, default: 2, min: 0, max: 10 },
    options: { type: [{ label: String, description: String, prix: Number, devise: { type: String, default: 'EUR' } }], default: [], validate: [(v) => v.length <= 10, 'Maximum 10 options'] },
    faq: { type: [{ question: String, answer: String }], default: [] },
    statut: { type: String, enum: ['brouillon', 'actif', 'pause', 'archive'], default: 'actif' },
    statsCache: {
        type: {
            noteGlobale: { type: Number, default: 0 },
            nombreAvis: { type: Number, default: 0 },
            commandesRealisees: { type: Number, default: 0 },
            vues: { type: Number, default: 0 },
        },
        default: { noteGlobale: 0, nombreAvis: 0, commandesRealisees: 0, vues: 0 },
    },
}, { timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' } });
marketplaceServiceSchema.index({ statut: 1, categorie: 1 });
marketplaceServiceSchema.index({ statut: 1, dateCreation: -1 });
marketplaceServiceSchema.index({ nom: 'text', description: 'text', tags: 'text' });
const MarketplaceService = mongoose_1.default.model('MarketplaceService', marketplaceServiceSchema);
exports.default = MarketplaceService;
//# sourceMappingURL=MarketplaceService.js.map