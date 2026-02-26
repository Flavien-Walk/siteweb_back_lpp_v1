import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatut = 'en_attente' | 'paye' | 'en_cours' | 'livre' | 'termine' | 'annule' | 'litige';

export interface IHistorique {
  de: string;
  vers: string;
  date: Date;
  par: mongoose.Types.ObjectId;
  commentaire?: string;
}

export interface IMarketplaceOrder extends Document {
  service: mongoose.Types.ObjectId;
  acheteur: mongoose.Types.ObjectId;
  vendeur: mongoose.Types.ObjectId;
  serviceSnapshot: { nom: string; prix: number | null; devise: string };
  optionsSelectionnees: Array<{ label: string; prix: number; devise: string }>;
  montantTotal: number;
  devise: string;
  statut: OrderStatut;
  historique: IHistorique[];
  aReview: boolean;
  conversationId: mongoose.Types.ObjectId;
  dateCreation: Date;
  dateMiseAJour: Date;
}

export const TRANSITIONS_AUTORISEES: Record<string, string[]> = {
  en_attente: ['paye', 'annule'],
  paye: ['en_cours', 'annule'],
  en_cours: ['livre', 'litige'],
  livre: ['termine', 'litige'],
  termine: [],
  annule: [],
  litige: ['en_cours', 'annule'],
};

export const QUI_PEUT_TRANSITIONNER: Record<string, string> = {
  paye: 'acheteur',
  en_cours: 'vendeur',
  livre: 'vendeur',
  termine: 'acheteur',
  annule: 'les_deux',
  litige: 'les_deux',
};

const marketplaceOrderSchema = new Schema<IMarketplaceOrder>({
  service: { type: Schema.Types.ObjectId, ref: 'MarketplaceService', required: true },
  acheteur: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  vendeur: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  serviceSnapshot: {
    nom: { type: String, required: true },
    prix: { type: Number, default: null },
    devise: { type: String, default: 'EUR' },
  },
  optionsSelectionnees: [{ label: String, prix: Number, devise: { type: String, default: 'EUR' } }],
  montantTotal: { type: Number, required: true },
  devise: { type: String, default: 'EUR' },
  statut: { type: String, enum: ['en_attente', 'paye', 'en_cours', 'livre', 'termine', 'annule', 'litige'], default: 'en_attente' },
  historique: [{ de: String, vers: String, date: { type: Date, default: Date.now }, par: { type: Schema.Types.ObjectId, ref: 'Utilisateur' }, commentaire: String }],
  aReview: { type: Boolean, default: false },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
}, { timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' } });

marketplaceOrderSchema.index({ acheteur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ vendeur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ service: 1 });

const MarketplaceOrder = mongoose.model<IMarketplaceOrder>('MarketplaceOrder', marketplaceOrderSchema);
export default MarketplaceOrder;
