// ============================================================
// Labels centralisés & formatters pour le logiciel de modération
// ============================================================

// --- Actions audit (format backend: user_warn, content_hide, etc.) ---

export const actionLabels: Record<string, string> = {
  // Utilisateurs
  user_warn: 'Avertissement',
  user_suspend: 'Suspension',
  user_ban: 'Bannissement',
  user_unban: 'Débannissement',
  user_unsuspend: 'Levée de suspension',
  user_role_change: 'Changement de rôle',
  user_surveillance_on: 'Surveillance activée',
  user_surveillance_off: 'Surveillance retirée',
  // Signalements
  report_approve: 'Signalement approuvé',
  report_reject: 'Signalement rejeté',
  report_escalate: 'Signalement escaladé',
  report_assign: 'Signalement assigné',
  report_process: 'Signalement traité',
  // Contenu
  content_delete: 'Contenu supprimé',
  content_restore: 'Contenu restauré',
  content_hide: 'Contenu masqué',
  content_unhide: 'Contenu réaffiché',
  content_edit: 'Contenu modifié',
  // Staff
  staff_chat: 'Message staff',
}

// Format alternatif (user:warn, content:hide, etc.)
const colonToUnderscore = (s: string) => s.replace(/:/g, '_')

/** Traduit un code action (user_warn OU user:warn) en label lisible */
export function getActionLabel(action: string): string {
  const key = colonToUnderscore(action)
  return actionLabels[key] || action
}

// --- Couleurs action pour les barres de stats ---

export const actionBarColors: Record<string, string> = {
  user_warn: 'bg-amber-500',
  user_suspend: 'bg-orange-500',
  user_ban: 'bg-red-600',
  user_unban: 'bg-emerald-500',
  user_unsuspend: 'bg-teal-400',
  user_role_change: 'bg-blue-500',
  user_surveillance_on: 'bg-amber-400',
  user_surveillance_off: 'bg-zinc-500',
  report_approve: 'bg-green-500',
  report_reject: 'bg-zinc-500',
  report_escalate: 'bg-red-500',
  report_assign: 'bg-blue-400',
  report_process: 'bg-teal-500',
  content_delete: 'bg-red-400',
  content_restore: 'bg-teal-500',
  content_hide: 'bg-yellow-500',
  content_unhide: 'bg-green-400',
  content_edit: 'bg-indigo-500',
  staff_chat: 'bg-blue-500',
}

export function getActionBarColor(action: string): string {
  return actionBarColors[colonToUnderscore(action)] || 'bg-primary'
}

// --- Statuts signalement ---

export const reportStatusLabels: Record<string, string> = {
  pending: 'En attente',
  reviewed: 'Examiné',
  action_taken: 'Action prise',
  dismissed: 'Rejeté',
  escalated: 'Escaladé',
}

export function getReportStatusLabel(status: string): string {
  return reportStatusLabels[status] || status
}

// --- Raisons signalement ---

export const reportReasonLabels: Record<string, string> = {
  spam: 'Spam',
  harcelement: 'Harcèlement',
  contenu_inapproprie: 'Contenu inapproprié',
  fausse_info: 'Fausse information',
  nudite: 'Nudité',
  violence: 'Violence',
  haine: 'Discours haineux',
  autre: 'Autre',
}

export function getReasonLabel(reason: string): string {
  return reportReasonLabels[reason] || reason
}

// --- Priorités ---

export const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
}

// --- Sanctions (format user:warn, user:suspend, etc.) ---

export const sanctionLabels: Record<string, string> = {
  warn: 'Avertissement',
  suspend: 'Suspension temporaire',
  ban: 'Bannissement définitif',
  unban: 'Débannissement',
  unsuspend: 'Levée de suspension',
  'user:warn': 'Avertissement',
  'user:suspend': 'Suspension temporaire',
  'user:ban': 'Bannissement définitif',
  'user:unban': 'Débannissement',
  'user:unsuspend': 'Levée de suspension',
  user_warn: 'Avertissement',
  user_suspend: 'Suspension temporaire',
  user_ban: 'Bannissement définitif',
  user_unban: 'Débannissement',
  user_unsuspend: 'Levée de suspension',
}

export function getSanctionLabel(action: string): string {
  return sanctionLabels[action] || getActionLabel(action)
}

// --- Formatter metadata ---

const metadataKeyLabels: Record<string, string> = {
  actionTaken: 'Action effectuée',
  autoAction: 'Action automatique',
  triggerType: 'Déclencheur',
  warningsAtTrigger: 'Avertissements au déclenchement',
  warningsCount: "Nombre d'avertissements",
  suspensionDuration: 'Durée de suspension',
  previousRole: 'Ancien rôle',
  newRole: 'Nouveau rôle',
  reason: 'Raison',
  source: 'Source',
  duplicateCount: 'Signalements similaires',
  autoSuspensionsCount: 'Suspensions automatiques',
  warnCountSinceLastAutoSuspension: 'Avertissements depuis dernière suspension',
  duration: 'Durée',
  ip: 'Adresse IP',
  targetType: 'Type de cible',
  contentType: 'Type de contenu',
  oldValue: 'Ancienne valeur',
  newValue: 'Nouvelle valeur',
  suspendedUntil: 'Suspendu jusqu\'au',
  suspendedAt: 'Suspendu le',
  unsuspendedAt: 'Levée le',
  bannedAt: 'Banni le',
  unbannedAt: 'Débanni le',
  warnedAt: 'Averti le',
  expiresAt: 'Expire le',
  reportId: 'Signalement',
  userId: 'Utilisateur',
  publicationId: 'Publication',
  commentaireId: 'Commentaire',
  projetId: 'Projet',
  storyId: 'Story',
}

const metadataValueLabels: Record<string, string> = {
  none: 'Aucune',
  true: 'Oui',
  false: 'Non',
  AUTO_SUSPEND: 'Suspension automatique',
  AUTO_BAN: 'Bannissement automatique',
  MANUAL: 'Action manuelle',
  warn: 'Avertissement',
  suspend: 'Suspension',
  ban: 'Bannissement',
  web: 'Web',
  mobile: 'Mobile',
  api: 'API',
  system: 'Système',
  publication: 'Publication',
  commentaire: 'Commentaire',
  utilisateur: 'Utilisateur',
  post: 'Publication',
  story: 'Story',
  projet: 'Projet',
  user: 'Utilisateur',
  modo_test: 'Modérateur Test',
  modo: 'Modérateur',
  admin_modo: 'Administrateur',
  super_admin: 'Fondateur',
  admin: 'Administrateur',
}

/** Détecte si une chaîne ressemble à une date ISO (2026-02-04T16:54:36.008Z) */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  const str = String(value)
  // Formater les dates ISO en texte lisible
  if (ISO_DATE_RE.test(str)) {
    const d = new Date(str)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }
  return metadataValueLabels[str] || str
}

/** Convertit un objet metadata JSON en liste de paires clé-valeur lisibles */
export function formatMetadata(metadata: Record<string, unknown>): Array<{ label: string; value: string }> {
  return Object.entries(metadata)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, value]) => ({
      label: metadataKeyLabels[key] || key,
      value: formatMetadataValue(value),
    }))
}

/** Convertit une raison brute en texte plus professionnel */
export function formatReason(reason: string): string {
  // Cas : "Suspension automatique: 3 avertissements cumules"
  if (reason.includes('Suspension automatique')) {
    const match = reason.match(/(\d+)\s*avertissement/i)
    if (match) {
      return `Suspension automatique suite à ${match[1]} avertissements cumulés`
    }
    return 'Suspension automatique'
  }
  // Cas : "Bannissement automatique" ou similaire
  if (reason.includes('Bannissement automatique') || reason.includes('AUTO_BAN')) {
    return 'Bannissement automatique suite à des infractions répétées'
  }
  return reason
}
