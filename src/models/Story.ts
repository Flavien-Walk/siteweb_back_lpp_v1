import mongoose, { Document, Schema } from 'mongoose';
import { urlValidator } from '../utils/validators.js';

// Durée de vie d'une story en millisecondes (24 heures)
export const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

export type TypeStory = 'photo' | 'video';

export interface IStory extends Document {
  _id: mongoose.Types.ObjectId;
  utilisateur: mongoose.Types.ObjectId;
  type: TypeStory;
  mediaUrl: string;
  thumbnailUrl?: string;
  dateCreation: Date;
  dateExpiration: Date;
  viewers: mongoose.Types.ObjectId[]; // Liste des utilisateurs qui ont vu cette story
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

// Static method pour obtenir la condition de story active
storySchema.statics.getActiveCondition = function () {
  return { dateExpiration: { $gt: new Date() } };
};

const Story = mongoose.model<IStory>('Story', storySchema);

export default Story;
