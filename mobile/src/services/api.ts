/**
 * Service API - Client HTTP pour l'application mobile
 *
 * Fonctionnalités:
 * - Gestion du token JWT
 * - Interception des erreurs 403 (compte banni/suspendu)
 * - Déconnexion automatique si compte restreint
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://siteweb-back-lpp-v1.onrender.com/api';
const TOKEN_KEY = '@auth_token';

// Types
export interface ReponseAPI<T = unknown> {
  succes: boolean;
  message?: string;
  data?: T;
  code?: string;
  suspendedUntil?: string;
}

interface AccountRestrictedInfo {
  type: 'banned' | 'suspended';
  message: string;
  suspendedUntil?: string;
}

// Callback pour gérer la déconnexion (à définir depuis le contexte d'auth)
let onAccountRestricted: ((info: AccountRestrictedInfo) => void) | null = null;

/**
 * Définir le callback appelé quand un compte est banni/suspendu
 * À appeler depuis le AuthContext au montage de l'app
 */
export const setAccountRestrictedHandler = (
  handler: (info: AccountRestrictedInfo) => void
): void => {
  onAccountRestricted = handler;
};

/**
 * Récupérer le token JWT stocké
 */
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Sauvegarder le token JWT
 */
export const setToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
};

/**
 * Supprimer le token JWT (logout)
 */
export const removeToken = async (): Promise<void> => {
  await AsyncStorage.removeItem(TOKEN_KEY);
};

/**
 * Gérer les réponses 403 (compte banni ou suspendu)
 */
const handle403Response = (response: ReponseAPI): void => {
  const code = response.code;

  if (code === 'ACCOUNT_BANNED') {
    const info: AccountRestrictedInfo = {
      type: 'banned',
      message: response.message || 'Votre compte a été suspendu définitivement.',
    };

    // Supprimer le token
    removeToken();

    // Notifier l'app (pour navigation vers écran restriction)
    if (onAccountRestricted) {
      onAccountRestricted(info);
    } else {
      // Fallback: Alert simple
      Alert.alert(
        'Compte banni',
        info.message,
        [{ text: 'OK' }]
      );
    }
  } else if (code === 'ACCOUNT_SUSPENDED') {
    const suspendedUntil = response.suspendedUntil;
    const dateStr = suspendedUntil
      ? new Date(suspendedUntil).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'une date ultérieure';

    const info: AccountRestrictedInfo = {
      type: 'suspended',
      message: `Votre compte est suspendu jusqu'au ${dateStr}.`,
      suspendedUntil,
    };

    // Supprimer le token
    removeToken();

    // Notifier l'app
    if (onAccountRestricted) {
      onAccountRestricted(info);
    } else {
      Alert.alert(
        'Compte suspendu',
        info.message,
        [{ text: 'OK' }]
      );
    }
  }
};

/**
 * Effectuer une requête HTTP
 */
const request = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: object,
  requiresAuth = false
): Promise<ReponseAPI<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Ajouter le token si authentification requise
  if (requiresAuth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: ReponseAPI<T> = await response.json();

    // Intercepter les 403 pour banned/suspended
    if (response.status === 403) {
      if (data.code === 'ACCOUNT_BANNED' || data.code === 'ACCOUNT_SUSPENDED') {
        handle403Response(data);
        throw new Error(data.message || 'Accès refusé');
      }
    }

    // Gérer les autres erreurs
    if (!response.ok) {
      throw new Error(data.message || `Erreur ${response.status}`);
    }

    return data;
  } catch (error) {
    // Erreur réseau
    if (error instanceof TypeError && error.message === 'Network request failed') {
      return {
        succes: false,
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
      };
    }

    // Propager l'erreur
    throw error;
  }
};

/**
 * Client API avec méthodes HTTP
 */
const api = {
  get: <T>(endpoint: string, requiresAuth = false): Promise<ReponseAPI<T>> =>
    request<T>('GET', endpoint, undefined, requiresAuth),

  post: <T>(endpoint: string, body: object, requiresAuth = false): Promise<ReponseAPI<T>> =>
    request<T>('POST', endpoint, body, requiresAuth),

  put: <T>(endpoint: string, body: object, requiresAuth = false): Promise<ReponseAPI<T>> =>
    request<T>('PUT', endpoint, body, requiresAuth),

  patch: <T>(endpoint: string, body: object, requiresAuth = false): Promise<ReponseAPI<T>> =>
    request<T>('PATCH', endpoint, body, requiresAuth),

  delete: <T>(endpoint: string, requiresAuth = false): Promise<ReponseAPI<T>> =>
    request<T>('DELETE', endpoint, undefined, requiresAuth),
};

export default api;
