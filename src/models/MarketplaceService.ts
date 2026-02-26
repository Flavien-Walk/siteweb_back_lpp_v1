import mongoose, { Document, Schema } from 'mongoose';

export interface IServiceOption {
  label: string;
  description: string;
  prix: number;
  devise: string;
}

export interface IServiceFaq {
  question: string;
  answer: string;
}

export interface IStatsCache {
  noteGlobale: number;
  nombreAvis: number;
  commandesRealisees: number;
  vues: number;
}

export type ServiceStatut = 'brouillon' | 'actif' | 'pause' | 'archive';
export type ServiceCategorie = 'service' | 'formation' | 'produit' | 'outil' | 'accompagnement';

export interface IMarketplaceService extends Document {
  createur: mongoose.Types.ObjectId;
  nom: string;
  description: string;
  descriptionLongue: string;
  categorie: ServiceCategorie;
  prix: number | null;
  devise: string;
  image: string;
  gallery: string[];
  tags: string[];
  delaiLivraison: string;
  options: IServiceOption[];
  faq: IServiceFaq[];
  statut: ServiceStatut;
  statsCache: IStatsCache;
  dateCreation: Date;
  dateMiseAJour: Date;
}

const marketplaceServiceSchema = new Schema<IMarketplaceService>({
  createur: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true, index: true },
  nom: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
  description: { type: String, required: true, trim: true, minlength: 20, maxlength: 200 },
  descriptionLongue: { type: String, required: true, trim: true, minlength: 50, maxlength: 5000 },
  categorie: { type: String, required: true, enum: ['service', 'formation', 'produit', 'outil', 'accompagnement'] },
  prix: { type: Number, default: null },
  devise: { type: String, default: 'EUR' },
  image: { type: String, required: true },
  gallery: { type: [String], default: [], validate: [(v: string[]) => v.length <= 5, 'Maximum 5 images'] },
  tags: { type: [String], default: [], validate: [(v: string[]) => v.length <= 8, 'Maximum 8 tags'] },
  delaiLivraison: { type: String, required: true },
  options: { type: [{ label: String, description: String, prix: Number, devise: { type: String, default: 'EUR' } }], default: [], validate: [(v: any[]) => v.length <= 10, 'Maximum 10 options'] },
  faq: { type: [{ question: String, answer: String }], default: [] },
  statut: { type: String, enum: ['brouillon', 'actif', 'pause', 'archive'], default: 'actif' },
  statsCache: {
    type: {
      noteGlobale: { type: Number, default: 0 },
      nombreAvis: { type: Number, default: 0 },
      commandesRealisees: { type: Number, default: 0 },
      vues: { type: Number, default: 0 },
    },
    default: { noteGlobale: 0, nombreAvis: 0, commandesRealisees: 0, vues: 0 },
  },
}, { timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' } });

marketplaceServiceSchema.index({ statut: 1, categorie: 1 });
marketplaceServiceSchema.index({ statut: 1, dateCreation: -1 });
marketplaceServiceSchema.index({ nom: 'text', description: 'text', tags: 'text' });

const MarketplaceService = mongoose.model<IMarketplaceService>('MarketplaceService', marketplaceServiceSchema);
export default MarketplaceService;
