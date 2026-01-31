/**
 * Service OAuth - Connexion via Google/Apple
 * Gère le flow OAuth pour les clients mobiles
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../constantes/config';
import { setToken } from './api';
import { Utilisateur, getMoi, setUtilisateurLocal } from './auth';

// Types de providers OAuth supportés
export type OAuthProvider = 'google' | 'apple';

// Résultat de l'authentification OAuth
export interface OAuthResult {
  succes: boolean;
  message?: string;
  utilisateur?: Utilisateur;
}

// Compléter la session OAuth (requis par expo-web-browser)
WebBrowser.maybeCompleteAuthSession();

/**
 * URL de base de l'API (sans /api)
 */
const getBaseUrl = (): string => {
  return API_URL.replace('/api', '');
};

/**
 * Initier le flow OAuth
 * Ouvre le navigateur système vers l'endpoint OAuth du backend
 */
export const lancerOAuth = async (provider: OAuthProvider): Promise<OAuthResult> => {
  try {
    // URL OAuth du backend avec flag mobile
    const authUrl = `${getBaseUrl()}/api/auth/${provider}?platform=mobile`;

    // Ouvrir le navigateur pour l'authentification
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      'lpp://auth/callback'
    );

    if (result.type === 'success' && result.url) {
      // Parser l'URL de callback pour extraire le token
      return await traiterCallbackOAuth(result.url);
    }

    if (result.type === 'cancel') {
      return {
        succes: false,
        message: 'Connexion annulée',
      };
    }

    return {
      succes: false,
      message: 'Erreur lors de la connexion',
    };
  } catch (error) {
    console.error('Erreur OAuth:', error);
    return {
      succes: false,
      message: 'Impossible de se connecter. Réessaie.',
    };
  }
};

/**
 * Traiter le callback OAuth
 * Extrait le token de l'URL et récupère les infos utilisateur
 */
export const traiterCallbackOAuth = async (url: string): Promise<OAuthResult> => {
  try {
    // Parser l'URL
    const parsedUrl = Linking.parse(url);
    const params = parsedUrl.queryParams || {};

    // Vérifier s'il y a une erreur
    if (params.erreur) {
      return {
        succes: false,
        message: getErreurMessage(params.erreur as string),
      };
    }

    // Récupérer le token
    const token = params.token as string;
    if (!token) {
      return {
        succes: false,
        message: 'Token manquant dans la réponse',
      };
    }

    // Sauvegarder le token
    await setToken(token);

    // Récupérer les infos utilisateur depuis l'API
    const response = await getMoi();
    if (response.succes && response.data) {
      const utilisateur = response.data.utilisateur;
      await setUtilisateurLocal(utilisateur);

      return {
        succes: true,
        utilisateur,
      };
    }

    return {
      succes: false,
      message: 'Impossible de récupérer les informations du compte',
    };
  } catch (error) {
    console.error('Erreur traitement callback OAuth:', error);
    return {
      succes: false,
      message: 'Erreur lors de la connexion',
    };
  }
};

/**
 * Convertir les codes d'erreur en messages lisibles
 */
const getErreurMessage = (code: string): string => {
  switch (code) {
    case 'oauth_echec':
      return 'Échec de la connexion. Réessaie.';
    case 'oauth_erreur':
      return 'Une erreur est survenue. Réessaie.';
    case 'google_echec':
      return 'Connexion Google impossible. Réessaie.';
    case 'apple_echec':
      return 'Connexion Apple impossible. Réessaie.';
    default:
      return 'Erreur de connexion';
  }
};

/**
 * Connexion avec Google
 */
export const connexionGoogle = async (): Promise<OAuthResult> => {
  return lancerOAuth('google');
};

/**
 * Connexion avec Apple
 */
export const connexionApple = async (): Promise<OAuthResult> => {
  return lancerOAuth('apple');
};
