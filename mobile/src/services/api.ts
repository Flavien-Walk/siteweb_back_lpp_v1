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

    const data: ReponseAPI<T> = await response.json();

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

    console.error('Erreur API:', error);
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
