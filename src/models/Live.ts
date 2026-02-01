/**
 * Modèle Live - Gestion des diffusions en direct
 * Un utilisateur peut avoir au maximum 1 live actif à la fois
 */

import mongoose, { Document, Schema } from 'mongoose';

export type LiveStatus = 'live' | 'ended';

export interface ILive extends Document {
  _id: mongoose.Types.ObjectId;
  hostUserId: mongoose.Types.ObjectId;
  channelName: string;
  status: LiveStatus;
  title?: string;
  startedAt: Date;
  endedAt?: Date;
  viewerCount: number;
  peakViewerCount: number;
  dateCreation: Date;
  dateMiseAJour: Date;
}

const liveSchema = new Schema<ILive>(
  {
    hostUserId: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, "L'hôte est requis"],
      index: true,
    },
    channelName: {
      type: String,
      required: [true, 'Le nom du canal est requis'],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['live', 'ended'],
      default: 'live',
      index: true,
    },
    title: {
      type: String,
      maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères'],
      trim: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    viewerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    peakViewerCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// Index composé pour récupérer les lives actifs d'un utilisateur
liveSchema.index({ hostUserId: 1, status: 1 });

// Index pour récupérer tous les lives actifs (tri par date)
liveSchema.index({ status: 1, startedAt: -1 });

// Index TTL pour nettoyer automatiquement les lives terminés après 7 jours
liveSchema.index(
  { endedAt: 1 },
  {
    expireAfterSeconds: 7 * 24 * 60 * 60, // 7 jours
    partialFilterExpression: { status: 'ended' }, // Seulement les lives terminés
  }
);

// Middleware pre-save pour mettre à jour peakViewerCount
liveSchema.pre('save', function (next) {
  if (this.viewerCount > this.peakViewerCount) {
    this.peakViewerCount = this.viewerCount;
  }
  next();
});

const Live = mongoose.model<ILive>('Live', liveSchema);

export default Live;
