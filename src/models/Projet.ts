import mongoose, { Document, Schema } from 'mongoose';
import { urlValidator, latitudeValidator, longitudeValidator } from '../utils/validators.js';

// === TYPES ===
export type MaturiteProjet = 'idee' | 'prototype' | 'lancement' | 'croissance';
export type CategorieProjet = 'tech' | 'food' | 'sante' | 'education' | 'energie' | 'culture' | 'environnement' | 'autre';
export type StatutProjet = 'draft' | 'published';
export type VisibiliteDocument = 'public' | 'private';
export type RoleEquipe = 'founder' | 'cofounder' | 'cto' | 'cmo' | 'cfo' | 'developer' | 'designer' | 'marketing' | 'sales' | 'other';

// === INTERFACES IMBRIQUÉES ===

/** Membre de l'équipe projet */
export interface IMembreEquipe {
  utilisateur?: mongoose.Types.ObjectId; // Lié à un utilisateur LPP (optionnel)
  nom: string;
  role: RoleEquipe;
  titre?: string; // Ex: "CEO & Founder"
  linkedin?: string;
  photo?: string;
}

/** Document attaché au projet */
export interface IDocumentProjet {
  nom: string;
  url: string;
  type: 'pdf' | 'pptx' | 'xlsx' | 'docx' | 'image' | 'other';
  visibilite: VisibiliteDocument;
  dateAjout: Date;
}

/** Média de la galerie */
export interface IMediaGalerie {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  legende?: string;
  ordre: number;
}

/** Métrique KPI */
export interface IMetrique {
  label: string; // Ex: "Utilisateurs actifs", "CA mensuel"
  valeur: string; // Ex: "10K", "50K€"
  icone?: string; // Nom d'icône Ionicons
}

// === INTERFACE PRINCIPALE ===
export interface IProjet extends Document {
  _id: mongoose.Types.ObjectId;

  // --- Étape A: Identité du projet ---
  nom: string;
  description: string;
  pitch: string; // Tagline courte (200 car max)
  logo?: string; // URL logo/photo principale
  categorie: CategorieProjet;
  secteur: string;
  tags: string[];
  localisation: {
    ville: string;
    lat: number;
    lng: number;
  };

  // --- Étape B: Porteur(s) de projet ---
  porteur: mongoose.Types.ObjectId; // Propriétaire principal
  equipe: IMembreEquipe[];

  // --- Étape C: Proposition de valeur ---
  probleme?: string; // Problème adressé
  solution?: string; // Solution proposée
  avantageConcurrentiel?: string;
  cible?: string; // Public/clients cibles

  // --- Étape D: Traction & business ---
  maturite: MaturiteProjet;
  businessModel?: string; // Description du modèle économique
  metriques: IMetrique[]; // KPIs à afficher
  objectifFinancement?: number; // Montant recherché
  montantLeve?: number; // Montant déjà levé
  progression: number; // % de progression (0-100)
  objectif: string; // Description de l'objectif

  // --- Étape E: Médias & documents ---
  image: string; // Image principale (couverture)
  pitchVideo?: string; // URL vidéo pitch
  galerie: IMediaGalerie[];
  documents: IDocumentProjet[];

  // --- Étape F: Publication ---
  statut: StatutProjet;
  datePublication?: Date;

  // --- Système ---
  followers: mongoose.Types.ObjectId[];
  dateCreation: Date;
  dateMiseAJour: Date;

  // Champ legacy pour compatibilité
  montant: number;
}

// === SOUS-SCHÉMAS ===

const membreEquipeSchema = new Schema<IMembreEquipe>(
  {
    utilisateur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    nom: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ['founder', 'cofounder', 'cto', 'cmo', 'cfo', 'developer', 'designer', 'marketing', 'sales', 'other'],
      default: 'other',
    },
    titre: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    linkedin: {
      type: String,
      validate: urlValidator,
    },
    photo: {
      type: String,
      validate: urlValidator,
    },
  },
  { _id: false }
);

const documentProjetSchema = new Schema<IDocumentProjet>(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    url: {
      type: String,
      required: true,
      validate: urlValidator,
    },
    type: {
      type: String,
      enum: ['pdf', 'pptx', 'xlsx', 'docx', 'image', 'other'],
      default: 'other',
    },
    visibilite: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
    dateAjout: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const mediaGalerieSchema = new Schema<IMediaGalerie>(
  {
    url: {
      type: String,
      required: true,
      validate: urlValidator,
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    thumbnailUrl: {
      type: String,
      validate: urlValidator,
    },
    legende: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    ordre: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

const metriqueSchema = new Schema<IMetrique>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    valeur: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    icone: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// === SCHÉMA PRINCIPAL ===

const projetSchema = new Schema<IProjet>(
  {
    // --- Étape A: Identité du projet ---
    nom: {
      type: String,
      required: [true, 'Le nom du projet est requis'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      maxlength: 5000, // Augmenté pour description détaillée
    },
    pitch: {
      type: String,
      required: [true, 'Le pitch est requis'],
      maxlength: 200,
    },
    logo: {
      type: String,
      validate: urlValidator,
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
    tags: [{
      type: String,
      trim: true,
    }],
    localisation: {
      ville: { type: String, default: '' },
      lat: { type: Number, default: 0, validate: latitudeValidator },
      lng: { type: Number, default: 0, validate: longitudeValidator },
    },

    // --- Étape B: Porteur(s) de projet ---
    porteur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    equipe: [membreEquipeSchema],

    // --- Étape C: Proposition de valeur ---
    probleme: {
      type: String,
      maxlength: 1000,
    },
    solution: {
      type: String,
      maxlength: 1000,
    },
    avantageConcurrentiel: {
      type: String,
      maxlength: 500,
    },
    cible: {
      type: String,
      maxlength: 500,
    },

    // --- Étape D: Traction & business ---
    maturite: {
      type: String,
      enum: ['idee', 'prototype', 'lancement', 'croissance'],
      default: 'idee',
    },
    businessModel: {
      type: String,
      maxlength: 1000,
    },
    metriques: [metriqueSchema],
    objectifFinancement: {
      type: Number,
      min: [0, 'Le montant ne peut pas être négatif'],
    },
    montantLeve: {
      type: Number,
      default: 0,
      min: [0, 'Le montant ne peut pas être négatif'],
    },
    progression: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    objectif: {
      type: String,
      maxlength: 200,
    },

    // --- Étape E: Médias & documents ---
    image: {
      type: String,
      validate: urlValidator,
    },
    pitchVideo: {
      type: String,
      validate: urlValidator,
    },
    galerie: [mediaGalerieSchema],
    documents: [documentProjetSchema],

    // --- Étape F: Publication ---
    statut: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    datePublication: {
      type: Date,
    },

    // --- Système ---
    followers: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],

    // Legacy - pour rétrocompatibilité
    montant: {
      type: Number,
      default: 0,
      min: [0, 'Le montant ne peut pas être négatif'],
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// === INDEX ===
projetSchema.index({ categorie: 1 });
projetSchema.index({ maturite: 1 });
projetSchema.index({ statut: 1 }); // Pour filtrer brouillons/publiés
projetSchema.index({ statut: 1, datePublication: -1 }); // Projets publiés récents
projetSchema.index({ 'localisation.ville': 1 });
projetSchema.index({ nom: 'text', description: 'text', pitch: 'text' });
projetSchema.index({ porteur: 1 }); // Pour récupérer les projets d'un utilisateur
projetSchema.index({ porteur: 1, statut: 1 }); // Projets d'un entrepreneur par statut

const Projet = mongoose.model<IProjet>('Projet', projetSchema);

export default Projet;
