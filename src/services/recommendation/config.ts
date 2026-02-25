/**
 * Configuration du systeme de recommandation "Pour Toi"
 */

export const RECO_CONFIG = {
  // Poids du ranking final
  ranking: {
    categoryAffinity: 0.20,
    freshness: 0.15,
    engagement: 0.20,
    social: 0.15,
    quality: 0.10,
    diversity: 0.10,
    exploration: 0.10,
  },

  // Penalites
  penalties: {
    alreadySeen: 0.3,        // Projet deja vu recemment
    sameCategory3Plus: 0.2,  // 3+ projets de la meme categorie consecutifs
  },

  // Exploration (anti-bulle)
  exploration: {
    rate: 0.25, // 25% du feed = hors affinites
  },

  // Cold start
  coldStart: {
    threshold: 5, // < 5 interactions = cold start
    weights: {
      trending: 0.40,
      recent: 0.30,
      exploration: 0.30,
    },
  },

  // Limites candidats par source
  candidateLimits: {
    fromInterests: 100,
    fromFollows: 80,
    fromSimilarUsers: 60,
    fromRecency: 50,
    fromTrending: 50,
    fromExploration: 40,
  },

  // Poids pour calcul affinites utilisateur
  affinityWeights: {
    like: 3,
    follow: 5,
    comment: 2,
    click: 1,
    view_time: 0.5,
    share: 4,
    save: 3,
  } as Record<string, number>,

  // Cache
  cache: {
    userPrefsTTLMs: 60 * 60 * 1000,   // 1h avant recalcul preferences
    recoTTLMs: 2 * 60 * 1000,          // 2min cache recommandations par user
    maxRecentlyViewed: 200,
    maxRecentlyRecommended: 500,
  },

  // Freshness decay
  freshness: {
    halfLifeDays: 7, // Les projets de >7j perdent 50% du score freshness
  },
};
