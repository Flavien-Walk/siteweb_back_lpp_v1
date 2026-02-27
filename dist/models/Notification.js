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
const notificationSchema = new mongoose_1.Schema({
    destinataire: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
    },
    type: {
        type: String,
        enum: ['projet_cloture', 'annonce', 'live-rappel', 'interaction', 'demande_ami', 'ami_accepte', 'nouveau_commentaire', 'nouveau_like', 'like_commentaire', 'mention', 'sanction_ban', 'sanction_suspend', 'sanction_warn', 'sanction_unban', 'sanction_unsuspend', 'sanction_unwarn', 'moderation', 'project_follow', 'broadcast', 'support_reponse', 'commande_nouvelle', 'commande_acceptee', 'commande_refusee', 'commande_en_cours', 'commande_livree', 'commande_terminee', 'commande_annulee', 'commande_litige', 'commande_revision', 'commande_deadline_extended', 'commande_en_retard'],
        required: true,
    },
    titre: {
        type: String,
        required: true,
        maxlength: 200,
    },
    message: {
        type: String,
        required: true,
        maxlength: 500,
    },
    lien: {
        type: String,
    },
    data: {
        type: {
            userId: String,
            userNom: String,
            userPrenom: String,
            userAvatar: String,
            projetId: String,
            projetNom: String,
            publicationId: String,
            commentaireId: String,
            // Champs pour les sanctions
            sanctionType: { type: String, enum: ['ban', 'suspend', 'warn', 'unban', 'unsuspend', 'unwarn'] },
            reason: String,
            suspendedUntil: String,
            postId: String,
            postSnapshot: {
                contenu: String,
                mediaUrl: String,
            },
            actorId: String,
            actorRole: String,
            // EventId pour idempotency des sanctions (anti-doublon)
            eventId: String,
            // Champ pour les notifications broadcast
            broadcastBadge: { type: String, enum: ['actu', 'maintenance', 'mise_a_jour', 'evenement', 'important'] },
            broadcastId: String,
            // Champs pour les notifications support
            ticketId: String,
            ticketSubject: String,
            // Champs pour les notifications marketplace/commande
            commandeId: String,
            serviceNom: String,
        },
        default: null,
    },
    lue: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: {
        createdAt: 'dateCreation',
        updatedAt: 'dateMiseAJour',
    },
});
notificationSchema.index({ destinataire: 1, dateCreation: -1 });
notificationSchema.index({ destinataire: 1, lue: 1 });
notificationSchema.index({ destinataire: 1, lue: 1, dateCreation: -1 }); // Notifs non-lues triees
// Index unique partiel pour éviter les doublons de notifications demande_ami/ami_accepte
// Un utilisateur ne peut recevoir qu'une seule notification de chaque type par expéditeur
notificationSchema.index({ destinataire: 1, type: 1, 'data.userId': 1 }, {
    unique: true,
    partialFilterExpression: {
        type: { $in: ['demande_ami', 'ami_accepte'] },
        'data.userId': { $exists: true, $ne: null },
    },
});
// Index unique partiel pour éviter les doublons de notifications de sanctions
// Utilise eventId comme clé unique - si même eventId, c'est un doublon
notificationSchema.index({ 'data.eventId': 1 }, {
    unique: true,
    sparse: true,
    partialFilterExpression: {
        type: { $in: ['sanction_ban', 'sanction_suspend', 'sanction_warn', 'sanction_unban', 'sanction_unsuspend', 'sanction_unwarn'] },
        'data.eventId': { $exists: true, $ne: null },
    },
});
// Index unique partiel pour éviter les doublons de notifications project_follow
// Un membre de projet ne reçoit qu'une seule notification par follower par projet
notificationSchema.index({ destinataire: 1, type: 1, 'data.projetId': 1, 'data.userId': 1 }, {
    unique: true,
    partialFilterExpression: {
        type: 'project_follow',
        'data.projetId': { $exists: true, $ne: null },
        'data.userId': { $exists: true, $ne: null },
    },
});
// TTL: suppression automatique des notifications lues apres 90 jours (RGPD retention)
// Note: les notifications non-lues ne sont PAS concernees (partialFilterExpression)
notificationSchema.index({ dateCreation: 1 }, {
    expireAfterSeconds: 90 * 24 * 60 * 60, // 90 jours
    partialFilterExpression: { lue: true },
});
const Notification = mongoose_1.default.model('Notification', notificationSchema);
exports.default = Notification;
//# sourceMappingURL=Notification.js.map