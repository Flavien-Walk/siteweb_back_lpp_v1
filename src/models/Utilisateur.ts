import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { urlValidator } from '../utils/validators.js';

// Types pour les providers OAuth
export type ProviderOAuth = 'local' | 'google' | 'facebook' | 'apple';

// Types pour les rôles (hiérarchie : super_admin > admin_modo > modo > modo_test > user)
export type Role = 'user' | 'modo_test' | 'modo' | 'admin_modo' | 'super_admin';

// Hiérarchie des rôles (niveau de pouvoir)
export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  modo_test: 1,
  modo: 2,
  admin_modo: 3,
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
  | 'config:view'
  | 'config:edit'
  | 'staff:chat';

// Permissions par défaut selon le rôle
export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  modo_test: ['reports:view'],
  modo: ['reports:view', 'reports:process', 'users:view', 'users:warn', 'content:hide', 'staff:chat'],
  admin_modo: [
    'reports:view', 'reports:process', 'reports:escalate',
    'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban',
    'content:hide', 'content:delete',
    'audit:view', 'staff:chat',
  ],
  super_admin: [
    'reports:view', 'reports:process', 'reports:escalate',
    'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban', 'users:edit_roles',
    'content:hide', 'content:delete',
    'audit:view', 'audit:export',
    'config:view', 'config:edit',
    'staff:chat',
  ],
};

// Interface pour les avertissements
export interface IWarning {
  _id?: mongoose.Types.ObjectId;
  reason: string;
  issuedBy: mongoose.Types.ObjectId;
  issuedAt: Date;
  expiresAt?: Date; // null = permanent
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
  // Système d'amis
  amis: mongoose.Types.ObjectId[];
  demandesAmisRecues: mongoose.Types.ObjectId[];
  demandesAmisEnvoyees: mongoose.Types.ObjectId[];
  // Champs de modération
  suspendedUntil?: Date | null;
  bannedAt?: Date | null;
  banReason?: string;
  warnings: IWarning[];
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
        'content:hide', 'content:delete',
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
      issuedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Utilisateur',
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
    }],
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

// Methode pour comparer les mots de passe
utilisateurSchema.methods.comparerMotDePasse = async function (
  motDePasseCandidat: string
): Promise<boolean> {
  if (!this.motDePasse) return false;
  return bcrypt.compare(motDePasseCandidat, this.motDePasse);
};

// Methode pour verifier si l'utilisateur est admin (rétrocompatibilité)
// Retourne true pour super_admin et admin_modo
utilisateurSchema.methods.isAdmin = function (): boolean {
  return this.role === 'super_admin' || this.role === 'admin_modo';
};

// Méthode pour vérifier si l'utilisateur fait partie du staff (modo ou plus)
utilisateurSchema.methods.isStaff = function (): boolean {
  return ROLE_HIERARCHY[this.role as Role] >= ROLE_HIERARCHY.modo_test;
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
utilisateurSchema.methods.getRoleLevel = function (): number {
  return ROLE_HIERARCHY[this.role as Role] || 0;
};

// Méthode pour obtenir toutes les permissions effectives (rôle + override)
utilisateurSchema.methods.getEffectivePermissions = function (): Permission[] {
  const rolePermissions = DEFAULT_PERMISSIONS[this.role as Role] || [];
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

// Methode pour transformer en JSON (retirer le mot de passe et données sensibles)
utilisateurSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.motDePasse;
  return obj;
};

const Utilisateur = mongoose.model<IUtilisateur>('Utilisateur', utilisateurSchema);

export default Utilisateur;