import mongoose, { Document, Schema } from 'mongoose';

export type TypeEvenement = 'live' | 'replay' | 'qr';
export type StatutEvenement = 'a-venir' | 'en-cours' | 'termine';

export interface IEvenement extends Document {
  _id: mongoose.Types.ObjectId;
  titre: string;
  description: string;
  type: TypeEvenement;
  projet?: mongoose.Types.ObjectId;
  date: Date;
  duree: number; // en minutes
  lienVideo?: string;
  statut: StatutEvenement;
  dateCreation: Date;
}

const evenementSchema = new Schema<IEvenement>(
  {
    titre: {
      type: String,
      required: [true, 'Le titre est requis'],
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['live', 'replay', 'qr'],
      required: true,
    },
    projet: {
      type: Schema.Types.ObjectId,
      ref: 'Projet',
    },
    date: {
      type: Date,
      required: true,
    },
    duree: {
      type: Number,
      required: true,
      min: 1,
    },
    lienVideo: {
      type: String,
    },
    statut: {
      type: String,
      enum: ['a-venir', 'en-cours', 'termine'],
      default: 'a-venir',
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

evenementSchema.index({ date: -1 });
evenementSchema.index({ statut: 1 });
evenementSchema.index({ type: 1 });

const Evenement = mongoose.model<IEvenement>('Evenement', evenementSchema);

export default Evenement;
