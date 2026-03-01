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

  // Preferences de maturite (depuis onboarding)
  maturitePreferences: string[];

  // Nombre total d'interactions (pour detecter cold start)
  totalInteractions: number;

  // Préférences push notifications
  notificationsPush: {
    messages: boolean;
    activite: boolean;
    recommandations: boolean;
  };

  // Dernier push de rétention envoyé
  dernierPushRetention: Date;

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

    maturitePreferences: {
      type: [String],
      enum: ['idee', 'prototype', 'lancement', 'croissance'],
      default: [],
    },

    totalInteractions: {
      type: Number,
      default: 0,
      min: 0,
    },

    notificationsPush: {
      messages: { type: Boolean, default: true },
      activite: { type: Boolean, default: true },
      recommandations: { type: Boolean, default: true },
    },

    dernierPushRetention: {
      type: Date,
      default: null,
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
