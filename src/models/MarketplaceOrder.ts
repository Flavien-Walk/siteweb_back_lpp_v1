import mongoose, { Document, Schema } from 'mongoose';

// ============ TYPES ============

export type OrderStatut =
  | 'en_attente' | 'acceptee' | 'refusee'
  | 'en_cours' | 'livre' | 'termine'
  | 'annule' | 'litige';

export interface IHistorique {
  de: string;
  vers: string;
  date: Date;
  par: mongoose.Types.ObjectId;
  commentaire?: string;
}

export interface IDeadlineExtension {
  requestedBy: mongoose.Types.ObjectId;
  secondsAdded: number;
  reason?: string;
  createdAt: Date;
}

export interface IDeadlineHistory {
  from: Date;
  to: Date;
  by: mongoose.Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

export interface IDeliverable {
  type: 'message' | 'file' | 'link';
  content: string;
  file?: { url: string; name: string; size: number; mimeType: string };
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

export interface IProgressUpdate {
  title: string;
  message: string;
  percent: number;
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

export interface IAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface IBuyerBrief {
  message: string;
  attachments: IAttachment[];
  submittedAt: Date;
}

export interface IMediationMessage {
  _id?: mongoose.Types.ObjectId;
  canal: 'acheteur' | 'vendeur';
  auteur: mongoose.Types.ObjectId;
  auteurRole: 'moderateur' | 'acheteur' | 'vendeur';
  contenu: string;
  dateCreation: Date;
  lu: boolean;
}

export interface IMarketplaceOrder extends Document {
  service: mongoose.Types.ObjectId;
  acheteur: mongoose.Types.ObjectId;
  vendeur: mongoose.Types.ObjectId;
  serviceSnapshot: { nom: string; prix: number | null; devise: string; image?: string };
  optionsSelectionnees: Array<{ label: string; prix: number; devise: string }>;
  montantTotal: number;
  devise: string;
  statut: OrderStatut;
  historique: IHistorique[];
  buyerBrief: IBuyerBrief;
  deliverables: IDeliverable[];
  progressUpdates: IProgressUpdate[];
  aReview: boolean;
  conversationId?: mongoose.Types.ObjectId;
  // Revision settings (snapshot from service at accept)
  revisionSettings: { accepteRevisions: boolean; revisionsIncluses: number };
  // Deadline
  acceptedAt?: Date;
  initialDeliverySeconds: number;
  currentDeadlineAt?: Date;
  isLate: boolean;
  lateSince?: Date;
  extensions: IDeadlineExtension[];
  deadlineHistory: IDeadlineHistory[];
  mediationMessages: IMediationMessage[];
  dateCreation: Date;
  dateMiseAJour: Date;
}

// ============ STATE MACHINE ============

export const TRANSITIONS_AUTORISEES: Record<OrderStatut, OrderStatut[]> = {
  en_attente: ['acceptee', 'refusee', 'annule'],
  acceptee: ['en_cours', 'annule'],
  refusee: [],
  en_cours: ['livre', 'litige', 'annule'],
  livre: ['termine', 'en_cours', 'litige'],
  termine: [],
  annule: [],
  litige: ['en_cours', 'annule'],
};

/**
 * Qui peut effectuer chaque transition (cle = "de->vers")
 * vendeur / acheteur / les_deux
 */
export const QUI_PEUT_TRANSITIONNER: Record<string, string> = {
  // Vendeur accepte / refuse
  'en_attente->acceptee': 'vendeur',
  'en_attente->refusee': 'vendeur',
  'en_attente->annule': 'les_deux',
  // Vendeur demarre
  'acceptee->en_cours': 'vendeur',
  'acceptee->annule': 'vendeur',
  // Vendeur livre
  'en_cours->livre': 'vendeur',
  'en_cours->litige': 'les_deux',
  'en_cours->annule': 'les_deux',
  // Acheteur valide ou demande revision
  'livre->termine': 'acheteur',
  'livre->en_cours': 'acheteur', // revision
  'livre->litige': 'les_deux',
  // Resolution litige
  'litige->en_cours': 'les_deux',
  'litige->annule': 'les_deux',
};

// ============ SCHEMA ============

const attachmentSchema = new Schema({
  url: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, default: 0 },
  mimeType: { type: String, default: 'application/octet-stream' },
}, { _id: false });

const deliverableSchema = new Schema({
  type: { type: String, enum: ['message', 'file', 'link'], required: true },
  content: { type: String, required: true },
  file: {
    type: { url: String, name: String, size: Number, mimeType: String },
    default: undefined,
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
}, { _id: true });

const progressUpdateSchema = new Schema({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  percent: { type: Number, min: 0, max: 100, required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
}, { _id: true });

const extensionSchema = new Schema({
  requestedBy: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  secondsAdded: { type: Number, required: true },
  reason: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const deadlineHistorySchema = new Schema({
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  by: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  reason: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const mediationMessageSchema = new Schema({
  canal: {
    type: String,
    enum: ['acheteur', 'vendeur'],
    required: true,
  },
  auteur: {
    type: Schema.Types.ObjectId,
    ref: 'Utilisateur',
    required: true,
  },
  auteurRole: {
    type: String,
    enum: ['moderateur', 'acheteur', 'vendeur'],
    required: true,
  },
  contenu: {
    type: String,
    required: [true, 'Le contenu du message est requis'],
    maxlength: [2000, 'Le message ne peut pas depasser 2000 caracteres'],
    trim: true,
  },
  dateCreation: {
    type: Date,
    default: Date.now,
  },
  lu: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const marketplaceOrderSchema = new Schema<IMarketplaceOrder>({
  service: { type: Schema.Types.ObjectId, ref: 'MarketplaceService', required: true },
  acheteur: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  vendeur: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  serviceSnapshot: {
    nom: { type: String, required: true },
    prix: { type: Number, default: null },
    devise: { type: String, default: 'EUR' },
    image: { type: String },
  },
  optionsSelectionnees: [{ label: String, prix: Number, devise: { type: String, default: 'EUR' } }],
  montantTotal: { type: Number, required: true },
  devise: { type: String, default: 'EUR' },
  statut: {
    type: String,
    enum: ['en_attente', 'acceptee', 'refusee', 'en_cours', 'livre', 'termine', 'annule', 'litige'],
    default: 'en_attente',
  },
  historique: [{
    de: String, vers: String,
    date: { type: Date, default: Date.now },
    par: { type: Schema.Types.ObjectId, ref: 'Utilisateur' },
    commentaire: String,
  }],
  buyerBrief: {
    type: {
      message: { type: String, default: '' },
      attachments: { type: [attachmentSchema], default: [] },
      submittedAt: { type: Date, default: Date.now },
    },
    default: { message: '', attachments: [], submittedAt: new Date() },
  },
  deliverables: { type: [deliverableSchema], default: [] },
  progressUpdates: { type: [progressUpdateSchema], default: [] },
  aReview: { type: Boolean, default: false },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
  // Revision settings (snapshot from service at accept)
  revisionSettings: {
    type: {
      accepteRevisions: { type: Boolean, default: true },
      revisionsIncluses: { type: Number, default: 2 },
    },
    default: { accepteRevisions: true, revisionsIncluses: 2 },
  },
  // Deadline
  acceptedAt: { type: Date },
  initialDeliverySeconds: { type: Number, default: 259200 }, // 3 jours
  currentDeadlineAt: { type: Date },
  isLate: { type: Boolean, default: false },
  lateSince: { type: Date },
  extensions: { type: [extensionSchema], default: [] },
  deadlineHistory: { type: [deadlineHistorySchema], default: [] },
  mediationMessages: { type: [mediationMessageSchema], default: [] },
}, { timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' } });

marketplaceOrderSchema.index({ acheteur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ vendeur: 1, dateCreation: -1 });
marketplaceOrderSchema.index({ service: 1 });
marketplaceOrderSchema.index({ statut: 1 });

const MarketplaceOrder = mongoose.model<IMarketplaceOrder>('MarketplaceOrder', marketplaceOrderSchema);
export default MarketplaceOrder;
