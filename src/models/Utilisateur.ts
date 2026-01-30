import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { urlValidator } from '../utils/validators.js';

// Types pour les providers OAuth
export type ProviderOAuth = 'local' | 'google' | 'facebook' | 'apple';

// Types pour les rôles
export type Role = 'user' | 'admin';

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
  role: Role;
  statut?: StatutUtilisateur;
  cguAcceptees: boolean;
  // Système d'amis
  amis: mongoose.Types.ObjectId[];
  demandesAmisRecues: mongoose.Types.ObjectId[];
  demandesAmisEnvoyees: mongoose.Types.ObjectId[];
  dateCreation: Date;
  dateMiseAJour: Date;
  comparerMotDePasse(motDePasseCandidat: string): Promise<boolean>;
  isAdmin(): boolean;
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
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
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

// Methode pour comparer les mots de passe
utilisateurSchema.methods.comparerMotDePasse = async function (
  motDePasseCandidat: string
): Promise<boolean> {
  if (!this.motDePasse) return false;
  return bcrypt.compare(motDePasseCandidat, this.motDePasse);
};

// Methode pour verifier si l'utilisateur est admin
utilisateurSchema.methods.isAdmin = function (): boolean {
  return this.role === 'admin';
};

// Methode pour transformer en JSON (retirer le mot de passe)
utilisateurSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.motDePasse;
  return obj;
};

const Utilisateur = mongoose.model<IUtilisateur>('Utilisateur', utilisateurSchema);

export default Utilisateur;