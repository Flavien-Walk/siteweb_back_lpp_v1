/**
 * Configuration du systeme de trending
 * Tous les parametres sont ajustables sans modifier le code
 */

export const TRENDING_CONFIG = {
  // Poids par type d'engagement
  weights: {
    like: 1,
    comment: 3,
    follow: 4,
    share: 5,
    save: 3,
    view: 0.1,
    click: 0.3,
    impression: 0.02,
    // Events negatifs (deduisent)
    unlike: -0.5,
    unfollow: -2,
  } as Record<string, number>,

  // Decay temporel exponentiel
  decay: {
    halfLifeHours: 36, // Demi-vie en heures
  },

  // Velocity (acceleration)
  velocity: {
    shortWindowHours: 6,
    longWindowHours: 24,
    boostFactor: 1.5, // Multiplicateur max quand velocity haute
    minBoost: 1.0,    // Pas de penalite, juste un boost
  },

  // Anti-spam
  antiSpam: {
    minImpressions: 5,              // Minimum impressions pour etre eligible
    minUniqueActors: 3,             // Minimum d'acteurs uniques
    maxSameActorRatio: 0.5,         // Max 50% d'engagement du meme user
    newAccountThresholdHours: 48,   // Comptes < 48h consideres "nouveaux"
    newAccountWeightReduction: 0.8, // -80% poids pour comptes nouveaux
    maxPenalty: 0.9,                // Penalite max (on ne zero jamais)
  },

  // Qualite du profil projet
  quality: {
    minScore: 0.3, // Score minimum (projets incomplets)
    fieldWeights: {
      hasImage: 0.15,
      hasDescription: 0.15,
      hasPitch: 0.15,
      hasTags: 0.1,
      hasTeam: 0.1,
      hasLinks: 0.1,
      hasLocation: 0.1,
      maturityBonus: 0.15, // prototype+ = bonus
    } as Record<string, number>,
  },

  // Refresh et cache
  refresh: {
    intervalMs: 5 * 60 * 1000,   // Recalcul toutes les 5 min
    cacheTTLMs: 60 * 1000,       // Cache endpoint 1 min
  },
};
