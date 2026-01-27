import mongoose, { Document, Schema } from 'mongoose';

export type TypeNotification = 'projet-update' | 'annonce' | 'live-rappel' | 'interaction';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  destinataire: mongoose.Types.ObjectId;
  type: TypeNotification;
  titre: string;
  message: string;
  lien?: string;
  lue: boolean;
  dateCreation: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    destinataire: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    type: {
      type: String,
      enum: ['projet-update', 'annonce', 'live-rappel', 'interaction'],
      required: true,
    },
    titre: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    lien: {
      type: String,
    },
    lue: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

notificationSchema.index({ destinataire: 1, dateCreation: -1 });
notificationSchema.index({ destinataire: 1, lue: 1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
