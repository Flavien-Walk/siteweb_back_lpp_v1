/**
 * Service d'authentification - La Première Pierre
 */

import api, { ReponseAPI } from './api';

// Types
export interface Utilisateur {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  avatar?: string;
  provider: 'local' | 'google' | 'facebook' | 'apple';
  emailVerifie?: boolean;
  dateCreation?: string;
}

export interface DonneesInscription {
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  confirmationMotDePasse: string;
  cguAcceptees: boolean;
}

export interface DonneesConnexion {
  email: string;
  motDePasse: string;
}

export interface ReponseAuth {
  utilisateur: Utilisateur;
  token: string;
}

const TOKEN_KEY = 'lpp_token';
const USER_KEY = 'lpp_user';

/**
 * Sauvegarder le token et l'utilisateur
 */
const sauvegarderSession = (token: string, utilisateur: Utilisateur): void => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(utilisateur));
};

/**
 * Effacer la session
 */
const effacerSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/**
 * Récupérer l'utilisateur depuis le localStorage
 */
export const getUtilisateurLocal = (): Utilisateur | null => {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Récupérer le token
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Vérifier si l'utilisateur est connecté
 */
export const estConnecte = (): boolean => {
  return !!getToken();
};

/**
 * Inscription d'un nouvel utilisateur
 */
export const inscription = async (
  donnees: DonneesInscription
): Promise<ReponseAPI<ReponseAuth>> => {
  const reponse = await api.post<ReponseAuth>('/auth/inscription', donnees);

  if (reponse.succes && reponse.data) {
    sauvegarderSession(reponse.data.token, reponse.data.utilisateur);
  }

  return reponse;
};

/**
 * Connexion d'un utilisateur
 */
export const connexion = async (
  donnees: DonneesConnexion
): Promise<ReponseAPI<ReponseAuth>> => {
  const reponse = await api.post<ReponseAuth>('/auth/connexion', donnees);

  if (reponse.succes && reponse.data) {
    sauvegarderSession(reponse.data.token, reponse.data.utilisateur);
  }

  return reponse;
};

/**
 * Déconnexion
 */
export const deconnexion = (): void => {
  effacerSession();
};

/**
 * Récupérer le profil de l'utilisateur connecté
 */
export const getMoi = async (): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.get<{ utilisateur: Utilisateur }>('/auth/moi', true);

  if (reponse.succes && reponse.data) {
    localStorage.setItem(USER_KEY, JSON.stringify(reponse.data.utilisateur));
  }

  return reponse;
};

/**
 * Gérer le callback OAuth (récupérer le token de l'URL)
 */
export const gererCallbackOAuth = (): { succes: boolean; erreur?: string } => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const erreur = params.get('erreur');

  if (erreur) {
    return { succes: false, erreur };
  }

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    // Nettoyer l'URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return { succes: true };
  }

  return { succes: false };
};

/**
 * URL pour OAuth
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const urlOAuth = {
  google: `${API_BASE_URL}/auth/google`,
  facebook: `${API_BASE_URL}/auth/facebook`,
  apple: `${API_BASE_URL}/auth/apple`,
};

/**
 * Vérifier l'email avec un code 6 chiffres
 */
export const verifierEmail = async (
  code: string
): Promise<ReponseAPI<{ emailVerifie: boolean }>> => {
  const reponse = await api.post<{ emailVerifie: boolean }>('/auth/verifier-email', { code }, true);

  if (reponse.succes && reponse.data) {
    // Mettre à jour l'utilisateur local
    const user = getUtilisateurLocal();
    if (user) {
      user.emailVerifie = true;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  return reponse;
};

/**
 * Renvoyer le code de vérification email
 */
export const renvoyerCodeVerification = async (): Promise<ReponseAPI<void>> => {
  return api.post<void>('/auth/renvoyer-code', {}, true);
};

export default {
  inscription,
  connexion,
  deconnexion,
  getMoi,
  getUtilisateurLocal,
  getToken,
  estConnecte,
  gererCallbackOAuth,
  urlOAuth,
  verifierEmail,
  renvoyerCodeVerification,
};
