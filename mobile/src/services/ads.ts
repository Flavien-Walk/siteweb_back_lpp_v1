/**
 * Service des publicites video
 * Types, donnees mock, algorithme d'insertion, tracking RGPD-ready
 *
 * Architecture prete pour backend :
 * - Remplacer MOCK_ADS par un appel API getAds(userId, tags)
 * - buildFeedWithAds() accepte deja un parametre ads[]
 * - trackAdEvent() → remplacer console.log par POST /api/analytics/ads
 */

import { Publication } from './publications';

// ============ TYPES ============

export interface AdBrand {
  name: string;
  avatar: string;
  tagline?: string;
}

export interface AdItem {
  _id: string;
  itemType: 'ad';
  campaignId: string;
  brand: AdBrand;
  videoUrl: string;
  thumbnailUrl?: string;
  ctaLabel: string;
  ctaUrl: string;
  tags: string[];
  weight: number; // 1-10, higher = more likely
  contenu: string;
  _feedIndex?: number; // index d'insertion unique dans le feed (evite les cles dupliquees)
}

/** Union discriminee par itemType — le feed manipule FeedItem[] */
export type FeedItem =
  | (Publication & { itemType: 'publication' })
  | AdItem;

// ============ MOCK ADS ============

export const MOCK_ADS: AdItem[] = [
  {
    _id: 'ad-001',
    itemType: 'ad',
    campaignId: 'camp-nike-2025',
    brand: {
      name: 'Nike Innovation',
      avatar: 'https://logo.clearbit.com/nike.com',
      tagline: 'Just Do It',
    },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    ctaLabel: 'Decouvrir',
    ctaUrl: 'https://nike.com',
    tags: ['sport', 'innovation'],
    weight: 8,
    contenu: 'Decouvrez la nouvelle generation de chaussures connectees pour les athletes entrepreneurs.',
  },
  {
    _id: 'ad-002',
    itemType: 'ad',
    campaignId: 'camp-notion-2025',
    brand: {
      name: 'Notion',
      avatar: 'https://logo.clearbit.com/notion.so',
      tagline: 'Your connected workspace',
    },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    ctaLabel: 'Essayer gratuitement',
    ctaUrl: 'https://notion.so',
    tags: ['productivite', 'startup'],
    weight: 7,
    contenu: 'Gerez votre startup avec Notion. Organisation, roadmap, wiki — tout en un seul outil.',
  },
  {
    _id: 'ad-003',
    itemType: 'ad',
    campaignId: 'camp-stripe-2025',
    brand: {
      name: 'Stripe',
      avatar: 'https://logo.clearbit.com/stripe.com',
      tagline: 'Payments infrastructure',
    },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    ctaLabel: 'Commencer',
    ctaUrl: 'https://stripe.com',
    tags: ['fintech', 'paiement'],
    weight: 9,
    contenu: 'Acceptez les paiements en ligne en 10 minutes. Infrastructure fiable pour startups ambitieuses.',
  },
  {
    _id: 'ad-004',
    itemType: 'ad',
    campaignId: 'camp-figma-2025',
    brand: {
      name: 'Figma',
      avatar: 'https://logo.clearbit.com/figma.com',
      tagline: 'Design together',
    },
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    ctaLabel: 'Designer maintenant',
    ctaUrl: 'https://figma.com',
    tags: ['design', 'collaboration'],
    weight: 6,
    contenu: 'Prototypez, designez et collaborez en temps reel. Le design tool #1 des startups.',
  },
];

// ============ INSERTION ALGORITHM ============

const INITIAL_SKIP = 3;  // pas de pub dans les 3 premiers posts
const AD_INTERVAL = 6;   // 1 pub toutes les 6 publications

/**
 * Selection ponderee par weight avec alea controle.
 * Evite la repetition immediate (filtre lastAdId).
 */
function selectAd(ads: AdItem[], lastAdId: string | null): AdItem {
  const candidates = ads.filter(a => a._id !== lastAdId);
  const pool = candidates.length > 0 ? candidates : ads;

  const totalWeight = pool.reduce((sum, ad) => sum + ad.weight, 0);
  let random = Math.random() * totalWeight;

  for (const ad of pool) {
    random -= ad.weight;
    if (random <= 0) return ad;
  }

  return pool[pool.length - 1];
}

/**
 * Construit le feed mixte publications + publicites.
 *
 * Regles :
 * - Aucune pub dans les 3 premiers posts
 * - 1 pub toutes les 6 publications
 * - Jamais 2 pubs consecutives (garanti par l'intervalle)
 * - Selection ponderee, pas de repetition immediate
 */
export function buildFeedWithAds(
  publications: Publication[],
  ads: AdItem[] = MOCK_ADS,
): FeedItem[] {
  if (ads.length === 0 || publications.length === 0) {
    return publications.map(p => ({ ...p, itemType: 'publication' as const }));
  }

  const feed: FeedItem[] = [];
  let postsSinceLastAd = 0;
  let lastAdId: string | null = null;
  let adInsertionCount = 0;

  for (let i = 0; i < publications.length; i++) {
    feed.push({ ...publications[i], itemType: 'publication' as const });
    postsSinceLastAd++;

    // Apres les premiers posts, inserer une pub tous les AD_INTERVAL posts
    if (i + 1 >= INITIAL_SKIP && postsSinceLastAd >= AD_INTERVAL) {
      const ad = selectAd(ads, lastAdId);
      feed.push({ ...ad, _feedIndex: adInsertionCount++ });
      lastAdId = ad._id;
      postsSinceLastAd = 0;
    }
  }

  return feed;
}

// ============ TRACKING (mock, RGPD-ready) ============

export type AdTrackingEvent = 'impression' | 'click' | 'view_3s' | 'view_complete';

export interface AdTrackingPayload {
  event: AdTrackingEvent;
  adId: string;
  campaignId: string;
  timestamp: number;
  userId?: string;
  context: {
    feedPosition: number;
    sessionId: string;
  };
}

let _consentGiven = false;

/** RGPD : definir le consentement utilisateur pour le tracking publicitaire */
export const setAdConsent = (consent: boolean) => { _consentGiven = consent; };

/** RGPD : lire le consentement */
export const getAdConsent = () => _consentGiven;

/**
 * Track un evenement publicitaire.
 * Actuellement console.log — remplacer par POST /api/analytics/ads en prod.
 */
export function trackAdEvent(
  event: AdTrackingEvent,
  ad: AdItem,
  feedPosition: number,
): void {
  const payload: AdTrackingPayload = {
    event,
    adId: ad._id,
    campaignId: ad.campaignId,
    timestamp: Date.now(),
    userId: _consentGiven ? undefined : undefined, // placeholder pour userId
    context: {
      feedPosition,
      sessionId: `session-${Date.now()}`,
    },
  };
  console.log(`[AdTracking] ${event}`, payload);
}

// ============ TYPE GUARDS & HELPERS ============

/** Type guard pour AdItem */
export function isAdItem(item: FeedItem): item is AdItem {
  return item.itemType === 'ad';
}

/** Type guard pour Publication */
export function isPublication(item: FeedItem): item is (Publication & { itemType: 'publication' }) {
  return item.itemType === 'publication';
}

/** Cle de layout pour publicationLayoutsRef (ad:xxx-N ou publication._id) */
export function getFeedItemKey(item: FeedItem): string {
  if (isAdItem(item)) {
    const suffix = item._feedIndex != null ? `-${item._feedIndex}` : '';
    return `ad:${item._id}${suffix}`;
  }
  return item._id;
}

// ============ REELS ADS ============

/** Item dans la FlatList Reels : publication video ou pub video */
export type ReelsItem =
  | { type: 'post'; publication: Publication }
  | { type: 'ad'; ad: AdItem; insertionIndex: number };

const REELS_AD_INTERVAL = 5; // 1 pub toutes les 5 videos

/**
 * Injecte des pubs dans la liste Reels a intervalles reguliers.
 * Selection deterministe pour stabilite (pas de Math.random).
 */
export function buildReelsWithAds(
  publications: Publication[],
  ads: AdItem[] = MOCK_ADS,
): ReelsItem[] {
  if (ads.length === 0 || publications.length === 0) {
    return publications.map(p => ({ type: 'post' as const, publication: p }));
  }

  const items: ReelsItem[] = [];
  let adInsertionCount = 0;

  for (let i = 0; i < publications.length; i++) {
    items.push({ type: 'post', publication: publications[i] });

    // Apres chaque REELS_AD_INTERVAL posts, inserer une pub
    if ((i + 1) % REELS_AD_INTERVAL === 0) {
      const ad = ads[adInsertionCount % ads.length];
      items.push({ type: 'ad', ad, insertionIndex: adInsertionCount });
      adInsertionCount++;
    }
  }

  return items;
}

/** Trouver l'index d'un post dans reelsItems apres injection d'ads */
export function findReelsPostIndex(items: ReelsItem[], postId: string): number {
  return items.findIndex(item => item.type === 'post' && item.publication._id === postId);
}

/** Type guard pour ReelsItem */
export function isReelsAd(item: ReelsItem): item is ReelsItem & { type: 'ad' } {
  return item.type === 'ad';
}

/** Cle unique pour un ReelsItem */
export function getReelsItemKey(item: ReelsItem): string {
  if (item.type === 'ad') return `reels:ad:${item.ad._id}-${item.insertionIndex}`;
  return item.publication._id;
}
