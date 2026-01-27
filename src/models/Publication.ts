import mongoose, { Document, Schema } from 'mongoose';

export type TypePublication = 'annonce' | 'update' | 'editorial' | 'live-extrait';

export interface IPublication extends Document {
  _id: mongoose.Types.ObjectId;
  auteur: mongoose.Types.ObjectId;
  auteurType: 'Utilisateur' | 'Projet';
  type: TypePublication;
  contenu: string;
  media?: string;
  projet?: mongoose.Types.ObjectId;
  likes: mongoose.Types.ObjectId[];
  dateCreation: Date;
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
      enum: ['annonce', 'update', 'editorial', 'live-extrait'],
      required: true,
    },
    contenu: {
      type: String,
      required: [true, 'Le contenu est requis'],
      maxlength: 5000,
    },
    media: {
      type: String,
    },
    projet: {
      type: Schema.Types.ObjectId,
      ref: 'Projet',
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
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

const Publication = mongoose.model<IPublication>('Publication', publicationSchema);

export default Publication;
