/**
 * Service d'authentification
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setToken, removeToken, getToken, ReponseAPI } from './api';
import { STORAGE_KEYS } from '../constantes/config';

// Types
export interface Utilisateur {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  avatar?: string;
  provider: 'local' | 'google' | 'facebook' | 'apple';
  emailVerifie: boolean;
}

interface DonneesConnexion {
  email: string;
  motDePasse: string;
}

interface DonneesInscription {
  prenom: string;
  nom: string;
  email: string;
  motDePasse: string;
  confirmationMotDePasse: string;
  cguAcceptees: boolean;
}

interface ReponseAuth {
  token: string;
  utilisateur: Utilisateur;
}

/**
 * Connexion avec email et mot de passe
 */
export const connexion = async (
  donnees: DonneesConnexion
): Promise<ReponseAPI<ReponseAuth>> => {
  const reponse = await api.post<ReponseAuth>('/auth/connexion', donnees);

  if (reponse.succes && reponse.data) {
    // Sauvegarder le token et l'utilisateur
    await setToken(reponse.data.token);
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(reponse.data.utilisateur)
    );
  }

  return reponse;
};

/**
 * Inscription d'un nouvel utilisateur
 */
export const inscription = async (
  donnees: DonneesInscription
): Promise<ReponseAPI<ReponseAuth>> => {
  const reponse = await api.post<ReponseAuth>('/auth/inscription', donnees);

  if (reponse.succes && reponse.data) {
    // Sauvegarder le token et l'utilisateur
    await setToken(reponse.data.token);
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(reponse.data.utilisateur)
    );
  }

  return reponse;
};

/**
 * Récupérer les infos de l'utilisateur connecté
 */
export const getMoi = async (): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  return api.get<{ utilisateur: Utilisateur }>('/auth/moi', true);
};

/**
 * Déconnexion
 */
export const deconnexion = async (): Promise<void> => {
  await removeToken();
  await AsyncStorage.removeItem(STORAGE_KEYS.UTILISATEUR);
};

/**
 * Récupérer l'utilisateur depuis le stockage local
 */
export const getUtilisateurLocal = async (): Promise<Utilisateur | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.UTILISATEUR);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Vérifier si l'utilisateur est connecté
 */
export const estConnecte = async (): Promise<boolean> => {
  const token = await getToken();
  return !!token;
};

/**
 * Modifier le profil de l'utilisateur
 */
export const modifierProfil = async (
  donnees: { prenom?: string; nom?: string; email?: string }
): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.patch<{ utilisateur: Utilisateur }>('/profil', donnees, true);

  if (reponse.succes && reponse.data) {
    // Mettre à jour l'utilisateur en local
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(reponse.data.utilisateur)
    );
  }

  return reponse;
};

/**
 * Changer le mot de passe
 */
export const modifierMotDePasse = async (
  motDePasseActuel: string,
  nouveauMotDePasse: string
): Promise<ReponseAPI<void>> => {
  return api.patch<void>('/profil/mot-de-passe', {
    motDePasseActuel,
    nouveauMotDePasse,
    confirmationMotDePasse: nouveauMotDePasse,
  }, true);
};

/**
 * Supprimer le compte
 */
export const supprimerCompte = async (
  motDePasse: string
): Promise<ReponseAPI<void>> => {
  const reponse = await api.delete<void>('/profil', true, {
    motDePasse,
    confirmation: 'SUPPRIMER MON COMPTE',
  });

  if (reponse.succes) {
    await deconnexion();
  }

  return reponse;
};

/**
 * Récupérer les avatars par défaut
 */
export const getAvatarsDefaut = async (): Promise<ReponseAPI<{ avatars: string[] }>> => {
  return api.get<{ avatars: string[] }>('/profil/avatars', false);
};

/**
 * Modifier l'avatar
 */
export const modifierAvatar = async (
  avatar: string | null
): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.patch<{ utilisateur: Utilisateur }>('/profil/avatar', { avatar }, true);

  if (reponse.succes && reponse.data) {
    // Mettre à jour l'utilisateur en local
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(reponse.data.utilisateur)
    );
  }

  return reponse;
};

export { getToken };
