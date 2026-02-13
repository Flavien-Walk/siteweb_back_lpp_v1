import type { User } from '@/types'

/**
 * Calcule un score de risque (0-100) pour un utilisateur
 * Utilisé côté frontend pour l'affichage temps réel
 * Le backend calcule aussi ce score pour le tri
 */
export function computeRiskScore(user: User): number {
  let score = 0

  // Warnings actifs
  const warningCount = user.warnings?.length || 0
  score += warningCount * 8

  // Reports reçus
  const reportsCount = user.reportsReceivedCount || 0
  score += reportsCount * 5

  // Suspension active
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    score += 10
  }

  // Sous surveillance
  if (user.surveillance?.active) {
    score += 5
  }

  // Ancienneté du compte (compte récent = plus risqué)
  if (user.dateCreation) {
    const ageMs = Date.now() - new Date(user.dateCreation).getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    if (ageDays < 7) score += 10
    else if (ageDays < 30) score += 5
  }

  return Math.min(100, score)
}
