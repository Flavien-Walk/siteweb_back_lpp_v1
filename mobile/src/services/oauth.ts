/**
 * Service OAuth - Connexion via Google/Apple
 * Gère le flow OAuth pour les clients mobiles
 *
 * Flow: bouton Google → pre-warm backend → browser OAuth → callback → exchange code → JWT
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
  // Linking flow : compte local existant avec le même email
  linkRequired?: boolean;
  linkToken?: string;
  linkEmail?: string;
}

// Compléter la session OAuth (requis par expo-web-browser)
WebBrowser.maybeCompleteAuthSession();

/**
 * URL de base de l'API (sans /api)
 */
const getBaseUrl = (): string => {
  return API_URL.replace('/api', '');
};

// Nombre max de retries pour l'echange de code (cold start Render)
const MAX_RETRIES = 3;

/**
 * Pre-warm le backend Render pour eviter le cold start
 * pendant que le navigateur s'ouvre sur Google OAuth.
 * Non-bloquant : on attend max 8s puis on continue.
 */
const prewarmBackend = async (): Promise<void> => {
  try {
    if (__DEV__) console.debug('[OAuth] Pre-warming backend...');
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    await fetch(API_URL, { method: 'HEAD', signal: ctrl.signal }).catch(() => {});
    clearTimeout(tid);
    if (__DEV__) console.debug('[OAuth] Backend warm');
  } catch {
    // Ignore — juste un pre-warm
  }
};

/**
 * Initier le flow OAuth
 * 1. Pre-warm le backend (cold start Render)
 * 2. Ouvre le navigateur système vers l'endpoint OAuth du backend
 * 3. Traite le callback (code temporaire → JWT)
 */
export const lancerOAuth = async (provider: OAuthProvider): Promise<OAuthResult> => {
  try {
    // Pre-warm Render avant d'ouvrir le browser
    await prewarmBackend();

    // URL de retour dynamique (Expo Go = exp://..., standalone = lpp://...)
    const redirectUrl = Linking.createURL('auth/callback');
    if (__DEV__) console.debug('[OAuth] redirectUrl:', redirectUrl);

    // URL OAuth du backend — route mobile dediee, avec redirectUrl pour le callback
    const authUrl = `${getBaseUrl()}/api/auth/${provider}/mobile?redirectUrl=${encodeURIComponent(redirectUrl)}`;

    // Ouvrir le navigateur pour l'authentification
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      redirectUrl
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
    if (__DEV__) console.error('[OAuth] Erreur lancerOAuth:', error);
    return {
      succes: false,
      message: 'Impossible de se connecter. Réessaie.',
    };
  }
};

/**
 * Echanger un code temporaire contre un token JWT
 * POST /api/auth/exchange-code
 *
 * Retry automatique avec backoff exponentiel (1s, 2s, 4s)
 * pour gerer le cold start Render sur le POST apres callback.
 */
const echangerCodeContreToken = async (
  code: string
): Promise<{ succes: boolean; data?: { utilisateur: Utilisateur; token: string }; message?: string }> => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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

      // Erreurs applicatives → pas de retry (le serveur a repondu)
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
      // Erreur reseau → retry si tentatives restantes
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        if (__DEV__) console.debug(`[OAuth] Retry exchange ${attempt + 1}/${MAX_RETRIES} dans ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (__DEV__) console.error('[OAuth] Echec exchange-code apres retries:', error);
      return {
        succes: false,
        message: 'Connexion au serveur impossible. Réessaie.',
      };
    }
  }

  return {
    succes: false,
    message: 'Connexion au serveur impossible. Réessaie.',
  };
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

    // Vérifier si le backend demande de lier un compte existant
    if (params.status === 'link_required' && params.linkToken) {
      if (__DEV__) console.debug('[OAuth] Link required — compte existant detecte');
      return {
        succes: false,
        linkRequired: true,
        linkToken: params.linkToken as string,
        linkEmail: (params.email as string) || undefined,
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
      if (__DEV__) console.warn('[OAuth] Flux legacy detecte - mise a jour backend recommandee');
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
    if (__DEV__) console.error('[OAuth] Erreur traitement callback:', error);
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
