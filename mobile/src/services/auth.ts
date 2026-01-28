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

export { getToken };
