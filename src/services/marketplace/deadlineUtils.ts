/**
 * deadlineUtils — Utilitaires purs pour le calcul des deadlines commandes
 * Pas de dependance DB, fonctions pures uniquement.
 */

// ============ CONSTANTES ============

export const DELAI_DEFAUT_SECONDS = 259200; // 3 jours
export const MAX_EXTENSIONS = 5;
export const MIN_EXTENSION_SECONDS = 3600; // 1 heure
export const MAX_EXTENSION_SECONDS = 604800; // 7 jours

// ============ PARSING ============

/**
 * Parse une string "delaiLivraison" du service en secondes.
 * Formats supportes : "3 jours", "1 semaine", "48 heures", "2 semaines", etc.
 * Fallback : DELAI_DEFAUT_SECONDS (3 jours)
 */
export function parseDelaiLivraison(delai: string | null | undefined): number {
  if (!delai || typeof delai !== 'string') return DELAI_DEFAUT_SECONDS;

  const lower = delai.trim().toLowerCase();

  // Pattern: "<nombre> <unite>"
  const match = lower.match(/^(\d+)\s*(heure|heures|jour|jours|semaine|semaines)$/);
  if (!match) return DELAI_DEFAUT_SECONDS;

  const nombre = parseInt(match[1], 10);
  if (isNaN(nombre) || nombre <= 0) return DELAI_DEFAUT_SECONDS;

  const unite = match[2];
  if (unite.startsWith('heure')) return nombre * 3600;
  if (unite.startsWith('jour')) return nombre * 86400;
  if (unite.startsWith('semaine')) return nombre * 604800;

  return DELAI_DEFAUT_SECONDS;
}

// ============ CALCULS ============

/**
 * Calcule la date de deadline a partir de la date d'acceptation + duree en secondes
 */
export function computeDeadline(acceptedAt: Date, totalSeconds: number): Date {
  return new Date(acceptedAt.getTime() + totalSeconds * 1000);
}

/**
 * Champs deadline calcules a la volee (Option A — pas de cron)
 */
export interface DeadlineFields {
  remainingSeconds: number;
  isLate: boolean;
  lateSince: Date | null;
  deadlineActive: boolean;
}

/**
 * Calcule les champs deadline d'une commande.
 * `order` doit avoir au minimum : acceptedAt, currentDeadlineAt, statut, isLate, lateSince
 */
export function computeDeadlineFields(order: {
  acceptedAt?: Date | null;
  currentDeadlineAt?: Date | null;
  statut: string;
  isLate?: boolean;
  lateSince?: Date | null;
}): DeadlineFields {
  // Pas de deadline si pas acceptee ou pas de deadline definie
  if (!order.acceptedAt || !order.currentDeadlineAt) {
    return { remainingSeconds: 0, isLate: false, lateSince: null, deadlineActive: false };
  }

  // Deadline n'est active que pour certains statuts
  const statutsActifs = ['acceptee', 'en_cours'];
  if (!statutsActifs.includes(order.statut)) {
    return {
      remainingSeconds: 0,
      isLate: order.isLate || false,
      lateSince: order.lateSince || null,
      deadlineActive: false,
    };
  }

  const now = new Date();
  const deadlineMs = new Date(order.currentDeadlineAt).getTime();
  const remainingMs = deadlineMs - now.getTime();
  const remainingSeconds = Math.floor(remainingMs / 1000);

  const isLate = remainingSeconds <= 0;
  // Si en retard pour la premiere fois, lateSince = maintenant
  // Sinon on garde la valeur existante
  const lateSince = isLate
    ? (order.lateSince || now)
    : null;

  return {
    remainingSeconds: Math.max(0, remainingSeconds),
    isLate,
    lateSince,
    deadlineActive: true,
  };
}

// ============ VALIDATION EXTENSIONS ============

export interface ExtensionValidation {
  ok: boolean;
  message: string;
}

/**
 * Valide qu'une extension est possible (min/max/count)
 */
export function validerExtension(
  secondsAdded: number,
  extensions: Array<{ secondsAdded: number }>,
): ExtensionValidation {
  if (extensions.length >= MAX_EXTENSIONS) {
    return { ok: false, message: `Maximum ${MAX_EXTENSIONS} extensions atteint` };
  }
  if (secondsAdded < MIN_EXTENSION_SECONDS) {
    return { ok: false, message: 'Extension minimum : 1 heure' };
  }
  if (secondsAdded > MAX_EXTENSION_SECONDS) {
    return { ok: false, message: 'Extension maximum : 7 jours' };
  }
  return { ok: true, message: '' };
}

/**
 * Formate une duree en secondes en texte lisible ("2 jours", "5 heures")
 */
export function formatDuree(seconds: number): string {
  if (seconds >= 86400) {
    const jours = Math.round(seconds / 86400);
    return `${jours} jour${jours > 1 ? 's' : ''}`;
  }
  const heures = Math.round(seconds / 3600);
  return `${heures} heure${heures > 1 ? 's' : ''}`;
}
