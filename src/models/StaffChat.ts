import mongoose, { Document, Schema } from 'mongoose';

/**
 * Types de messages dans le staff chat
 */
export type StaffMessageType = 'text' | 'system' | 'report_link';

/**
 * Interface pour un message du staff chat
 */
export interface IStaffMessage extends Document {
  _id: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: StaffMessageType;
  content: string;
  // Lien optionnel vers un signalement
  linkedReport?: mongoose.Types.ObjectId;
  // Métadonnées système
  metadata?: Record<string, unknown>;
  // Qui a lu ce message
  readBy: mongoose.Types.ObjectId[];
  // Timestamps
  dateCreation: Date;
}

const staffMessageSchema = new Schema<IStaffMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, "L'expéditeur est requis"],
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'system', 'report_link'],
      default: 'text',
    },
    content: {
      type: String,
      required: [true, 'Le contenu est requis'],
      maxlength: [2000, 'Le message ne peut pas dépasser 2000 caractères'],
      trim: true,
    },
    linkedReport: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false, // Pas de modification des messages
    },
  }
);

// Index pour récupérer les messages récents
staffMessageSchema.index({ dateCreation: -1 });

// Index pour les messages liés à un report
staffMessageSchema.index({ linkedReport: 1 });

const StaffMessage = mongoose.model<IStaffMessage>('StaffMessage', staffMessageSchema);

export default StaffMessage;
