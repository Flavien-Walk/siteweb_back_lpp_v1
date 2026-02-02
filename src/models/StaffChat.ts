import mongoose, { Document, Schema } from 'mongoose';

// Types
export type StaffMessageType = 'text' | 'system' | 'report_link';

// Interface pour le document StaffMessage
export interface IStaffMessage extends Document {
  sender: mongoose.Types.ObjectId;
  type: StaffMessageType;
  content: string;
  linkedReport?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  readBy: mongoose.Types.ObjectId[];
  dateCreation: Date;
}

const staffMessageSchema = new Schema<IStaffMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, "L'expediteur est requis"],
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
      maxlength: [2000, 'Le message ne peut pas depasser 2000 caracteres'],
      trim: true,
    },
    linkedReport: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Utilisateur',
      },
    ],
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false, // Pas de modification des messages
    },
  }
);

// Index pour recuperer les messages recents
staffMessageSchema.index({ dateCreation: -1 });

// Index pour les messages lies a un report
staffMessageSchema.index({ linkedReport: 1 });

const StaffMessage = mongoose.model<IStaffMessage>('StaffMessage', staffMessageSchema);

export default StaffMessage;
