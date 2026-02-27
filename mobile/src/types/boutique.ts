/**
 * Types Boutique
 * Extraits de services/boutique.ts
 */

export type SubscriptionStatus = 'active' | 'expired' | 'none';

export interface LppPlusSubscription {
  status: 'inactive' | 'active' | 'canceled';
  isActive: boolean;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  renewalCount: number;
}

export interface CertificationBenefit {
  icon: string;
  text: string;
}

export interface CertificationPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month';
  benefits: CertificationBenefit[];
}

export interface UserSubscription {
  status: SubscriptionStatus;
  planId?: string;
  startDate?: string;
  endDate?: string;
}

export type BoostGoalType = 'publication' | 'profil' | 'projet';

export interface BoostIntensity {
  id: string;
  name: string;
  label: string;
  duree: string;
  jours: number;
  prix: number;
  devise: string;
  estimateLabel: string;
  recommended?: boolean;
}

export interface BoostGoal {
  id: BoostGoalType;
  titre: string;
  sousTitre: string;
  icon: string;
  color: string;
  intensities: BoostIntensity[];
}

export interface BoostBundle {
  id: string;
  titre: string;
  description: string;
  contenu: string[];
  prixSepare: number;
  prixPack: number;
  devise: string;
  economie: number;
  icon: string;
  color: string;
}

export type MarketplaceCategory =
  | 'tous'
  | 'service'
  | 'formation'
  | 'produit'
  | 'outil'
  | 'accompagnement';

export interface ProductReview {
  id: string;
  auteur: string;
  avatar?: string;
  note: number;
  commentaire: string;
  date: string;
}

export interface ProductOption {
  id: string;
  label: string;
  description: string;
  prix: number;
  devise: string;
}

export interface MarketplaceProduct {
  id: string;
  nom: string;
  description: string;
  descriptionLongue: string;
  categorie: MarketplaceCategory;
  prix: number | null;
  devise: string;
  image: string;
  gallery?: string[];
  createur: {
    id: string;
    nom: string;
    avatar?: string;
    note: number;
    ventesRealisees: number;
    tempsReponse: string;
    tauxCompletion: number;
    membreDepuis: string;
  };
  tags: string[];
  estNouveau?: boolean;
  delaiLivraison: string;
  commandesRealisees: number;
  noteGlobale: number;
  nombreAvis: number;
  reviews: ProductReview[];
  options?: ProductOption[];
  faq?: { question: string; answer: string }[];
}

export interface MarketplaceCategoryItem {
  id: MarketplaceCategory;
  label: string;
  icon: string;
}

export interface PriceBreakdown {
  base: number;
  welcomeDiscount: number;
  lppPlusDiscount: number;
  total: number;
  hasWelcome: boolean;
  hasLppPlus: boolean;
}

// ============ MARKETPLACE ORDERS ============

export type OrderStatut =
  | 'en_attente' | 'acceptee' | 'refusee'
  | 'en_cours' | 'livre' | 'termine'
  | 'annule' | 'litige';

export interface OrderAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface OrderDeliverable {
  _id: string;
  type: 'message' | 'file' | 'link';
  content: string;
  file?: OrderAttachment;
  createdAt: string;
  createdBy: string;
}

export interface OrderProgressUpdate {
  _id: string;
  title: string;
  message: string;
  percent: number;
  createdAt: string;
  createdBy: string;
}

export interface OrderBuyerBrief {
  message: string;
  attachments: OrderAttachment[];
  submittedAt: string;
}

export interface OrderHistorique {
  de: string;
  vers: string;
  date: string;
  par: string;
  commentaire?: string;
}

export interface OrderDeadlineExtension {
  requestedBy: string;
  secondsAdded: number;
  reason?: string;
  createdAt: string;
}

export interface OrderDeadlineHistory {
  from: string;
  to: string;
  by: string;
  reason?: string;
  createdAt: string;
}

export interface OrderDeadline {
  acceptedAt?: string;
  initialDeliverySeconds?: number;
  currentDeadlineAt?: string;
  remainingSeconds: number;
  isLate: boolean;
  lateSince?: string;
  deadlineActive: boolean;
  extensions?: OrderDeadlineExtension[];
  deadlineHistory?: OrderDeadlineHistory[];
}

export interface MarketplaceOrder {
  _id: string;
  service: { _id: string; nom: string; image: string; categorie?: string };
  acheteur: { _id: string; prenom: string; nom: string; avatar?: string };
  vendeur: { _id: string; prenom: string; nom: string; avatar?: string };
  serviceSnapshot: { nom: string; prix: number | null; devise: string; image?: string };
  optionsSelectionnees: Array<{ label: string; prix: number; devise: string }>;
  montantTotal: number;
  devise: string;
  statut: OrderStatut;
  historique: OrderHistorique[];
  buyerBrief: OrderBuyerBrief;
  deliverables: OrderDeliverable[];
  progressUpdates: OrderProgressUpdate[];
  aReview: boolean;
  conversationId?: string;
  deadline?: OrderDeadline;
  dateCreation: string;
  dateMiseAJour: string;
}

export interface MarketplacePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
