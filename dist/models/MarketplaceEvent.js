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
/**
 * Evenements analytics marketplace
 * TTL: auto-suppression apres 90 jours
 */
const marketplaceEventSchema = new mongoose_1.Schema({
    service: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'MarketplaceService',
        required: [true, "Le service est requis"],
        index: true,
    },
    type: {
        type: String,
        enum: {
            values: ['view', 'contact', 'order'],
            message: "Type d'evenement invalide: {VALUE}",
        },
        required: [true, "Le type est requis"],
        index: true,
    },
    utilisateur: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        default: null,
    },
    date: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: false,
});
// TTL: auto-suppression apres 90 jours
marketplaceEventSchema.index({ date: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
// Index composite pour aggregation trending
marketplaceEventSchema.index({ service: 1, type: 1, date: -1 });
// Index pour debounce (1 vue/user/service/heure)
marketplaceEventSchema.index({ service: 1, utilisateur: 1, type: 1, date: -1 });
const MarketplaceEvent = mongoose_1.default.model('MarketplaceEvent', marketplaceEventSchema);
exports.default = MarketplaceEvent;
