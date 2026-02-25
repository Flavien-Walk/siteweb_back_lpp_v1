import mongoose, { Document, Schema } from 'mongoose';

// === TYPES ===

export interface IRecentItem {
  projetId: mongoose.Types.ObjectId;
  date: Date;
}

// === INTERFACE ===

export interface IUserPreferences extends Document {
  _id: mongoose.Types.ObjectId;
  utilisateur: mongoose.Types.ObjectId;

  // Affinites par categorie (calculees depuis interactions)
  categoryAffinities: Map<string, number>; // ex: { tech: 0.8, food: 0.3 }

  // Affinites par tag
  tagAffinities: Map<string, number>;

  // Projets vus recemment (pour eviter repetition)
  recentlyViewed: IRecentItem[];

  // Projets deja recommandes (pour diversite)
  recentlyRecommended: IRecentItem[];

  // Nombre total d'interactions (pour detecter cold start)
  totalInteractions: number;

  lastComputed: Date;
}

// === SOUS-SCHEMA ===

const recentItemSchema = new Schema<IRecentItem>(
  {
    projetId: {
      type: Schema.Types.ObjectId,
      ref: 'Projet',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// === SCHEMA PRINCIPAL ===

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    utilisateur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
      unique: true,
      index: true,
    },

    categoryAffinities: {
      type: Map,
      of: Number,
      default: new Map(),
    },

    tagAffinities: {
      type: Map,
      of: Number,
      default: new Map(),
    },

    recentlyViewed: {
      type: [recentItemSchema],
      default: [],
    },

    recentlyRecommended: {
      type: [recentItemSchema],
      default: [],
    },

    totalInteractions: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastComputed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

const UserPreferences = mongoose.model<IUserPreferences>('UserPreferences', userPreferencesSchema);

export default UserPreferences;
