/**
 * Service API - La Première Pierre Mobile
 * Gestion des appels HTTP vers le backend
 *
 * IMPORTANT: Token management avec cache mémoire pour éviter les race conditions
 * - memoryToken: source rapide (synchrone)
 * - SecureStore: source durable (persistance)
 */

import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS, TIMEOUTS } from '../constantes/config';

// Types pour les réponses API
export interface ReponseAPI<T = unknown> {
  succes: boolean;
  message?: string;
  data?: T;
  erreurs?: Record<string, string>;
}

// Type pour les événements de restriction de compte
export type AccountRestrictionType = 'ACCOUNT_BANNED' | 'ACCOUNT_SUSPENDED';
export interface AccountRestrictionInfo {
  type: AccountRestrictionType;
  message: string;
  reason?: string;
  suspendedUntil?: string;
}

// ============================================
// TOKEN MANAGEMENT - Cache mémoire + persistance
// ============================================

// Token en mémoire pour accès rapide (évite race conditions)
let memoryToken: string | null = null;

// Flag indiquant si le token a été hydraté depuis le storage
let tokenHydrated = false;

// Promise pour attendre l'hydratation
let hydrationPromise: Promise<void> | null = null;

/**
 * Hydrater le token depuis SecureStore au démarrage
 * Doit être appelé une seule fois par UserContext
 */
export const hydrateToken = async (): Promise<string | null> => {
  console.log('[API:hydrateToken] Debut - tokenHydrated:', tokenHydrated, 'memoryToken:', memoryToken ? 'present' : 'null');

  if (tokenHydrated) {
    console.log('[API:hydrateToken] Deja hydrate, retour memoryToken:', memoryToken ? 'present' : 'null');
    return memoryToken;
  }

  try {
    const storedToken = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
    memoryToken = storedToken;
    tokenHydrated = true;
    console.log('[API:hydrateToken] Hydratation OK - token:', memoryToken ? 'present' : 'absent');
    return memoryToken;
  } catch (error) {
    console.error('[API:hydrateToken] Erreur:', error);
    tokenHydrated = true;
    return null;
  }
};

/**
 * Vérifier si le token est prêt (hydraté)
 */
export const isTokenReady = (): boolean => tokenHydrated;

/**
 * Attendre que le token soit hydraté
 */
export const waitForTokenReady = async (): Promise<void> => {
  if (tokenHydrated) return;

  if (!hydrationPromise) {
    hydrationPromise = hydrateToken().then(() => {
      hydrationPromise = null;
    });
  }

  await hydrationPromise;
};

// Callback global pour les restrictions de compte
// Sera défini par le UserContext pour déclencher la déconnexion forcée
let onAccountRestricted: ((info: AccountRestrictionInfo) => void) | null = null;

// Flag pour eviter les retry en boucle
let isRetrying401 = false;

/**
 * Enregistrer le callback de restriction de compte
 * Appelé par le UserContext au montage
 */
export const setAccountRestrictionCallback = (
  callback: ((info: AccountRestrictionInfo) => void) | null
): void => {
  onAccountRestricted = callback;
};

// Options pour les requêtes
interface OptionsRequete {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  avecAuth?: boolean;
}

/**
 * Récupérer le token (mémoire d'abord, puis storage si nécessaire)
 */
export const getToken = async (): Promise<string | null> => {
  // Si déjà en mémoire, retourner immédiatement
  if (memoryToken) {
    return memoryToken;
  }

  // Si pas encore hydraté, hydrater maintenant
  if (!tokenHydrated) {
    await hydrateToken();
  }

  return memoryToken;
};

/**
 * Récupérer le token de façon synchrone (peut être null si pas hydraté)
 */
export const getTokenSync = (): string | null => memoryToken;

/**
 * Sauvegarder le token (mémoire immédiat + persistance async)
 */
export const setToken = async (token: string): Promise<void> => {
  // 1. Mettre en mémoire IMMÉDIATEMENT (synchrone)
  memoryToken = token;
  tokenHydrated = true;
  console.log('[API] Token en mémoire: OK');

  // 2. Persister dans SecureStore (async)
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token);
    console.log('[API] Token persisté: OK');
  } catch (error) {
    console.error('[API] Erreur persistance token:', error);
    // Le token reste en mémoire même si la persistance échoue
  }
};

/**
 * Supprimer le token (mémoire + storage)
 */
export const removeToken = async (): Promise<void> => {
  // Log pour tracer qui appelle removeToken
  console.log('[TOKEN] removeToken() called - stack trace:');
  console.log(new Error().stack);

  // 1. Supprimer de la mémoire immédiatement
  memoryToken = null;
  console.log('[TOKEN] Token supprime de la memoire');

  // 2. Supprimer du storage
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
    console.log('[TOKEN] Token supprime du storage');
  } catch (error) {
    console.error('[TOKEN] Erreur suppression token storage:', error);
  }
};

/**
 * Fonction principale pour effectuer des requêtes API
 */
export const requeteAPI = async <T>(
  endpoint: string,
  options: OptionsRequete = {}
): Promise<ReponseAPI<T>> => {
  const { method = 'GET', body, headers = {}, avecAuth = false } = options;

  // Construire les headers
  const headersComplets: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Ajouter le token si nécessaire
  if (avecAuth) {
    console.log('[API:requete] avecAuth=true, endpoint:', endpoint);
    console.log('[API:requete] tokenHydrated:', tokenHydrated, 'memoryToken:', memoryToken ? 'present' : 'null');

    // S'assurer que le token est hydraté
    if (!tokenHydrated) {
      console.log('[API:requete] Token pas hydrate, attente...');
      await waitForTokenReady();
      console.log('[API:requete] Apres hydratation - memoryToken:', memoryToken ? 'present' : 'null');
    }

    const token = memoryToken;

    // Si avecAuth=true et pas de token, retourner erreur contrôlée
    // SANS appeler l'API (évite 401 "Token manquant")
    if (!token) {
      console.warn('[API:requete] AUTH_MISSING_TOKEN pour:', endpoint);
      return {
        succes: false,
        message: 'Session expirée. Veuillez vous reconnecter.',
        erreurs: { code: 'AUTH_MISSING_TOKEN' },
      };
    }

    console.log('[API:requete] Token OK, appel API...');
    headersComplets['Authorization'] = `Bearer ${token}`;
  }

  // Controller pour le timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.API);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: headersComplets,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Vérifier si la réponse est du JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const texte = await response.text();
      console.warn(`Réponse non-JSON de ${endpoint}:`, texte.substring(0, 100));
      return {
        succes: false,
        message: response.status === 404 ? 'Ressource non trouvée' : 'Erreur serveur',
      };
    }

    const data: ReponseAPI<T> & { code?: string; reason?: string; suspendedUntil?: string } = await response.json();

    // Gérer les 401 Unauthorized avec retry une fois
    // IMPORTANT: On rehydrate le token et on retente UNE SEULE fois
    if (response.status === 401 && avecAuth && !isRetrying401) {
      console.log('[API:requete] 401 recu, tentative de rehydratation...');
      isRetrying401 = true;

      // Forcer la rehydratation depuis SecureStore
      tokenHydrated = false;
      memoryToken = null;
      await hydrateToken();

      // Si on a un token apres rehydratation, retenter
      if (memoryToken) {
        console.log('[API:requete] Token rehydrate, retry...');
        isRetrying401 = false;
        // Retenter la requete (recursive, mais avec flag reset)
        return requeteAPI<T>(endpoint, options);
      } else {
        console.log('[API:requete] Pas de token apres rehydratation');
        console.log('[NAV] redirect login because AUTH_TOKEN_EXPIRED (no token after rehydrate)');
        isRetrying401 = false;
        return {
          succes: false,
          message: 'Session expiree. Veuillez vous reconnecter.',
          erreurs: { code: 'AUTH_TOKEN_EXPIRED' },
        };
      }
    }
    isRetrying401 = false;

    // Gérer les comptes bannis/suspendus (403)
    // Note: on ne supprime PAS le token ici pour permettre à AccountRestrictedScreen
    // de charger les détails de la sanction via /auth/sanction-info.
    // Le token sera supprimé quand l'utilisateur clique "Retour à la connexion".
    if (response.status === 403) {
      if (data.code === 'ACCOUNT_BANNED') {
        const info: AccountRestrictionInfo = {
          type: 'ACCOUNT_BANNED',
          message: data.message || 'Votre compte a été suspendu définitivement.',
          reason: (data as any).reason,
        };
        // Notifier l'app pour déclencher la navigation vers l'écran de restriction
        if (onAccountRestricted) {
          onAccountRestricted(info);
        }
        return {
          succes: false,
          message: info.message,
          erreurs: { code: 'ACCOUNT_BANNED' },
        };
      }
      if (data.code === 'ACCOUNT_SUSPENDED') {
        const info: AccountRestrictionInfo = {
          type: 'ACCOUNT_SUSPENDED',
          message: data.message || 'Votre compte est temporairement suspendu.',
          reason: data.reason,
          suspendedUntil: data.suspendedUntil,
        };
        // Notifier l'app pour déclencher la navigation vers l'écran de restriction
        if (onAccountRestricted) {
          onAccountRestricted(info);
        }
        return {
          succes: false,
          message: info.message,
          erreurs: {
            code: 'ACCOUNT_SUSPENDED',
            suspendedUntil: data.suspendedUntil || '',
          },
        };
      }
    }

    // Gérer les erreurs HTTP
    if (!response.ok) {
      return {
        succes: false,
        message: data.message || 'Une erreur est survenue',
        erreurs: data.erreurs,
      };
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        succes: false,
        message: 'La requête a pris trop de temps. Vérifie ta connexion.',
      };
    }

    // Ne pas logger les erreurs de parsing JSON (déjà gérées)
    if (!(error instanceof SyntaxError)) {
      console.error('Erreur API:', error);
    }
    return {
      succes: false,
      message: 'Impossible de contacter le serveur. Vérifie ta connexion.',
    };
  }
};

/**
 * Raccourcis pour les méthodes HTTP courantes
 */
export const api = {
  get: <T>(endpoint: string, avecAuth = false) =>
    requeteAPI<T>(endpoint, { method: 'GET', avecAuth }),

  post: <T>(endpoint: string, body: unknown, avecAuth = false) =>
    requeteAPI<T>(endpoint, { method: 'POST', body, avecAuth }),

  put: <T>(endpoint: string, body: unknown, avecAuth = false) =>
    requeteAPI<T>(endpoint, { method: 'PUT', body, avecAuth }),

  patch: <T>(endpoint: string, body: unknown = {}, avecAuth = false) =>
    requeteAPI<T>(endpoint, { method: 'PATCH', body, avecAuth }),

  delete: <T>(endpoint: string, avecAuth = false, body?: unknown) =>
    requeteAPI<T>(endpoint, { method: 'DELETE', avecAuth, body }),
};

export default api;
