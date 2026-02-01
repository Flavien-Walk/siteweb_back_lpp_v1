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
      required: true,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false, // Pas de mise à jour pour les stories
    },
  }
);

// Middleware pre-save pour calculer dateExpiration automatiquement
storySchema.pre('save', function (next) {
  if (this.isNew && !this.dateExpiration) {
    this.dateExpiration = new Date(Date.now() + STORY_DURATION_MS);
  }
  next();
});

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
