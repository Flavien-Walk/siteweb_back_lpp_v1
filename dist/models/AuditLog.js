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
const auditLogSchema = new mongoose_1.Schema({
    // EventId pour idempotency - si fourni, empeche les doublons
    // L'index unique sparse est defini plus bas via schema.index()
    eventId: {
        type: mongoose_1.Schema.Types.ObjectId,
    },
    actor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: [true, "L'acteur est requis"],
        index: true,
    },
    actorRole: {
        type: String,
        required: true,
    },
    actorIp: {
        type: String,
    },
    action: {
        type: String,
        enum: [
            'user:warn', 'user:warn_remove', 'user:suspend', 'user:unsuspend',
            'user:ban', 'user:unban', 'user:role_change',
            'user:permission_add', 'user:permission_remove',
            'content:hide', 'content:unhide', 'content:delete', 'content:restore', 'content:edit',
            'user:surveillance_on', 'user:surveillance_off',
            'report:process', 'report:escalate', 'report:dismiss', 'report:assign',
            'config:update',
            'staff:login', 'staff:logout',
            'marketplace:resolve_dispute',
            'marketplace:mediation_message',
        ],
        required: [true, "L'action est requise"],
        index: true,
    },
    targetType: {
        type: String,
        enum: ['utilisateur', 'publication', 'commentaire', 'message', 'story', 'live', 'projet', 'report', 'config', 'system', 'commande'],
        required: [true, 'Le type de cible est requis'],
        index: true,
    },
    targetId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: [true, "L'ID de la cible est requis"],
        index: true,
    },
    reason: {
        type: String,
        maxlength: [1000, 'La raison ne peut pas dépasser 1000 caractères'],
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    snapshot: {
        before: mongoose_1.Schema.Types.Mixed,
        after: mongoose_1.Schema.Types.Mixed,
    },
    relatedReport: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Report',
        index: true,
    },
    source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'system'],
        default: 'web',
        index: true,
    },
}, {
    timestamps: {
        createdAt: 'dateCreation',
        updatedAt: false, // Pas de mise à jour, les logs sont immuables
    },
});
// Index composé pour les requêtes courantes
auditLogSchema.index({ dateCreation: -1 }); // Tri par date
auditLogSchema.index({ actor: 1, dateCreation: -1 }); // Actions d'un modérateur
auditLogSchema.index({ targetType: 1, targetId: 1, dateCreation: -1 }); // Historique d'une cible
auditLogSchema.index({ action: 1, dateCreation: -1 }); // Filtrer par type d'action
// Index unique sur eventId pour idempotency (sparse = ignore les docs sans eventId)
auditLogSchema.index({ eventId: 1 }, { unique: true, sparse: true });
// TTL optionnel - conserver les logs 2 ans (commenté par défaut)
// auditLogSchema.index({ dateCreation: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });
/**
 * Méthode statique pour créer un log facilement
 */
auditLogSchema.statics.logAction = async function (params) {
    const log = new this(params);
    await log.save();
    return log;
};
const AuditLog = mongoose_1.default.model('AuditLog', auditLogSchema);
exports.default = AuditLog;
//# sourceMappingURL=AuditLog.js.map