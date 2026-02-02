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
 * Echanger un code temporaire contre un token JWT
 * POST /api/auth/exchange-code
 */
const echangerCodeContreToken = async (
  code: string
): Promise<{ succes: boolean; data?: { utilisateur: Utilisateur; token: string }; message?: string }> => {
  try {
    const response = await fetch(`${API_URL}/auth/exchange-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (response.ok && data.succes) {
      return {
        succes: true,
        data: data.data,
      };
    }

    // Gerer les erreurs specifiques (ban, suspension)
    if (data.code === 'ACCOUNT_BANNED') {
      return {
        succes: false,
        message: 'Votre compte a été suspendu définitivement.',
      };
    }

    if (data.code === 'ACCOUNT_SUSPENDED') {
      return {
        succes: false,
        message: 'Votre compte est temporairement suspendu.',
      };
    }

    return {
      succes: false,
      message: data.message || 'Code invalide ou expiré',
    };
  } catch (error) {
    console.error('Erreur exchange-code:', error);
    return {
      succes: false,
      message: 'Erreur de connexion au serveur',
    };
  }
};

/**
 * Traiter le callback OAuth
 * Extrait le code de l'URL et l'échange contre un token sécurisé
 *
 * SECURITE: Le token n'est jamais exposé dans l'URL
 * Le backend renvoie un code temporaire one-time que nous échangeons
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

    // Récupérer le code temporaire (nouveau flux sécurisé)
    const code = params.code as string;

    // Rétrocompatibilité: supporter l'ancien flux avec token direct (à supprimer plus tard)
    const legacyToken = params.token as string;

    if (code) {
      // Nouveau flux sécurisé: échanger le code contre un token
      const exchangeResult = await echangerCodeContreToken(code);

      if (exchangeResult.succes && exchangeResult.data) {
        const { utilisateur, token } = exchangeResult.data;

        // Sauvegarder le token et l'utilisateur
        await setToken(token);
        await setUtilisateurLocal(utilisateur);

        return {
          succes: true,
          utilisateur,
        };
      }

      return {
        succes: false,
        message: exchangeResult.message || 'Erreur lors de l\'échange du code',
      };
    }

    // Rétrocompatibilité: ancien flux avec token direct (deprecié)
    if (legacyToken) {
      console.warn('[OAuth] Flux legacy détecté - mise à jour backend recommandée');
      await setToken(legacyToken);

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
    }

    return {
      succes: false,
      message: 'Code ou token manquant dans la réponse',
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
    case 'oauth_csrf_invalide':
      return 'Session expirée. Réessaie.';
    case 'google_echec':
      return 'Connexion Google impossible. Réessaie.';
    case 'apple_echec':
      return 'Connexion Apple impossible. Réessaie.';
    case 'compte_banni':
      return 'Ton compte a été suspendu définitivement.';
    case 'compte_suspendu':
      return 'Ton compte est temporairement suspendu.';
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
