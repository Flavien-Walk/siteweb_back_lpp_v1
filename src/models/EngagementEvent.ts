import mongoose, { Document, Schema } from 'mongoose';

// === TYPES ===

export type EngagementEventType =
  | 'impression'
  | 'click'
  | 'view_time'
  | 'like'
  | 'unlike'
  | 'follow'
  | 'unfollow'
  | 'comment'
  | 'share'
  | 'save';

export type EngagementTargetType = 'projet' | 'publication';

export type EngagementSource = 'mobile' | 'web' | 'api';

// === INTERFACE ===

export interface IEngagementEvent extends Document {
  _id: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  actorAccountAge: number; // Heures depuis creation du compte (anti-spam)
  eventType: EngagementEventType;
  targetType: EngagementTargetType;
  targetId: mongoose.Types.ObjectId;
  targetCategorie: string; // Denormalise depuis Projet pour aggregation rapide
  targetTags: string[]; // Denormalise depuis Projet
  value: number; // Pour view_time = secondes, sinon 1
  metadata?: Record<string, unknown>;
  source: EngagementSource;
  dateCreation: Date;
}

// === SCHEMA ===

const engagementEventSchema = new Schema<IEngagementEvent>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, "L'acteur est requis"],
      index: true,
    },
    actorAccountAge: {
      type: Number,
      default: 0,
      min: 0,
    },
    eventType: {
      type: String,
      enum: ['impression', 'click', 'view_time', 'like', 'unlike', 'follow', 'unfollow', 'comment', 'share', 'save'],
      required: [true, "Le type d'event est requis"],
      index: true,
    },
    targetType: {
      type: String,
      enum: ['projet', 'publication'],
      required: [true, 'Le type de cible est requis'],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "L'ID de la cible est requis"],
      index: true,
    },
    targetCategorie: {
      type: String,
      default: '',
    },
    targetTags: {
      type: [String],
      default: [],
    },
    value: {
      type: Number,
      default: 1,
      min: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    source: {
      type: String,
      enum: ['mobile', 'web', 'api'],
      default: 'mobile',
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false, // Immutable
    },
  }
);

// Index composes pour aggregation trending
engagementEventSchema.index({ targetType: 1, targetId: 1, dateCreation: -1 });
engagementEventSchema.index({ actor: 1, dateCreation: -1 });
engagementEventSchema.index({ eventType: 1, dateCreation: -1 });
// Index pour aggregation par categorie
engagementEventSchema.index({ targetType: 1, targetCategorie: 1, dateCreation: -1 });
// Index pour anti-spam (meme acteur sur meme cible)
engagementEventSchema.index({ actor: 1, targetId: 1, eventType: 1, dateCreation: -1 });

// TTL : suppression automatique apres 90 jours (RGPD)
engagementEventSchema.index({ dateCreation: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const EngagementEvent = mongoose.model<IEngagementEvent>('EngagementEvent', engagementEventSchema);

export default EngagementEvent;
