/**
 * Service API - La Première Pierre Mobile
 * Gestion des appels HTTP vers le backend
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

// Callback global pour les restrictions de compte
// Sera défini par le UserContext pour déclencher la déconnexion forcée
let onAccountRestricted: ((info: AccountRestrictionInfo) => void) | null = null;

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
 * Récupérer le token depuis le stockage sécurisé
 */
export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
};

/**
 * Sauvegarder le token
 */
export const setToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token);
};

/**
 * Supprimer le token
 */
export const removeToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
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
    const token = await getToken();
    if (token) {
      headersComplets['Authorization'] = `Bearer ${token}`;
    }
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

    const data: ReponseAPI<T> & { code?: string; suspendedUntil?: string } = await response.json();

    // Gérer les comptes bannis/suspendus (403)
    if (response.status === 403) {
      if (data.code === 'ACCOUNT_BANNED') {
        // Déconnexion forcée et notification globale
        await removeToken();
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
        // Déconnexion forcée avec info de suspension
        await removeToken();
        const info: AccountRestrictionInfo = {
          type: 'ACCOUNT_SUSPENDED',
          message: data.message || 'Votre compte est temporairement suspendu.',
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
