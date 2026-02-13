// API service for La Premiere Pierre Web
// Based on mobile service but adapted for web (localStorage)

const API_URL = import.meta.env.VITE_API_URL || 'https://siteweb-back-lpp-v1.onrender.com/api';
// Dériver l'URL Socket du VITE_API_URL (retirer /api) ou fallback
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'https://siteweb-back-lpp-v1.onrender.com');

export interface ReponseAPI<T = unknown> {
  succes: boolean;
  message?: string;
  data?: T;
  erreurs?: Record<string, string>;
}

const TOKEN_KEY = 'lpp_token';
const USER_KEY = 'lpp_utilisateur';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getUtilisateurLocal = <T>(): T | null => {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

export const setUtilisateurLocal = <T>(user: T): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

interface OptionsRequete {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  avecAuth?: boolean;
}

export const requeteAPI = async <T>(
  endpoint: string,
  options: OptionsRequete = {}
): Promise<ReponseAPI<T>> => {
  const { method = 'GET', body, headers = {}, avecAuth = false } = options;

  const headersComplets: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (avecAuth) {
    const token = getToken();
    if (!token) {
      return {
        succes: false,
        message: 'Session expirée. Veuillez vous reconnecter.',
        erreurs: { code: 'AUTH_MISSING_TOKEN' },
      };
    }
    headersComplets['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: headersComplets,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {
        succes: false,
        message: response.status === 404 ? 'Ressource non trouvée' : 'Erreur serveur',
      };
    }

    const data = await response.json();

    if (response.status === 401 && avecAuth) {
      removeToken();
      window.location.href = '/connexion';
      return {
        succes: false,
        message: 'Session expirée. Veuillez vous reconnecter.',
        erreurs: { code: 'AUTH_TOKEN_EXPIRED' },
      };
    }

    // Gérer les comptes bannis/suspendus (403 avec code spécifique)
    if (response.status === 403 && data.code === 'ACCOUNT_BANNED') {
      removeToken();
      window.location.href = '/connexion';
      return {
        succes: false,
        message: data.message || 'Votre compte a été suspendu définitivement.',
        erreurs: { code: 'ACCOUNT_BANNED' },
      };
    }
    if (response.status === 403 && data.code === 'ACCOUNT_SUSPENDED') {
      removeToken();
      window.location.href = '/connexion';
      return {
        succes: false,
        message: data.message || 'Votre compte est temporairement suspendu.',
        erreurs: { code: 'ACCOUNT_SUSPENDED' },
      };
    }

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
        message: 'La requête a pris trop de temps.',
      };
    }
    return {
      succes: false,
      message: 'Impossible de contacter le serveur.',
    };
  }
};

const api = {
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
