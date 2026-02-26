/**
 * Service Boutique — La Premiere Pierre
 * Appels API abonnements et marketplace
 *
 * Architecture prete pour backend :
 * - subscribeCertification() → POST /api/shop/subscribe
 * - purchaseBoost() → POST /api/shop/boost
 * - purchaseBundle() → POST /api/shop/bundle
 * - getSubscriptionStatus() → GET /api/shop/subscription
 * - fetchMarketplaceProducts() → GET /api/marketplace/products
 * - viewMarketplaceProduct() → GET /api/marketplace/products/:id
 */

import api from './api';

// Types — source de verite dans types/boutique.ts
import type { ReponseAPI } from '../types/api';
import type { LppPlusSubscription, UserSubscription, MarketplaceProduct, MarketplaceCategory, MarketplaceOrder, MarketplacePagination } from '../types/boutique';

// Re-exports types pour compatibilite des imports existants
export type { SubscriptionStatus, LppPlusSubscription, CertificationBenefit, CertificationPlan, UserSubscription, BoostGoalType, BoostIntensity, BoostGoal, BoostBundle, MarketplaceCategory, ProductReview, ProductOption, MarketplaceProduct, MarketplaceCategoryItem, PriceBreakdown, MarketplaceOrder, OrderStatut, MarketplacePagination } from '../types/boutique';

// Re-exports constantes + helpers pour compatibilite des imports existants
export { CERTIFICATION_PLAN, BOOST_GOALS, BOOST_BUNDLES, WELCOME_DISCOUNT, LPP_PLUS_DISCOUNT, MARKETPLACE_CATEGORIES, MOCK_MARKETPLACE_PRODUCTS, calculatePrice, calculateBundlePrice, formatPrice, getMarketplaceProducts, formatProductPrice, getCategoryLabel } from '../constantes/boutique';

// ============ API SUBSCRIPTION ============

/**
 * Normalise la reponse backend subscription.
 * Le backend renvoie { data: { lppPlus: { ... } } } — on unwrap vers LppPlusSubscription plat.
 * Compute isActive : actif OU resilie mais encore dans la periode.
 */
function normalizeLppResponse(response: ReponseAPI<any>): ReponseAPI<LppPlusSubscription> {
  if (!response.succes) return response as ReponseAPI<LppPlusSubscription>;

  const raw = response.data?.lppPlus ?? response.data;
  if (!raw) return response as ReponseAPI<LppPlusSubscription>;

  const status = raw.status || 'inactive';
  const cancelAtPeriodEnd = raw.cancelAtPeriodEnd ?? false;
  const currentPeriodEnd = raw.currentPeriodEnd || null;
  const withinPeriod = currentPeriodEnd ? new Date(currentPeriodEnd) > new Date() : false;

  return {
    succes: true,
    message: response.message,
    data: {
      status,
      isActive: status === 'active' || (status === 'canceled' && cancelAtPeriodEnd && withinPeriod),
      startedAt: raw.startedAt || null,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      canceledAt: raw.canceledAt || null,
      renewalCount: raw.renewalCount || 0,
    },
  };
}

export async function subscribeCertification(): Promise<ReponseAPI<LppPlusSubscription>> {
  try {
    const response = await api.post<any>('/subscriptions/lpp-plus/activate', {}, true);
    return normalizeLppResponse(response);
  } catch {
    return { succes: false, message: 'Erreur lors de l\'activation de LPP+.' };
  }
}

export async function cancelLppPlus(): Promise<ReponseAPI<LppPlusSubscription>> {
  try {
    const response = await api.post<any>('/subscriptions/lpp-plus/cancel', {}, true);
    return normalizeLppResponse(response);
  } catch {
    return { succes: false, message: 'Erreur lors de la resiliation.' };
  }
}

export async function reactivateLppPlus(): Promise<ReponseAPI<LppPlusSubscription>> {
  try {
    const response = await api.post<any>('/subscriptions/lpp-plus/reactivate', {}, true);
    return normalizeLppResponse(response);
  } catch {
    return { succes: false, message: 'Erreur lors de la reactivation.' };
  }
}

export async function getLppPlusStatus(): Promise<ReponseAPI<LppPlusSubscription>> {
  try {
    const response = await api.get<any>('/subscriptions/lpp-plus', true);
    return normalizeLppResponse(response);
  } catch {
    return { succes: false, message: 'Erreur lors de la recuperation du statut.' };
  }
}

export async function purchaseBoost(_intensityId: string): Promise<ReponseAPI<{ success: boolean }>> {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    succes: false,
    message: 'Les mises en avant seront disponibles tres prochainement.',
  };
}

export async function purchaseBundle(_bundleId: string): Promise<ReponseAPI<{ success: boolean }>> {
  await new Promise(resolve => setTimeout(resolve, 800));
  return {
    succes: false,
    message: 'Les packs seront disponibles tres prochainement.',
  };
}

export async function getSubscriptionStatus(): Promise<ReponseAPI<{ subscription: UserSubscription }>> {
  return {
    succes: true,
    data: { subscription: { status: 'none' } },
  };
}

// ============ API MARKETPLACE (REEL) ============

/**
 * Lister les services marketplace (public)
 */
export async function fetchMarketplaceProducts(
  categorie?: MarketplaceCategory,
  page: number = 1,
  limit: number = 20,
): Promise<ReponseAPI<{ products: MarketplaceProduct[]; pagination?: MarketplacePagination }>> {
  try {
    let endpoint = `/marketplace/services?page=${page}&limit=${limit}`;
    if (categorie && categorie !== 'tous') {
      endpoint += `&categorie=${categorie}`;
    }
    const response = await api.get<{ services: MarketplaceProduct[]; pagination: MarketplacePagination }>(endpoint);
    if (response.succes && response.data) {
      return {
        succes: true,
        data: {
          products: response.data.services,
          pagination: response.data.pagination,
        },
      };
    }
    return { succes: false, message: response.message || 'Erreur chargement services.' };
  } catch {
    return { succes: false, message: 'Erreur lors du chargement des services.' };
  }
}

/**
 * Details d'un service (public)
 */
export async function viewMarketplaceProduct(
  productId: string
): Promise<ReponseAPI<{ product: MarketplaceProduct }>> {
  try {
    const response = await api.get<{ service: MarketplaceProduct }>(`/marketplace/services/${productId}`);
    if (response.succes && response.data) {
      return { succes: true, data: { product: response.data.service } };
    }
    return { succes: false, message: response.message || 'Service introuvable.' };
  } catch {
    return { succes: false, message: 'Erreur lors du chargement du service.' };
  }
}

/**
 * Tracker une vue de service (analytics, silencieux)
 */
export async function trackServiceView(serviceId: string): Promise<void> {
  try {
    await api.post('/marketplace/events/view', { serviceId }, true);
  } catch {
    // Silent — analytics ne doit pas bloquer l'UX
  }
}

/**
 * Creer un service marketplace (entrepreneur only)
 */
export async function creerServiceMarketplace(
  data: {
    nom: string;
    description: string;
    descriptionLongue: string;
    categorie: string;
    prix: number | null;
    image: string;
    gallery?: string[];
    tags?: string[];
    delaiLivraison: string;
    options?: Array<{ label: string; description?: string; prix: number }>;
    faq?: Array<{ question: string; answer: string }>;
  }
): Promise<ReponseAPI<{ service: MarketplaceProduct }>> {
  try {
    return api.post<{ service: MarketplaceProduct }>('/marketplace/services', data, true);
  } catch {
    return { succes: false, message: 'Erreur lors de la creation du service.' };
  }
}

/**
 * Mes services (entrepreneur)
 */
export async function getMesServices(): Promise<ReponseAPI<{ services: MarketplaceProduct[] }>> {
  try {
    return api.get<{ services: MarketplaceProduct[] }>('/marketplace/mes-services', true);
  } catch {
    return { succes: false, message: 'Erreur lors du chargement de vos services.' };
  }
}

/**
 * Contacter un vendeur — reutilise le systeme de messagerie existant
 */
export async function contacterVendeur(
  vendeurId: string
): Promise<ReponseAPI<{ conversation: { _id: string }; participant: any }>> {
  try {
    return api.get<{ conversation: { _id: string }; participant: any }>(
      `/messagerie/conversation-privee/${vendeurId}`, true
    );
  } catch {
    return { succes: false, message: 'Impossible de contacter le vendeur.' };
  }
}

/**
 * Creer une commande
 */
export async function creerCommande(
  serviceId: string,
  optionsSelectionnees?: number[],
): Promise<ReponseAPI<{ commande: MarketplaceOrder }>> {
  try {
    return api.post<{ commande: MarketplaceOrder }>(
      '/marketplace/orders',
      { serviceId, optionsSelectionnees },
      true,
    );
  } catch {
    return { succes: false, message: 'Erreur lors de la creation de la commande.' };
  }
}

/**
 * Changer le statut d'une commande
 */
export async function changerStatutCommande(
  commandeId: string,
  statut: string,
  commentaire?: string,
): Promise<ReponseAPI<{ commande: MarketplaceOrder }>> {
  try {
    return api.patch<{ commande: MarketplaceOrder }>(
      `/marketplace/orders/${commandeId}/statut`,
      { statut, commentaire },
      true,
    );
  } catch {
    return { succes: false, message: 'Erreur lors du changement de statut.' };
  }
}

/**
 * Laisser un avis (acheteur, commande terminee)
 */
export async function creerReview(
  commandeId: string,
  note: number,
  commentaire: string,
): Promise<ReponseAPI<{ review: any }>> {
  try {
    return api.post<{ review: any }>(
      '/marketplace/reviews',
      { commandeId, note, commentaire },
      true,
    );
  } catch {
    return { succes: false, message: 'Erreur lors de la publication de l\'avis.' };
  }
}
