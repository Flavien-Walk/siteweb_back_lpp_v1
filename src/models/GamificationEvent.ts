import mongoose, { Document, Schema } from 'mongoose';

// === TYPES D'EVENEMENTS ===

export type GamificationEventType =
  | 'like_post'
  | 'comment_post'
  | 'follow_user'
  | 'follow_project'
  | 'view_project'
  | 'create_project'
  | 'publish_project'
  | 'complete_profile'
  | 'send_message'
  | 'add_friend'
  | 'create_post'
  | 'view_story';

export interface IGamificationEvent extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: GamificationEventType;
  entityId?: string; // ID de l'entite concernee (postId, projetId, etc.)
  xpAwarded: number;
  meta?: Record<string, unknown>;
  dateCreation: Date;
}

// === SCHEMA ===

const gamificationEventSchema = new Schema<IGamificationEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'like_post',
        'comment_post',
        'follow_user',
        'follow_project',
        'view_project',
        'create_project',
        'publish_project',
        'complete_profile',
        'send_message',
        'add_friend',
        'create_post',
        'view_story',
      ],
      required: true,
    },
    entityId: {
      type: String,
      default: null,
    },
    xpAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false,
    },
  }
);

// Index pour requetes par user + date (historique)
gamificationEventSchema.index({ userId: 1, dateCreation: -1 });

// Index pour anti-spam (verifier les events recents d'un type)
gamificationEventSchema.index({ userId: 1, type: 1, dateCreation: -1 });

// TTL : suppression automatique apres 90 jours (RGPD)
gamificationEventSchema.index({ dateCreation: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const GamificationEvent = mongoose.model<IGamificationEvent>('GamificationEvent', gamificationEventSchema);

export default GamificationEvent;
