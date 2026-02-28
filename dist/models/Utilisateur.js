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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PERMISSIONS = exports.ROLE_HIERARCHY = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const validators_js_1 = require("../utils/validators.js");
// Hiérarchie des rôles (niveau de pouvoir)
// 'admin' legacy est au même niveau que 'admin_modo'
exports.ROLE_HIERARCHY = {
    user: 0,
    modo_test: 1,
    modo: 2,
    admin_modo: 3,
    admin: 3, // Legacy: même niveau que admin_modo
    super_admin: 4,
};
// Permissions par défaut selon le rôle
// Note: 'admin' legacy a les mêmes permissions que 'admin_modo'
exports.DEFAULT_PERMISSIONS = {
    user: [],
    modo_test: ['reports:view', 'tickets:view', 'staff:chat'],
    modo: [
        'reports:view', 'reports:process', 'reports:escalate',
        'users:view', 'users:warn', 'users:suspend', 'users:ban',
        'content:hide', 'staff:chat',
        'tickets:view', 'tickets:respond',
        'marketplace:view',
    ],
    admin_modo: [
        'reports:view', 'reports:process', 'reports:escalate',
        'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban', 'users:edit_roles',
        'content:hide', 'content:delete', 'content:edit',
        'audit:view', 'staff:chat',
        'tickets:view', 'tickets:respond',
        'marketplace:view', 'marketplace:manage_disputes',
    ],
    admin: [
        'reports:view', 'reports:process', 'reports:escalate',
        'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban', 'users:edit_roles',
        'content:hide', 'content:delete', 'content:edit',
        'audit:view', 'staff:chat',
        'tickets:view', 'tickets:respond',
        'marketplace:view', 'marketplace:manage_disputes',
    ],
    super_admin: [
        'reports:view', 'reports:process', 'reports:escalate',
        'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban', 'users:edit_roles',
        'content:hide', 'content:delete', 'content:edit',
        'audit:view', 'audit:export',
        'config:view', 'config:edit',
        'staff:chat',
        'tickets:view', 'tickets:respond',
        'marketplace:view', 'marketplace:manage_disputes',
    ],
};
// Schema Mongoose
const utilisateurSchema = new mongoose_1.Schema({
    prenom: {
        type: String,
        required: [true, 'Le prenom est requis'],
        trim: true,
        minlength: [2, 'Le prenom doit contenir au moins 2 caracteres'],
        maxlength: [50, 'Le prenom ne peut pas depasser 50 caracteres'],
    },
    nom: {
        type: String,
        required: [true, 'Le nom est requis'],
        trim: true,
        minlength: [2, 'Le nom doit contenir au moins 2 caracteres'],
        maxlength: [50, 'Le nom ne peut pas depasser 50 caracteres'],
    },
    email: {
        type: String,
        required: [true, 'L\'email est requis'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^[\w.+-]+@([\w-]+\.)+[a-zA-Z]{2,7}$/,
            'Veuillez fournir un email valide',
        ],
    },
    motDePasse: {
        type: String,
        minlength: [8, 'Le mot de passe doit contenir au moins 8 caracteres'],
        select: false, // Ne pas inclure par defaut dans les requetes
    },
    provider: {
        type: String,
        enum: ['local', 'google', 'facebook', 'apple'],
        default: 'local',
    },
    providerId: {
        type: String,
        default: undefined,
    },
    avatar: {
        type: String,
        default: null,
        validate: validators_js_1.urlValidator,
    },
    bio: {
        type: String,
        default: null,
        maxlength: [150, 'La bio ne peut pas depasser 150 caracteres'],
        trim: true,
    },
    role: {
        type: String,
        enum: ['user', 'modo_test', 'modo', 'admin_modo', 'super_admin'],
        default: 'user',
    },
    permissions: [{
            type: String,
            enum: [
                'reports:view', 'reports:process', 'reports:escalate',
                'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban', 'users:edit_roles',
                'content:hide', 'content:delete', 'content:edit',
                'audit:view', 'audit:export',
                'config:view', 'config:edit',
                'staff:chat',
            ],
        }],
    statut: {
        type: String,
        enum: ['visiteur', 'entrepreneur'],
        default: null,
    },
    cguAcceptees: {
        type: Boolean,
        required: [true, 'Vous devez accepter les CGU'],
        default: false,
    },
    profilPublic: {
        type: Boolean,
        default: true,
    },
    preferenceTheme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light',
    },
    // Onboarding interets (questionnaire decouvrir)
    onboardingInterets: {
        categories: [{
                type: String,
                enum: ['tech', 'food', 'sante', 'education', 'energie', 'culture', 'environnement', 'autre'],
            }],
        maturites: [{
                type: String,
                enum: ['idee', 'prototype', 'lancement', 'croissance'],
            }],
        completedAt: {
            type: Date,
            default: null,
        },
    },
    // Verification email
    emailVerifie: {
        type: Boolean,
        default: false,
    },
    codeVerification: {
        type: String,
        select: false,
    },
    codeVerificationExpire: {
        type: Date,
        select: false,
    },
    // Système d'amis
    amis: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Utilisateur',
        }],
    demandesAmisRecues: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Utilisateur',
        }],
    demandesAmisEnvoyees: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Utilisateur',
        }],
    // Champs de modération
    suspendedUntil: {
        type: Date,
        default: null,
    },
    suspendReason: {
        type: String,
        maxlength: [500, 'La raison de la suspension ne peut pas dépasser 500 caractères'],
        default: null,
    },
    bannedAt: {
        type: Date,
        default: null,
    },
    banReason: {
        type: String,
        maxlength: [500, 'La raison du ban ne peut pas dépasser 500 caractères'],
        default: null,
    },
    warnings: [{
            reason: {
                type: String,
                required: true,
                maxlength: [500, 'La raison ne peut pas dépasser 500 caractères'],
            },
            note: {
                type: String,
                maxlength: [500, 'La note ne peut pas dépasser 500 caractères'],
                default: null,
            },
            issuedBy: {
                type: mongoose_1.Schema.Types.Mixed, // ObjectId ou 'system'
                required: true,
            },
            issuedAt: {
                type: Date,
                default: Date.now,
            },
            expiresAt: {
                type: Date,
                default: null,
            },
            source: {
                type: String,
                enum: ['mobile', 'moderation', 'api', 'system'],
                default: 'moderation',
            },
        }],
    // Tracking pour le systeme de sanctions automatiques
    moderation: {
        status: {
            type: String,
            enum: ['active', 'suspended', 'banned'],
            default: 'active',
        },
        warnCountSinceLastAutoSuspension: {
            type: Number,
            default: 0,
            min: 0,
        },
        autoSuspensionsCount: {
            type: Number,
            default: 0,
            min: 0,
            max: 1, // 0 ou 1 seulement
        },
        lastAutoActionAt: {
            type: Date,
            default: null,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    // Abonnement LPP+
    lppPlus: {
        status: {
            type: String,
            enum: ['inactive', 'active', 'canceled'],
            default: 'inactive',
        },
        startedAt: {
            type: Date,
            default: null,
        },
        currentPeriodEnd: {
            type: Date,
            default: null,
        },
        cancelAtPeriodEnd: {
            type: Boolean,
            default: false,
        },
        canceledAt: {
            type: Date,
            default: null,
        },
        renewalCount: {
            type: Number,
            default: 0,
        },
    },
    // Surveillance
    surveillance: {
        active: {
            type: Boolean,
            default: false,
            index: true,
        },
        reason: {
            type: String,
            maxlength: [500, 'La raison ne peut pas dépasser 500 caractères'],
            default: null,
        },
        addedBy: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Utilisateur',
            default: null,
        },
        addedAt: {
            type: Date,
            default: null,
        },
        notes: [{
                content: {
                    type: String,
                    required: true,
                    maxlength: [500, 'La note ne peut pas dépasser 500 caractères'],
                },
                author: {
                    type: mongoose_1.Schema.Types.ObjectId,
                    ref: 'Utilisateur',
                    required: true,
                },
                date: {
                    type: Date,
                    default: Date.now,
                },
            }],
    },
}, {
    timestamps: {
        createdAt: 'dateCreation',
        updatedAt: 'dateMiseAJour',
    },
});
// Index compose pour OAuth — uniquement pour les documents qui ONT un providerId
utilisateurSchema.index({ provider: 1, providerId: 1 }, {
    unique: true,
    partialFilterExpression: { providerId: { $exists: true, $ne: null } },
});
// Index pour les requêtes de modération
utilisateurSchema.index({ role: 1 }); // Filtrer par rôle
utilisateurSchema.index({ bannedAt: 1 }, { sparse: true }); // Utilisateurs bannis
utilisateurSchema.index({ suspendedUntil: 1 }, { sparse: true }); // Utilisateurs suspendus
// Middleware pre-save pour hasher le mot de passe
utilisateurSchema.pre('save', async function (next) {
    // Ne hasher que si le mot de passe a ete modifie
    if (!this.isModified('motDePasse') || !this.motDePasse) {
        return next();
    }
    try {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.motDePasse = await bcryptjs_1.default.hash(this.motDePasse, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Middleware pre-save pour garantir l'exclusivité ami/demande
// Un utilisateur ne peut pas être à la fois ami ET dans les demandes
utilisateurSchema.pre('save', function (next) {
    if (this.amis && this.amis.length > 0) {
        const amisIds = new Set(this.amis.map((id) => id.toString()));
        // Retirer des demandes reçues les utilisateurs qui sont déjà amis
        if (this.demandesAmisRecues) {
            this.demandesAmisRecues = this.demandesAmisRecues.filter((id) => !amisIds.has(id.toString()));
        }
        // Retirer des demandes envoyées les utilisateurs qui sont déjà amis
        if (this.demandesAmisEnvoyees) {
            this.demandesAmisEnvoyees = this.demandesAmisEnvoyees.filter((id) => !amisIds.has(id.toString()));
        }
    }
    next();
});
// Middleware pre-save pour synchroniser le statut de moderation
// Le champ moderation.status est toujours synchronise avec l'etat reel
utilisateurSchema.pre('save', function (next) {
    // Initialiser l'objet moderation si necessaire
    if (!this.moderation) {
        this.moderation = {
            status: 'active',
            warnCountSinceLastAutoSuspension: 0,
            autoSuspensionsCount: 0,
            updatedAt: new Date(),
        };
    }
    // Synchroniser le statut avec l'etat reel
    if (this.bannedAt !== null && this.bannedAt !== undefined) {
        this.moderation.status = 'banned';
    }
    else if (this.suspendedUntil && new Date(this.suspendedUntil) > new Date()) {
        this.moderation.status = 'suspended';
    }
    else {
        this.moderation.status = 'active';
    }
    // Mettre a jour la date de modification
    if (this.isModified('moderation') || this.isModified('bannedAt') || this.isModified('suspendedUntil')) {
        this.moderation.updatedAt = new Date();
    }
    next();
});
// Methode pour comparer les mots de passe
utilisateurSchema.methods.comparerMotDePasse = async function (motDePasseCandidat) {
    if (!this.motDePasse)
        return false;
    return bcryptjs_1.default.compare(motDePasseCandidat, this.motDePasse);
};
// Methode pour verifier si l'utilisateur est admin (rétrocompatibilité)
// Retourne true pour super_admin, admin_modo, et 'admin' legacy
utilisateurSchema.methods.isAdmin = function () {
    return this.role === 'super_admin' || this.role === 'admin_modo' || this.role === 'admin';
};
// Méthode pour vérifier si l'utilisateur fait partie du staff (modo ou plus)
// Inclut le rôle legacy 'admin'
utilisateurSchema.methods.isStaff = function () {
    const roleLevel = exports.ROLE_HIERARCHY[this.role];
    // Si le rôle n'est pas reconnu, retourner false
    if (roleLevel === undefined)
        return false;
    return roleLevel >= exports.ROLE_HIERARCHY.modo_test;
};
// Méthode pour vérifier si l'utilisateur est banni
utilisateurSchema.methods.isBanned = function () {
    return this.bannedAt !== null && this.bannedAt !== undefined;
};
// Méthode pour vérifier si l'utilisateur est suspendu (suspension active)
utilisateurSchema.methods.isSuspended = function () {
    if (!this.suspendedUntil)
        return false;
    return new Date() < new Date(this.suspendedUntil);
};
// Méthode pour obtenir le niveau de rôle
// Gère le rôle legacy 'admin' (traité comme admin_modo)
utilisateurSchema.methods.getRoleLevel = function () {
    return exports.ROLE_HIERARCHY[this.role] ?? 0;
};
// Méthode pour obtenir toutes les permissions effectives (rôle + override)
// Gère le rôle legacy 'admin' (traité comme admin_modo)
utilisateurSchema.methods.getEffectivePermissions = function () {
    const rolePermissions = exports.DEFAULT_PERMISSIONS[this.role] || [];
    const userPermissions = this.permissions || [];
    // Fusionner et dédupliquer
    return [...new Set([...rolePermissions, ...userPermissions])];
};
// Méthode pour vérifier si l'utilisateur a une permission spécifique
utilisateurSchema.methods.hasPermission = function (permission) {
    // Un utilisateur banni ou suspendu n'a aucune permission staff
    if (this.isBanned() || this.isSuspended()) {
        return false;
    }
    const effectivePermissions = this.getEffectivePermissions();
    return effectivePermissions.includes(permission);
};
// Méthode pour obtenir le statut de moderation actuel
utilisateurSchema.methods.getModerationStatus = function () {
    if (this.isBanned())
        return 'banned';
    if (this.isSuspended())
        return 'suspended';
    return 'active';
};
// Méthode pour calculer le nombre de warnings avant la prochaine sanction automatique
// Retourne un nombre entre 0 et 3
utilisateurSchema.methods.getWarningsBeforeNextSanction = function () {
    const warnCount = this.moderation?.warnCountSinceLastAutoSuspension || 0;
    return Math.max(0, 3 - warnCount);
};
// Methode pour transformer en JSON (retirer le mot de passe et données sensibles)
utilisateurSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.motDePasse;
    // Ajouter isVerified calculé depuis lppPlus
    obj.isVerified = obj.lppPlus?.status === 'active';
    return obj;
};
const Utilisateur = mongoose_1.default.model('Utilisateur', utilisateurSchema);
exports.default = Utilisateur;
//# sourceMappingURL=Utilisateur.js.map