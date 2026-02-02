import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Types
export type ProviderOAuth = 'local' | 'google' | 'facebook' | 'apple';
export type UserRole = 'user' | 'modo_test' | 'modo' | 'admin_modo' | 'super_admin' | 'admin';

// Hiérarchie des rôles (pour comparaison)
export const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  modo_test: 1,
  modo: 2,
  admin_modo: 3,
  admin: 3, // Legacy, équivalent à admin_modo
  super_admin: 4,
};

// Interface Warning
export interface IWarning {
  _id?: mongoose.Types.ObjectId;
  reason: string;
  issuedBy: mongoose.Types.ObjectId;
  issuedAt: Date;
  expiresAt?: Date;
}

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
  role: UserRole;
  permissions: string[];
  statut: 'actif' | 'inactif';
  cguAcceptees: boolean;
  // Modération
  bannedAt?: Date | null;
  banReason?: string;
  suspendedUntil?: Date | null;
  warnings: IWarning[];
  // Relations
  amis: mongoose.Types.ObjectId[];
  // Timestamps
  dateCreation: Date;
  dateMiseAJour: Date;
  // Méthodes
  comparerMotDePasse(motDePasseCandidat: string): Promise<boolean>;
  isBanned(): boolean;
  isSuspended(): boolean;
  isStaff(): boolean;
  isAdmin(): boolean;
  hasPermission(permission: string): boolean;
  getRoleLevel(): number;
}

// Permissions par rôle
const ROLE_PERMISSIONS: Record<string, string[]> = {
  user: [],
  modo_test: [
    'reports:view',
    'users:view',
    'staff:chat',
  ],
  modo: [
    'reports:view', 'reports:process',
    'users:view', 'users:warn',
    'content:hide', 'content:unhide',
    'audit:view',
    'staff:chat',
  ],
  admin_modo: [
    'reports:view', 'reports:process', 'reports:escalate',
    'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban',
    'content:hide', 'content:unhide', 'content:delete',
    'audit:view', 'audit:export',
    'staff:chat',
    'dashboard:view',
  ],
  admin: [ // Legacy, même permissions que admin_modo
    'reports:view', 'reports:process', 'reports:escalate',
    'users:view', 'users:warn', 'users:suspend', 'users:ban', 'users:unban',
    'content:hide', 'content:unhide', 'content:delete',
    'audit:view', 'audit:export',
    'staff:chat',
    'dashboard:view',
  ],
  super_admin: ['*'], // Toutes les permissions
};

// Schema Mongoose
const warningSchema = new Schema<IWarning>({
  reason: { type: String, required: true },
  issuedBy: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
}, { _id: true });

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
      required: [true, "L'email est requis"],
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
      select: false,
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
    },
    bio: {
      type: String,
      maxlength: 500,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'modo_test', 'modo', 'admin_modo', 'super_admin', 'admin'],
      default: 'user',
    },
    permissions: {
      type: [String],
      default: [],
    },
    statut: {
      type: String,
      enum: ['actif', 'inactif'],
      default: 'actif',
    },
    cguAcceptees: {
      type: Boolean,
      required: [true, 'Vous devez accepter les CGU'],
      default: false,
    },
    // Modération
    bannedAt: {
      type: Date,
      default: null,
    },
    banReason: {
      type: String,
    },
    suspendedUntil: {
      type: Date,
      default: null,
    },
    warnings: {
      type: [warningSchema],
      default: [],
    },
    // Relations
    amis: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// Index
utilisateurSchema.index(
  { provider: 1, providerId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerId: { $exists: true, $ne: null } },
  }
);

// Middleware pre-save pour hasher le mot de passe
utilisateurSchema.pre('save', async function (next) {
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

// Méthode pour comparer les mots de passe
utilisateurSchema.methods.comparerMotDePasse = async function (
  motDePasseCandidat: string
): Promise<boolean> {
  if (!this.motDePasse) return false;
  return bcrypt.compare(motDePasseCandidat, this.motDePasse);
};

// Méthode pour vérifier si banni
utilisateurSchema.methods.isBanned = function (): boolean {
  return this.bannedAt !== null && this.bannedAt !== undefined;
};

// Méthode pour vérifier si suspendu
utilisateurSchema.methods.isSuspended = function (): boolean {
  if (!this.suspendedUntil) return false;
  return new Date(this.suspendedUntil) > new Date();
};

// Méthode pour vérifier si staff
utilisateurSchema.methods.isStaff = function (): boolean {
  return ['modo_test', 'modo', 'admin_modo', 'super_admin', 'admin'].includes(this.role);
};

// Méthode pour vérifier si admin
utilisateurSchema.methods.isAdmin = function (): boolean {
  return ['admin_modo', 'super_admin', 'admin'].includes(this.role);
};

// Méthode pour obtenir le niveau de rôle
utilisateurSchema.methods.getRoleLevel = function (): number {
  return ROLE_HIERARCHY[this.role] ?? 0;
};

// Méthode pour vérifier une permission
utilisateurSchema.methods.hasPermission = function (permission: string): boolean {
  // Super admin a toutes les permissions
  if (this.role === 'super_admin') return true;

  // Vérifier les permissions du rôle
  const rolePerms = ROLE_PERMISSIONS[this.role] || [];
  if (rolePerms.includes('*') || rolePerms.includes(permission)) {
    return true;
  }

  // Vérifier les permissions additionnelles
  if (this.permissions && this.permissions.includes(permission)) {
    return true;
  }

  return false;
};

// Méthode pour transformer en JSON
utilisateurSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.motDePasse;
  return obj;
};

const Utilisateur = mongoose.model<IUtilisateur>('Utilisateur', utilisateurSchema);

export default Utilisateur;
