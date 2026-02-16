import mongoose, { Document, Schema } from 'mongoose';

export type TypeDefi = 'follow' | 'like' | 'comment' | 'publish' | 'visit_projet' | 'create_story' | 'add_friend' | 'custom';

export interface IDefiSemaine extends Document {
  _id: mongoose.Types.ObjectId;
  titre: string;
  description: string;
  type: TypeDefi;
  objectif: number;
  filtreCategorie?: string;
  xpRecompense: number;
  dateDebut: Date;
  dateFin: Date;
  actif: boolean;
  participants: number;
  completions: number;
  icone: string;
  couleur: string;
  dateCreation: Date;
}

const defiSemaineSchema = new Schema<IDefiSemaine>(
  {
    titre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ['follow', 'like', 'comment', 'publish', 'visit_projet', 'create_story', 'add_friend', 'custom'],
      required: true,
    },
    objectif: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    filtreCategorie: {
      type: String,
      default: null,
    },
    xpRecompense: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
    },
    dateDebut: {
      type: Date,
      required: true,
    },
    dateFin: {
      type: Date,
      required: true,
    },
    actif: {
      type: Boolean,
      default: true,
    },
    participants: {
      type: Number,
      default: 0,
      min: 0,
    },
    completions: {
      type: Number,
      default: 0,
      min: 0,
    },
    icone: {
      type: String,
      default: 'trophy-outline',
    },
    couleur: {
      type: String,
      default: '#7C5CFF',
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false,
    },
  }
);

// Index pour trouver le defi actif rapidement
defiSemaineSchema.index({ actif: 1, dateFin: 1 });
defiSemaineSchema.index({ dateDebut: 1, dateFin: 1 });

const DefiSemaine = mongoose.model<IDefiSemaine>('DefiSemaine', defiSemaineSchema);

export default DefiSemaine;
