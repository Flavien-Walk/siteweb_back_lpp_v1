import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Types pour les providers OAuth
export type ProviderOAuth = 'local' | 'google' | 'facebook' | 'apple';

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
  emailVerifie: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  cguAcceptees: boolean;
  dateCreation: Date;
  dateMiseAJour: Date;
  comparerMotDePasse(motDePasseCandidat: string): Promise<boolean>;
  genererTokenVerificationEmail(): string;
}

// Schéma Mongoose
const utilisateurSchema = new Schema<IUtilisateur>(
  {
    prenom: {
      type: String,
      required: [true, 'Le prénom est requis'],
      trim: true,
      minlength: [2, 'Le prénom doit contenir au moins 2 caractères'],
      maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères'],
    },
    nom: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
      minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
      maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères'],
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
      minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
      select: false, // Ne pas inclure par défaut dans les requêtes
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
    emailVerifie: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    cguAcceptees: {
      type: Boolean,
      required: [true, 'Vous devez accepter les CGU'],
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// Index composé pour OAuth — uniquement pour les documents qui ONT un providerId
utilisateurSchema.index(
  { provider: 1, providerId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerId: { $exists: true, $ne: null } },
  }
);

// Middleware pre-save pour hasher le mot de passe
utilisateurSchema.pre('save', async function (next) {
  // Ne hasher que si le mot de passe a été modifié
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

// Méthode pour générer un token de vérification email
utilisateurSchema.methods.genererTokenVerificationEmail = function (): string {
  const token = crypto.randomBytes(32).toString('hex');
  // Stocker le hash du token (sécurité : le token brut n'est jamais en DB)
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return token;
};

// Méthode pour transformer en JSON (retirer le mot de passe)
utilisateurSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.motDePasse;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  return obj;
};

const Utilisateur = mongoose.model<IUtilisateur>('Utilisateur', utilisateurSchema);

export default Utilisateur;
