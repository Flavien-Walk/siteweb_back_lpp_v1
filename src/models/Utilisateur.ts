import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { urlValidator } from '../utils/validators.js';

// Types pour les providers OAuth
export type ProviderOAuth = 'local' | 'google' | 'facebook' | 'apple';

// Types pour les rôles (hiérarchie : super_admin > admin_modo > modo > modo_test > user)
// Note: 'admin' est un rôle legacy qui sera traité comme 'admin_modo'
export type Role = 'user' | 'modo_test' | 'modo' | 'admin_modo' | 'super_admin';
export type RoleWithLegacy = Role | 'admin'; // Inclut le rôle legacy pour la rétrocompatibilité

// Hiérarchie des rôles (niveau de pouvoir)
// 'admin' legacy est au même niveau que 'admin_modo'
export const ROLE_HIERARCHY: Record<RoleWithLegacy, number> = {
  user: 0,
  modo_test: 1,
  modo: 2,
  admin_modo: 3,
  admin: 3, // Legacy: même niveau que admin_modo
  super_admin: 4,
};

// Permissions granulaires du système
export type Permission =
  | 'reports:view'
  | 'reports:process'
  | 'reports:escalate'
  | 'users:view'
  | 'users:warn'
  | 'users:suspend'
  | 'users:ban'
  | 'users:unban'
  | 'users:edit_roles'
  | 'content:hide'
  | 'content:delete'
  | 'audit:view'
  | 'audit:export'
  | 'content:edit'
  | 'config:view'
  | 'config:edit'
  | 'staff:chat'
  | 'tickets:view'
  | 'tickets:respond';

// Permissions par défaut selon le rôle
// Note: 'admin' legacy a les mêmes permissions que 'admin_modo'
export const DEFAULT_PERMISSIONS: Record<RoleWithLegacy, Permission[]> = {
  user: [],
  modo_test: ['reports:view', 'tickets:view'],
  modo: ['reports:view', 'reports:process', 'users:view', 'users:warn', 'content:hide', 'staff:chat', 'tickets:view', 'tickets:respond'],
  admin_modo: [
    'reports:view', 'reports:process', 'reports:escalate',
    'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban',
    'content:hide', 'content:delete', 'content:edit',
    'audit:view', 'staff:chat',
    'tickets:view', 'tickets:respond',
  ],
  admin: [ // Legacy: mêmes permissions que admin_modo
    'reports:view', 'reports:process', 'reports:escalate',
    'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban',
    'content:hide', 'content:delete', 'content:edit',
    'audit:view', 'staff:chat',
    'tickets:view', 'tickets:respond',
  ],
  super_admin: [
    'reports:view', 'reports:process', 'reports:escalate',
    'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban', 'users:edit_roles',
    'content:hide', 'content:delete', 'content:edit',
    'audit:view', 'audit:export',
    'config:view', 'config:edit',
    'staff:chat',
    'tickets:view', 'tickets:respond',
  ],
};

// Interface pour les avertissements
export interface IWarning {
  _id?: mongoose.Types.ObjectId;
  reason: string;
  note?: string; // Note interne du moderateur
  issuedBy: mongoose.Types.ObjectId | 'system';
  issuedAt: Date;
  expiresAt?: Date; // null = permanent
  source?: 'mobile' | 'moderation' | 'api' | 'system';
}

// Types pour le statut de moderation
export type ModerationStatus = 'active' | 'suspended' | 'banned';

// Interface pour le tracking de moderation automatique
export interface IModerationTracking {
  status: ModerationStatus;
  warnCountSinceLastAutoSuspension: number;
  autoSuspensionsCount: number; // 0 ou 1 (premiere auto-suspension)
  lastAutoActionAt?: Date;
  updatedAt: Date;
}

// Types pour le statut utilisateur
export type StatutUtilisateur = 'visiteur' | 'entrepreneur';

// Interface pour le document Utilisateur
export interface IUtilisateur extends Document {
  _id: mongoose.Types.ObjectId;
  prenom: string;
  nom: string;
  email: string;
  motDePasse?: string;
  provider: ProviderOAuth;
  providerId?: string;
  avatar?: string;
  bio?: string;
  role: Role;
  permissions: Permission[]; // Permissions supplémentaires (override du rôle)
  statut?: StatutUtilisateur;
  cguAcceptees: boolean;
  profilPublic: boolean;
  // Système d'amis
  amis: mongoose.Types.ObjectId[];
  demandesAmisRecues: mongoose.Types.ObjectId[];
  demandesAmisEnvoyees: mongoose.Types.ObjectId[];
  // Champs de modération
  suspendedUntil?: Date | null;
  suspendReason?: string;
  bannedAt?: Date | null;
  banReason?: string;
  warnings: IWarning[];
  // Tracking pour le systeme de sanctions automatiques
  moderation: IModerationTracking;
  // Surveillance
  surveillance: {
    active: boolean;
    reason?: string;
    addedBy?: mongoose.Types.ObjectId;
    addedAt?: Date;
    notes: { content: string; author: mongoose.Types.ObjectId; date: Date }[];
  };
  // Timestamps
  dateCreation: Date;
  dateMiseAJour: Date;
  // Méthodes
  comparerMotDePasse(motDePasseCandidat: string): Promise<boolean>;
  isAdmin(): boolean;
  isStaff(): boolean;
  isBanned(): boolean;
  isSuspended(): boolean;
  hasPermission(permission: Permission): boolean;
  getEffectivePermissions(): Permission[];
  getRoleLevel(): number;
  getModerationStatus(): ModerationStatus;
  getWarningsBeforeNextSanction(): number;
}

// Schema Mongoose
const utilisateurSchema = new Schema<IUtilisateur>(
  {
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
      validate: urlValidator,
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
    // Système d'amis
    amis: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
    demandesAmisRecues: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
    demandesAmisEnvoyees: [{
      type: Schema.Types.ObjectId,
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
        type: Schema.Types.Mixed, // ObjectId ou 'system'
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
        type: Schema.Types.ObjectId,
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
          type: Schema.Types.ObjectId,
          ref: 'Utilisateur',
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      }],
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// Index compose pour OAuth — uniquement pour les documents qui ONT un providerId
utilisateurSchema.index(
  { provider: 1, providerId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerId: { $exists: true, $ne: null } },
  }
);

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
    const salt = await bcrypt.genSalt(12);
    this.motDePasse = await bcrypt.hash(this.motDePasse, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Middleware pre-save pour garantir l'exclusivité ami/demande
// Un utilisateur ne peut pas être à la fois ami ET dans les demandes
utilisateurSchema.pre('save', function (next) {
  if (this.amis && this.amis.length > 0) {
    const amisIds = new Set(this.amis.map((id) => id.toString()));

    // Retirer des demandes reçues les utilisateurs qui sont déjà amis
    if (this.demandesAmisRecues) {
      this.demandesAmisRecues = this.demandesAmisRecues.filter(
        (id) => !amisIds.has(id.toString())
      );
    }

    // Retirer des demandes envoyées les utilisateurs qui sont déjà amis
    if (this.demandesAmisEnvoyees) {
      this.demandesAmisEnvoyees = this.demandesAmisEnvoyees.filter(
        (id) => !amisIds.has(id.toString())
      );
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
  } else if (this.suspendedUntil && new Date(this.suspendedUntil) > new Date()) {
    this.moderation.status = 'suspended';
  } else {
    this.moderation.status = 'active';
  }

  // Mettre a jour la date de modification
  if (this.isModified('moderation') || this.isModified('bannedAt') || this.isModified('suspendedUntil')) {
    this.moderation.updatedAt = new Date();
  }

  next();
});

// Methode pour comparer les mots de passe
utilisateurSchema.methods.comparerMotDePasse = async function (
  motDePasseCandidat: string
): Promise<boolean> {
  if (!this.motDePasse) return false;
  return bcrypt.compare(motDePasseCandidat, this.motDePasse);
};

// Methode pour verifier si l'utilisateur est admin (rétrocompatibilité)
// Retourne true pour super_admin, admin_modo, et 'admin' legacy
utilisateurSchema.methods.isAdmin = function (): boolean {
  return this.role === 'super_admin' || this.role === 'admin_modo' || this.role === 'admin';
};

// Méthode pour vérifier si l'utilisateur fait partie du staff (modo ou plus)
// Inclut le rôle legacy 'admin'
utilisateurSchema.methods.isStaff = function (): boolean {
  const roleLevel = ROLE_HIERARCHY[this.role as RoleWithLegacy];
  // Si le rôle n'est pas reconnu, retourner false
  if (roleLevel === undefined) return false;
  return roleLevel >= ROLE_HIERARCHY.modo_test;
};

// Méthode pour vérifier si l'utilisateur est banni
utilisateurSchema.methods.isBanned = function (): boolean {
  return this.bannedAt !== null && this.bannedAt !== undefined;
};

// Méthode pour vérifier si l'utilisateur est suspendu (suspension active)
utilisateurSchema.methods.isSuspended = function (): boolean {
  if (!this.suspendedUntil) return false;
  return new Date() < new Date(this.suspendedUntil);
};

// Méthode pour obtenir le niveau de rôle
// Gère le rôle legacy 'admin' (traité comme admin_modo)
utilisateurSchema.methods.getRoleLevel = function (): number {
  return ROLE_HIERARCHY[this.role as RoleWithLegacy] ?? 0;
};

// Méthode pour obtenir toutes les permissions effectives (rôle + override)
// Gère le rôle legacy 'admin' (traité comme admin_modo)
utilisateurSchema.methods.getEffectivePermissions = function (): Permission[] {
  const rolePermissions = DEFAULT_PERMISSIONS[this.role as RoleWithLegacy] || [];
  const userPermissions = this.permissions || [];
  // Fusionner et dédupliquer
  return [...new Set([...rolePermissions, ...userPermissions])] as Permission[];
};

// Méthode pour vérifier si l'utilisateur a une permission spécifique
utilisateurSchema.methods.hasPermission = function (permission: Permission): boolean {
  // Un utilisateur banni ou suspendu n'a aucune permission staff
  if (this.isBanned() || this.isSuspended()) {
    return false;
  }
  const effectivePermissions = this.getEffectivePermissions();
  return effectivePermissions.includes(permission);
};

// Méthode pour obtenir le statut de moderation actuel
utilisateurSchema.methods.getModerationStatus = function (): ModerationStatus {
  if (this.isBanned()) return 'banned';
  if (this.isSuspended()) return 'suspended';
  return 'active';
};

// Méthode pour calculer le nombre de warnings avant la prochaine sanction automatique
// Retourne un nombre entre 0 et 3
utilisateurSchema.methods.getWarningsBeforeNextSanction = function (): number {
  const warnCount = this.moderation?.warnCountSinceLastAutoSuspension || 0;
  return Math.max(0, 3 - warnCount);
};

// Methode pour transformer en JSON (retirer le mot de passe et données sensibles)
utilisateurSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.motDePasse;
  return obj;
};

const Utilisateur = mongoose.model<IUtilisateur>('Utilisateur', utilisateurSchema);

export default Utilisateur;