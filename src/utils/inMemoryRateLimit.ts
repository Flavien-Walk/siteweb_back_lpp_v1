/**
 * Utilitaires de rate limiting en memoire
 * Remplace le pattern Map+cleanup duplique dans auth, story, report controllers
 */

/**
 * Rate limiter en memoire generique (X actions par fenetre de temps)
 */
export class InMemoryRateLimit {
  private store = new Map<string, { count: number; resetAt: number }>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private maxAttempts: number,
    private windowMs: number,
    cleanupIntervalMs: number = 5 * 60 * 1000
  ) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /** Verifie si la cle a depasse la limite */
  isLimited(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() >= entry.resetAt) {
      this.store.delete(key);
      return false;
    }

    return entry.count >= this.maxAttempts;
  }

  /** Enregistre une tentative */
  record(key: string): void {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count++;
    }
  }

  /** Reset le compteur pour une cle */
  reset(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now >= value.resetAt) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Garde anti brute-force avec lockout (pour login)
 * SEC-AUTH-03: Apres N echecs, lockout pendant X ms
 */
export class BruteForceGuard {
  private store = new Map<string, { count: number; lockedUntil: number }>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private maxAttempts: number,
    private lockoutMs: number,
    cleanupIntervalMs: number = 5 * 60 * 1000
  ) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /** Verifie si la cle est en lockout */
  checkLockout(key: string): { locked: boolean; remainingMs?: number } {
    const entry = this.store.get(key);
    if (!entry) return { locked: false };

    const now = Date.now();
    if (entry.lockedUntil > 0 && now < entry.lockedUntil) {
      return { locked: true, remainingMs: entry.lockedUntil - now };
    }

    // Lockout expire, reset
    if (entry.lockedUntil > 0 && now >= entry.lockedUntil) {
      this.store.delete(key);
      return { locked: false };
    }

    return { locked: false };
  }

  /** Enregistre un echec */
  recordFailure(key: string): void {
    const entry = this.store.get(key) || { count: 0, lockedUntil: 0 };
    entry.count++;

    if (entry.count >= this.maxAttempts) {
      entry.lockedUntil = Date.now() + this.lockoutMs;
    }

    this.store.set(key, entry);
  }

  /** Efface les compteurs pour une cle (login reussi) */
  clear(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.lockedUntil > 0 && now >= value.lockedUntil) {
        this.store.delete(key);
      }
    }
  }
}
