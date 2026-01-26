/**
 * Service API - La Première Pierre
 * Gestion des appels HTTP vers le backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
 * Récupérer le token depuis le localStorage
 */
const getToken = (): string | null => {
  return localStorage.getItem('lpp_token');
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
    const token = getToken();
    if (token) {
      headersComplets['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: headersComplets,
      body: body ? JSON.stringify(body) : undefined,
    });

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
    console.error('Erreur API:', error);
    return {
      succes: false,
      message: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
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

  delete: <T>(endpoint: string, avecAuth = false) =>
    requeteAPI<T>(endpoint, { method: 'DELETE', avecAuth }),
};

export default api;
