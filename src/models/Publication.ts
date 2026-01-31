import mongoose, { Document, Schema } from 'mongoose';
import { urlValidator } from '../utils/validators.js';

export type TypePublication = 'post' | 'annonce' | 'update' | 'editorial' | 'live-extrait';

export interface IPublication extends Document {
  _id: mongoose.Types.ObjectId;
  auteur: mongoose.Types.ObjectId;
  auteurType: 'Utilisateur' | 'Projet';
  type: TypePublication;
  contenu: string;
  media?: string;
  projet?: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  nbCommentaires: number;
  dateCreation: Date;
  dateMiseAJour: Date;
}

const publicationSchema = new Schema<IPublication>(
  {
    auteur: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'auteurType',
    },
    auteurType: {
      type: String,
      required: true,
      enum: ['Utilisateur', 'Projet'],
    },
    type: {
      type: String,
      enum: ['post', 'annonce', 'update', 'editorial', 'live-extrait'],
      default: 'post',
    },
    contenu: {
      type: String,
      required: [true, 'Le contenu est requis'],
      maxlength: 5000,
    },
    media: {
      type: String,
      validate: urlValidator,
    },
    projet: {
      type: Schema.Types.ObjectId,
      ref: 'Projet',
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
    nbCommentaires: {
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

publicationSchema.index({ dateCreation: -1 });
publicationSchema.index({ projet: 1 });
publicationSchema.index({ type: 1 });
publicationSchema.index({ auteur: 1, dateCreation: -1 }); // Pour récupérer les publications d'un utilisateur

const Publication = mongoose.model<IPublication>('Publication', publicationSchema);

export default Publication;
