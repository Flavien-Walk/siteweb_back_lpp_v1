import crypto from 'crypto';

/**
 * OAuth Security Store
 * Gere les states CSRF et les codes temporaires pour le flux OAuth securise
 *
 * Securite:
 * - States CSRF: valides 10 minutes, usage unique
 * - Codes temporaires: valides 5 minutes, usage unique
 * - Nettoyage automatique des entrees expirees
 */

interface StateEntry {
  nonce: string;
  platform: 'web' | 'mobile';
  createdAt: number;
}

interface CodeEntry {
  userId: string;
  createdAt: number;
}

interface LinkStoreEntry {
  userId: string;
  email: string;
  googleId: string;
  googleName: string;
  googleAvatar?: string;
  otpHash?: string;
  otpExpire?: number;
  createdAt: number;
}

// Stores en memoire (remplacer par Redis en production pour multi-instance)
const stateStore = new Map<string, StateEntry>();
const codeStore = new Map<string, CodeEntry>();
const linkStore = new Map<string, LinkStoreEntry>();

// TTL en millisecondes
const STATE_TTL = 10 * 60 * 1000; // 10 minutes
const CODE_TTL = 5 * 60 * 1000; // 5 minutes
const LINK_TTL = 10 * 60 * 1000; // 10 minutes

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  const now = Date.now();

  for (const [key, entry] of stateStore.entries()) {
    if (now - entry.createdAt > STATE_TTL) {
      stateStore.delete(key);
    }
  }

  for (const [key, entry] of codeStore.entries()) {
    if (now - entry.createdAt > CODE_TTL) {
      codeStore.delete(key);
    }
  }

  for (const [key, entry] of linkStore.entries()) {
    if (now - entry.createdAt > LINK_TTL) {
      linkStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Genere un state OAuth securise avec nonce CSRF
 * @param platform - 'web' ou 'mobile'
 * @returns Le state encode en base64 a passer a l'OAuth provider
 */
export const generateOAuthState = (platform: 'web' | 'mobile' = 'web'): string => {
  // Generer un nonce cryptographiquement securise
  const nonce = crypto.randomBytes(32).toString('hex');

  // Stocker le nonce
  stateStore.set(nonce, {
    nonce,
    platform,
    createdAt: Date.now(),
  });

  // Encoder le state pour l'OAuth provider
  const stateData = { nonce, platform };
  return Buffer.from(JSON.stringify(stateData)).toString('base64');
};

/**
 * Valide un state OAuth et retourne les donnees associees
 * Le state est consomme (usage unique pour eviter replay attacks)
 * @param encodedState - Le state recu du callback OAuth
 * @returns Les donnees du state si valide, null sinon
 */
export const validateOAuthState = (encodedState: string): { platform: 'web' | 'mobile' } | null => {
  try {
    // Decoder le state
    const stateData = JSON.parse(Buffer.from(encodedState, 'base64').toString());
    const { nonce, platform } = stateData;

    if (!nonce || typeof nonce !== 'string') {
      return null;
    }

    // Verifier que le nonce existe et n'est pas expire
    const entry = stateStore.get(nonce);
    if (!entry) {
      return null;
    }

    // Verifier l'expiration
    if (Date.now() - entry.createdAt > STATE_TTL) {
      stateStore.delete(nonce);
      return null;
    }

    // Consommer le nonce (usage unique)
    stateStore.delete(nonce);

    return { platform: platform === 'mobile' ? 'mobile' : 'web' };
  } catch {
    return null;
  }
};

/**
 * Genere un code temporaire pour echanger contre un token
 * Ce code est court, usage unique, et expire apres 5 minutes
 * @param userId - L'ID de l'utilisateur authentifie
 * @returns Le code temporaire (12 caracteres alphanumeriques)
 */
export const generateTemporaryCode = (userId: string): string => {
  // Code de 12 caracteres alphanumeriques (suffisant pour 5 min TTL)
  const code = crypto.randomBytes(9).toString('base64url').slice(0, 12);

  codeStore.set(code, {
    userId,
    createdAt: Date.now(),
  });

  return code;
};

/**
 * Valide un code temporaire et retourne l'userId associe
 * Le code est consomme (usage unique)
 * @param code - Le code temporaire
 * @returns L'userId si valide, null sinon
 */
export const validateTemporaryCode = (code: string): string | null => {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const entry = codeStore.get(code);
  if (!entry) {
    return null;
  }

  // Verifier l'expiration
  if (Date.now() - entry.createdAt > CODE_TTL) {
    codeStore.delete(code);
    return null;
  }

  // Consommer le code (usage unique)
  codeStore.delete(code);

  return entry.userId;
};

/**
 * Genere un linkToken pour une demande de liaison de compte
 * Stocke les donnees Google + userId du compte existant
 */
export const generateLinkToken = (data: Omit<LinkStoreEntry, 'createdAt'>): string => {
  const token = crypto.randomBytes(24).toString('base64url');
  linkStore.set(token, {
    ...data,
    createdAt: Date.now(),
  });
  return token;
};

/**
 * Lit les donnees d'un linkToken SANS le consommer
 * Utilise par send-code et verify-code (le token doit rester valide)
 */
export const peekLinkToken = (token: string): LinkStoreEntry | null => {
  if (!token || typeof token !== 'string') return null;
  const entry = linkStore.get(token);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > LINK_TTL) {
    linkStore.delete(token);
    return null;
  }
  return entry;
};

/**
 * Valide et consomme un linkToken (usage unique)
 */
export const validateLinkToken = (token: string): LinkStoreEntry | null => {
  const entry = peekLinkToken(token);
  if (!entry) return null;
  linkStore.delete(token);
  return entry;
};

/**
 * Met a jour le hash OTP sur un linkToken existant
 */
export const updateLinkTokenOTP = (token: string, otpHash: string, otpExpire: number): boolean => {
  const entry = linkStore.get(token);
  if (!entry) return false;
  if (Date.now() - entry.createdAt > LINK_TTL) {
    linkStore.delete(token);
    return false;
  }
  entry.otpHash = otpHash;
  entry.otpExpire = otpExpire;
  return true;
};

// Export pour les tests
export const _getStoreSize = () => ({
  states: stateStore.size,
  codes: codeStore.size,
  links: linkStore.size,
});
