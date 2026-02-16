import mongoose, { Document, Schema } from 'mongoose';

// === INTERFACES ===

export interface IQueteCompletee {
  queteId: string;
  completedAt: Date;
  xpGagne: number;
}

export interface IDefiProgression {
  defiId: mongoose.Types.ObjectId;
  progression: number;
  objectif: number;
  complete: boolean;
  completedAt?: Date;
}

export interface IParcoursUtilisateur extends Document {
  _id: mongoose.Types.ObjectId;
  utilisateur: mongoose.Types.ObjectId;
  xp: number;
  niveau: number;
  quetesCompletees: IQueteCompletee[];
  defis: IDefiProgression[];
  streak: number;
  lastActivityDate: Date | null;
  initialise: boolean;
  projetsVisites: string[];
  storiesVues: string[];
  dateCreation: Date;
  dateMiseAJour: Date;
}

// === CONFIGURATION NIVEAUX ===

export interface NiveauConfig {
  niveau: number;
  nom: string;
  xpRequis: number;
  icone: string;
}

export const NIVEAUX_VISITEUR: NiveauConfig[] = [
  { niveau: 1, nom: 'Curieux', xpRequis: 0, icone: 'eye-outline' },
  { niveau: 2, nom: 'Explorateur', xpRequis: 100, icone: 'compass-outline' },
  { niveau: 3, nom: 'Batisseur', xpRequis: 300, icone: 'hammer-outline' },
  { niveau: 4, nom: 'Architecte', xpRequis: 700, icone: 'construct-outline' },
  { niveau: 5, nom: 'Legende', xpRequis: 1500, icone: 'diamond-outline' },
];

export const NIVEAUX_ENTREPRENEUR: NiveauConfig[] = [
  { niveau: 1, nom: 'Idee', xpRequis: 0, icone: 'bulb-outline' },
  { niveau: 2, nom: 'Fondation', xpRequis: 100, icone: 'layers-outline' },
  { niveau: 3, nom: 'Construction', xpRequis: 300, icone: 'build-outline' },
  { niveau: 4, nom: 'Lancement', xpRequis: 700, icone: 'rocket-outline' },
  { niveau: 5, nom: 'Empire', xpRequis: 1500, icone: 'planet-outline' },
];

/**
 * Calcule le niveau a partir de l'XP total
 */
export function calculerNiveau(xp: number, niveaux: NiveauConfig[]): number {
  let niveau = 1;
  for (const n of niveaux) {
    if (xp >= n.xpRequis) niveau = n.niveau;
    else break;
  }
  return niveau;
}

/**
 * Retourne la config du niveau actuel et suivant
 */
export function getNiveauInfo(xp: number, niveaux: NiveauConfig[]) {
  const niveau = calculerNiveau(xp, niveaux);
  const actuel = niveaux.find(n => n.niveau === niveau)!;
  const suivant = niveaux.find(n => n.niveau === niveau + 1) || null;

  return {
    niveau,
    niveauNom: actuel.nom,
    niveauIcone: actuel.icone,
    niveauSuivant: suivant ? suivant.nom : 'Max',
    xpPourProchainNiveau: suivant ? suivant.xpRequis : actuel.xpRequis,
    xpDansNiveau: xp - actuel.xpRequis,
    xpTotalNiveau: suivant ? suivant.xpRequis - actuel.xpRequis : 0,
  };
}

// === SCHEMA ===

const queteCompleteeSchema = new Schema<IQueteCompletee>(
  {
    queteId: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
    xpGagne: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const defiProgressionSchema = new Schema<IDefiProgression>(
  {
    defiId: { type: Schema.Types.ObjectId, ref: 'DefiSemaine', required: true },
    progression: { type: Number, default: 0, min: 0 },
    objectif: { type: Number, required: true, min: 1 },
    complete: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const parcoursUtilisateurSchema = new Schema<IParcoursUtilisateur>(
  {
    utilisateur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
      unique: true,
    },
    xp: { type: Number, default: 0, min: 0 },
    niveau: { type: Number, default: 1, min: 1, max: 5 },
    quetesCompletees: [queteCompleteeSchema],
    defis: [defiProgressionSchema],
    streak: { type: Number, default: 0, min: 0 },
    lastActivityDate: { type: Date, default: null },
    initialise: { type: Boolean, default: false },
    projetsVisites: [{ type: String }],
    storiesVues: [{ type: String }],
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

const ParcoursUtilisateur = mongoose.model<IParcoursUtilisateur>(
  'ParcoursUtilisateur',
  parcoursUtilisateurSchema
);

export default ParcoursUtilisateur;
