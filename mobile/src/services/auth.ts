/**
 * Service d'authentification
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setToken, removeToken, getToken, ReponseAPI } from './api';
import { STORAGE_KEYS } from '../constantes/config';

// Types
export type Role = 'user' | 'modo_test' | 'modo' | 'admin_modo' | 'admin' | 'super_admin';
export type StatutUtilisateur = 'visiteur' | 'entrepreneur';

// Permissions disponibles pour le staff
export type Permission =
  | 'reports:view'
  | 'reports:process'
  | 'reports:escalate'
  | 'users:view'
  | 'users:warn'
  | 'users:suspend'
  | 'users:ban'
  | 'users:unban'
  | 'users:edit_roles'
  | 'content:hide'
  | 'content:delete'
  | 'audit:view'
  | 'audit:export'
  | 'config:view'
  | 'config:edit'
  | 'staff:chat';

export interface Utilisateur {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  avatar?: string;
  bio?: string;
  role: Role;
  statut?: StatutUtilisateur;
  provider: 'local' | 'google' | 'facebook' | 'apple';
  profilPublic?: boolean;
  emailVerifie: boolean;
  dateInscription?: string;
  nbAmis?: number;
  projetsSuivis?: number;
  // Champs staff (renvoyés par /api/auth/moi si staff)
  isStaff?: boolean;
  permissions?: Permission[];
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
 * Normalise les données utilisateur de l'API
 * Transforme _id en id et s'assure que tous les champs sont présents
 */
const normaliserUtilisateur = (data: any): Utilisateur => {
  return {
    id: data.id || data._id || '',
    prenom: data.prenom || '',
    nom: data.nom || '',
    email: data.email || '',
    avatar: data.avatar || undefined,
    bio: data.bio || undefined,
    role: data.role || 'user',
    statut: data.statut || undefined,
    provider: data.provider || 'local',
    profilPublic: data.profilPublic ?? true,
    emailVerifie: data.emailVerifie ?? false,
    dateInscription: data.dateInscription || data.createdAt || undefined,
    nbAmis: data.nbAmis ?? 0,
    projetsSuivis: data.projetsSuivis ?? 0,
    // Champs staff
    isStaff: data.isStaff ?? false,
    permissions: data.permissions || [],
  };
};

/**
 * Connexion avec email et mot de passe
 */
export const connexion = async (
  donnees: DonneesConnexion
): Promise<ReponseAPI<ReponseAuth>> => {
  const reponse = await api.post<ReponseAuth>('/auth/connexion', donnees);

  if (reponse.succes && reponse.data) {
    // Normaliser l'utilisateur (transforme _id en id)
    const utilisateurNormalise = normaliserUtilisateur(reponse.data.utilisateur);
    reponse.data.utilisateur = utilisateurNormalise;

    // Sauvegarder le token et l'utilisateur
    await setToken(reponse.data.token);
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(utilisateurNormalise)
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
    // Normaliser l'utilisateur (transforme _id en id)
    const utilisateurNormalise = normaliserUtilisateur(reponse.data.utilisateur);
    reponse.data.utilisateur = utilisateurNormalise;

    // Sauvegarder le token et l'utilisateur
    await setToken(reponse.data.token);
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(utilisateurNormalise)
    );
  }

  return reponse;
};

/**
 * Récupérer les infos de l'utilisateur connecté
 */
export const getMoi = async (): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  if (__DEV__) console.log('[AUTH:getMoi] Appel API /auth/moi...');
  const reponse = await api.get<{ utilisateur: any }>('/auth/moi', true);

  if (__DEV__) {
    console.log('[AUTH:getMoi] Reponse succes:', reponse.succes);
    if (!reponse.succes) {
      console.log('[AUTH:getMoi] Erreur:', reponse.message);
    }
  }

  if (reponse.succes && reponse.data) {
    // Normaliser l'utilisateur (transforme _id en id)
    reponse.data.utilisateur = normaliserUtilisateur(reponse.data.utilisateur);
    if (__DEV__) console.log('[AUTH:getMoi] Utilisateur:', reponse.data.utilisateur.email);
  }

  return reponse as ReponseAPI<{ utilisateur: Utilisateur }>;
};

/**
 * Type pour les infos de sanction
 */
export interface SanctionInfo {
  isRestricted: boolean;
  type?: 'ACCOUNT_BANNED' | 'ACCOUNT_SUSPENDED';
  reason?: string;
  bannedAt?: string;
  suspendedUntil?: string;
  notificationId?: string;
  notificationDate?: string;
  actorRole?: string; // Rôle du staff qui a pris la décision
  postId?: string;
  postSnapshot?: {
    contenu?: string;
    mediaUrl?: string;
  };
}

/**
 * Récupérer les informations de sanction
 * Accessible même si le compte est banni/suspendu
 */
export const getSanctionInfo = async (): Promise<ReponseAPI<SanctionInfo>> => {
  return await api.get<SanctionInfo>('/auth/sanction-info', true);
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
    if (!data) return null;
    // Normaliser les données récupérées (au cas où stockées avec _id)
    return normaliserUtilisateur(JSON.parse(data));
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
  donnees: { prenom?: string; nom?: string; email?: string; bio?: string; profilPublic?: boolean }
): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.patch<{ utilisateur: any }>('/profil', donnees, true);

  if (reponse.succes && reponse.data) {
    // Normaliser et mettre à jour l'utilisateur en local
    const utilisateurNormalise = normaliserUtilisateur(reponse.data.utilisateur);
    reponse.data.utilisateur = utilisateurNormalise;
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(utilisateurNormalise)
    );
  }

  return reponse as ReponseAPI<{ utilisateur: Utilisateur }>;
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
  const reponse = await api.patch<{ utilisateur: any }>('/profil/avatar', { avatar }, true);

  if (reponse.succes && reponse.data) {
    // Normaliser et mettre à jour l'utilisateur en local
    const utilisateurNormalise = normaliserUtilisateur(reponse.data.utilisateur);
    reponse.data.utilisateur = utilisateurNormalise;
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(utilisateurNormalise)
    );
  }

  return reponse as ReponseAPI<{ utilisateur: Utilisateur }>;
};

/**
 * Modifier le statut de l'utilisateur (visiteur ou entrepreneur)
 */
export const modifierStatut = async (
  statut: StatutUtilisateur
): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.patch<{ utilisateur: any }>('/profil/statut', { statut }, true);

  if (reponse.succes && reponse.data) {
    // Normaliser et mettre à jour l'utilisateur en local
    const utilisateurNormalise = normaliserUtilisateur(reponse.data.utilisateur);
    reponse.data.utilisateur = utilisateurNormalise;
    await AsyncStorage.setItem(
      STORAGE_KEYS.UTILISATEUR,
      JSON.stringify(utilisateurNormalise)
    );
  }

  return reponse as ReponseAPI<{ utilisateur: Utilisateur }>;
};

/**
 * Mettre à jour l'utilisateur local (pour synchronisation)
 */
export const setUtilisateurLocal = async (utilisateur: Utilisateur | any): Promise<void> => {
  // Normaliser avant de sauvegarder
  const utilisateurNormalise = normaliserUtilisateur(utilisateur);
  await AsyncStorage.setItem(
    STORAGE_KEYS.UTILISATEUR,
    JSON.stringify(utilisateurNormalise)
  );
};

/**
 * Type pour un item de l'historique des sanctions
 */
export interface SanctionHistoryItem {
  type: 'ban' | 'suspend' | 'warn' | 'unban' | 'unsuspend' | 'unwarn';
  createdAt: string;
  titre: string;
  message: string;
  reason?: string;
  actorRole?: string;
  suspendedUntil?: string;
  postSnapshot?: {
    contenu?: string;
    mediaUrl?: string;
  };
}

/**
 * Récupérer l'historique des sanctions de l'utilisateur connecté
 * Accessible même si le compte est banni/suspendu
 */
export const getMySanctions = async (): Promise<ReponseAPI<{ sanctions: SanctionHistoryItem[] }>> => {
  return await api.get<{ sanctions: SanctionHistoryItem[] }>('/auth/my-sanctions', true);
};

/**
 * Type pour le statut de modération
 */
export interface ModerationStatus {
  status: 'active' | 'suspended' | 'banned';
  warnCountSinceLastAutoSuspension: number;
  warningsBeforeNextSanction: number;
  autoSuspensionsCount: number;
  nextAutoAction: 'suspend' | 'ban';
  // Infos supplémentaires si suspendu
  suspendedUntil?: string;
  suspendReason?: string;
  // Infos supplémentaires si banni
  bannedAt?: string;
  banReason?: string;
}

/**
 * Récupérer le statut de modération de l'utilisateur connecté
 * Accessible même si le compte est banni/suspendu
 * Utilisé pour afficher le compteur d'avertissements (ex: "2/3")
 */
export const getModerationStatus = async (): Promise<ReponseAPI<ModerationStatus>> => {
  return await api.get<ModerationStatus>('/auth/moderation-status', true);
};

export { getToken };
