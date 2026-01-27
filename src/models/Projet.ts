import mongoose, { Document, Schema } from 'mongoose';

export type MaturiteProjet = 'idee' | 'prototype' | 'lancement' | 'croissance';
export type CategorieProjet = 'tech' | 'food' | 'sante' | 'education' | 'energie' | 'culture' | 'environnement' | 'autre';

export interface IProjet extends Document {
  _id: mongoose.Types.ObjectId;
  nom: string;
  description: string;
  pitch: string;
  categorie: CategorieProjet;
  secteur: string;
  maturite: MaturiteProjet;
  porteur: mongoose.Types.ObjectId;
  localisation: {
    ville: string;
    lat: number;
    lng: number;
  };
  progression: number;
  objectif: string;
  montant: number;
  image: string;
  tags: string[];
  followers: mongoose.Types.ObjectId[];
  dateCreation: Date;
  dateMiseAJour: Date;
}

const projetSchema = new Schema<IProjet>(
  {
    nom: {
      type: String,
      required: [true, 'Le nom du projet est requis'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      maxlength: 2000,
    },
    pitch: {
      type: String,
      required: [true, 'Le pitch est requis'],
      maxlength: 200,
    },
    categorie: {
      type: String,
      enum: ['tech', 'food', 'sante', 'education', 'energie', 'culture', 'environnement', 'autre'],
      required: true,
    },
    secteur: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    maturite: {
      type: String,
      enum: ['idee', 'prototype', 'lancement', 'croissance'],
      default: 'idee',
    },
    porteur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    localisation: {
      ville: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    progression: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    objectif: {
      type: String,
      maxlength: 100,
    },
    montant: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    followers: [{
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

projetSchema.index({ categorie: 1 });
projetSchema.index({ maturite: 1 });
projetSchema.index({ 'localisation.ville': 1 });
projetSchema.index({ nom: 'text', description: 'text', pitch: 'text' });

const Projet = mongoose.model<IProjet>('Projet', projetSchema);

export default Projet;
