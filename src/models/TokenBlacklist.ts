import mongoose, { Document, Schema } from 'mongoose';

/**
 * Modele TokenBlacklist - Tokens JWT invalides (deconnexion serveur)
 *
 * Utilise un TTL index pour nettoyage automatique :
 * les entrees sont supprimees 8 jours apres creation
 * (JWT expire en 7d par defaut, +1j de marge)
 */
export interface ITokenBlacklist extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index : supprime automatiquement les documents expires
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Verifier si un token est blackliste
 */
export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const entry = await TokenBlacklist.findOne({ token }).lean();
  return !!entry;
};

/**
 * Blacklister un token (deconnexion)
 */
export const blacklistToken = async (
  token: string,
  userId: string,
  expiresAt: Date
): Promise<void> => {
  try {
    await TokenBlacklist.create({ token, userId, expiresAt });
  } catch (err: any) {
    // Ignorer les doublons (token deja blackliste)
    if (err.code !== 11000) throw err;
  }
};

const TokenBlacklist = mongoose.model<ITokenBlacklist>(
  'TokenBlacklist',
  tokenBlacklistSchema
);

export default TokenBlacklist;
