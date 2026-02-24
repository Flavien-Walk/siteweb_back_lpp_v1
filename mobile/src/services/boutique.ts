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
import type { LppPlusSubscription, UserSubscription, MarketplaceProduct, MarketplaceCategory } from '../types/boutique';

// Re-exports types pour compatibilite des imports existants
export type { SubscriptionStatus, LppPlusSubscription, CertificationBenefit, CertificationPlan, UserSubscription, BoostGoalType, BoostIntensity, BoostGoal, BoostBundle, MarketplaceCategory, ProductReview, ProductOption, MarketplaceProduct, MarketplaceCategoryItem, PriceBreakdown } from '../types/boutique';

// Re-exports constantes + helpers pour compatibilite des imports existants
export { CERTIFICATION_PLAN, BOOST_GOALS, BOOST_BUNDLES, WELCOME_DISCOUNT, LPP_PLUS_DISCOUNT, MARKETPLACE_CATEGORIES, MOCK_MARKETPLACE_PRODUCTS, calculatePrice, calculateBundlePrice, formatPrice, getMarketplaceProducts, formatProductPrice, getCategoryLabel } from '../constantes/boutique';

import { getMarketplaceProducts } from '../constantes/boutique';

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

export async function fetchMarketplaceProducts(
  categorie?: MarketplaceCategory
): Promise<ReponseAPI<{ products: MarketplaceProduct[] }>> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const products = getMarketplaceProducts(categorie || 'tous');
  return {
    succes: true,
    data: { products },
  };
}

export async function viewMarketplaceProduct(
  _productId: string
): Promise<ReponseAPI<{ url?: string }>> {
  return {
    succes: false,
    message: 'Les fiches produit detaillees seront disponibles prochainement.',
  };
}
