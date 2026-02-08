import mongoose, { Document, Schema } from 'mongoose';

export type BroadcastBadge = 'actu' | 'maintenance' | 'mise_a_jour' | 'evenement' | 'important';

export interface IBroadcastNotification extends Document {
  _id: mongoose.Types.ObjectId;
  titre: string;
  message: string;
  badge: BroadcastBadge;
  sentBy: mongoose.Types.ObjectId;
  recipientCount: number;
  dateCreation: Date;
}

const broadcastNotificationSchema = new Schema<IBroadcastNotification>(
  {
    titre: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    badge: {
      type: String,
      enum: ['actu', 'maintenance', 'mise_a_jour', 'evenement', 'important'],
      required: true,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

broadcastNotificationSchema.index({ dateCreation: -1 });

const BroadcastNotification = mongoose.model<IBroadcastNotification>(
  'BroadcastNotification',
  broadcastNotificationSchema
);

export default BroadcastNotification;
