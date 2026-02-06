import mongoose, { Document, Schema } from 'mongoose';
import { urlValidator } from '../utils/validators.js';

// Durée de vie par défaut d'une story en millisecondes (24 heures)
export const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

// Durées de vie disponibles en minutes
export const STORY_EXPIRATION_OPTIONS = [7, 15, 60, 360, 1440] as const; // 7min, 15min, 1h, 6h, 24h
export type ExpirationMinutes = typeof STORY_EXPIRATION_OPTIONS[number];

export type TypeStory = 'photo' | 'video';

// Types de filtres disponibles
export type FilterPreset = 'normal' | 'warm' | 'cool' | 'bw' | 'contrast' | 'vignette';

// Interface pour la localisation
export interface IStoryLocation {
  label: string;
  lat?: number;
  lng?: number;
}

export interface IStory extends Document {
  _id: mongoose.Types.ObjectId;
  utilisateur: mongoose.Types.ObjectId;
  type: TypeStory;
  mediaUrl: string;
  thumbnailUrl?: string;
  dateCreation: Date;
  dateExpiration: Date;
  viewers: mongoose.Types.ObjectId[];
  // V2 - Nouveaux champs
  expirationMinutes?: ExpirationMinutes; // Durée de vie choisie par le créateur
  durationSec: number;
  location?: IStoryLocation;
  filterPreset: FilterPreset;
  isHidden: boolean;
  hiddenReason?: string;
  hiddenBy?: mongoose.Types.ObjectId;
  hiddenAt?: Date;
}

const storySchema = new Schema<IStory>(
  {
    utilisateur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, 'L\'utilisateur est requis'],
      index: true,
    },
    type: {
      type: String,
      enum: ['photo', 'video'],
      required: [true, 'Le type de story est requis'],
    },
    mediaUrl: {
      type: String,
      required: [true, 'L\'URL du média est requise'],
      validate: urlValidator,
    },
    thumbnailUrl: {
      type: String,
      validate: urlValidator,
    },
    dateExpiration: {
      type: Date,
      default: () => new Date(Date.now() + STORY_DURATION_MS),
      index: true,
    },
    viewers: {
      type: [Schema.Types.ObjectId],
      ref: 'Utilisateur',
      default: [],
    },
    // Durée de vie choisie par le créateur (en minutes)
    expirationMinutes: {
      type: Number,
      enum: STORY_EXPIRATION_OPTIONS,
      default: 1440, // 24h par défaut
    },
    // V2 - Durée d'affichage choisie par le créateur (en secondes)
    durationSec: {
      type: Number,
      required: true,
      min: [3, 'La durée minimum est de 3 secondes'],
      max: [20, 'La durée maximum est de 20 secondes'],
      default: 7,
    },
    // V2 - Localisation optionnelle
    location: {
      label: {
        type: String,
        maxlength: [100, 'Le label de localisation ne peut pas dépasser 100 caractères'],
      },
      lat: {
        type: Number,
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    // V2 - Filtre visuel appliqué
    filterPreset: {
      type: String,
      enum: ['normal', 'warm', 'cool', 'bw', 'contrast', 'vignette'],
      default: 'normal',
    },
    // V2 - Modération : story masquée
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    hiddenReason: {
      type: String,
      maxlength: 500,
    },
    hiddenBy: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    hiddenAt: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false, // Pas de mise à jour pour les stories
    },
  }
);

// Index pour récupérer les stories actives d'un utilisateur
storySchema.index({ utilisateur: 1, dateExpiration: 1 });

// Index pour récupérer toutes les stories actives (feed)
storySchema.index({ dateExpiration: 1, dateCreation: -1 });

// Index composé pour tri par date de création
storySchema.index({ dateCreation: -1 });

// Index pour les stories masquées (modération)
storySchema.index({ isHidden: 1, dateExpiration: 1 });

// Static method pour obtenir la condition de story active (non expirée + non masquée)
storySchema.statics.getActiveCondition = function () {
  return {
    dateExpiration: { $gt: new Date() },
    isHidden: { $ne: true },
  };
};

const Story = mongoose.model<IStory>('Story', storySchema);

export default Story;
