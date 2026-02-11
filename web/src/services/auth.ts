import api, { setToken, removeToken, getToken, setUtilisateurLocal } from './api';
import type { ReponseAPI } from './api';

export type Role = 'user' | 'modo_test' | 'modo' | 'admin_modo' | 'admin' | 'super_admin';
export type StatutUtilisateur = 'visiteur' | 'entrepreneur';

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
  emailVerifie: boolean;
  dateInscription?: string;
  nbAmis?: number;
  projetsSuivis?: number;
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

const normaliserUtilisateur = (data: any): Utilisateur => ({
  id: data.id || data._id || '',
  prenom: data.prenom || '',
  nom: data.nom || '',
  email: data.email || '',
  avatar: data.avatar || undefined,
  bio: data.bio || undefined,
  role: data.role || 'user',
  statut: data.statut || undefined,
  provider: data.provider || 'local',
  emailVerifie: data.emailVerifie ?? false,
  dateInscription: data.dateInscription || data.createdAt || undefined,
  nbAmis: data.nbAmis ?? 0,
  projetsSuivis: data.projetsSuivis ?? 0,
});

export const connexion = async (donnees: DonneesConnexion): Promise<ReponseAPI<ReponseAuth>> => {
  const reponse = await api.post<ReponseAuth>('/auth/connexion', donnees);
  if (reponse.succes && reponse.data) {
    reponse.data.utilisateur = normaliserUtilisateur(reponse.data.utilisateur);
    setToken(reponse.data.token);
    setUtilisateurLocal(reponse.data.utilisateur);
  }
  return reponse;
};

export const inscription = async (donnees: DonneesInscription): Promise<ReponseAPI<ReponseAuth>> => {
  const reponse = await api.post<ReponseAuth>('/auth/inscription', donnees);
  if (reponse.succes && reponse.data) {
    reponse.data.utilisateur = normaliserUtilisateur(reponse.data.utilisateur);
    setToken(reponse.data.token);
    setUtilisateurLocal(reponse.data.utilisateur);
  }
  return reponse;
};

export const getMoi = async (): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.get<{ utilisateur: any }>('/auth/moi', true);
  if (reponse.succes && reponse.data) {
    reponse.data.utilisateur = normaliserUtilisateur(reponse.data.utilisateur);
  }
  return reponse as ReponseAPI<{ utilisateur: Utilisateur }>;
};

export const deconnexion = (): void => {
  removeToken();
};

export const modifierProfil = async (
  donnees: { prenom?: string; nom?: string; email?: string; bio?: string }
): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.patch<{ utilisateur: any }>('/profil', donnees, true);
  if (reponse.succes && reponse.data) {
    reponse.data.utilisateur = normaliserUtilisateur(reponse.data.utilisateur);
    setUtilisateurLocal(reponse.data.utilisateur);
  }
  return reponse as ReponseAPI<{ utilisateur: Utilisateur }>;
};

export const modifierAvatar = async (
  avatar: string | null
): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.patch<{ utilisateur: any }>('/profil/avatar', { avatar }, true);
  if (reponse.succes && reponse.data) {
    reponse.data.utilisateur = normaliserUtilisateur(reponse.data.utilisateur);
    setUtilisateurLocal(reponse.data.utilisateur);
  }
  return reponse as ReponseAPI<{ utilisateur: Utilisateur }>;
};

export const modifierStatut = async (
  statut: StatutUtilisateur
): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  const reponse = await api.patch<{ utilisateur: any }>('/profil/statut', { statut }, true);
  if (reponse.succes && reponse.data) {
    reponse.data.utilisateur = normaliserUtilisateur(reponse.data.utilisateur);
    setUtilisateurLocal(reponse.data.utilisateur);
  }
  return reponse as ReponseAPI<{ utilisateur: Utilisateur }>;
};

export const getAvatarsDefaut = async (): Promise<ReponseAPI<{ avatars: string[] }>> => {
  return api.get<{ avatars: string[] }>('/profil/avatars', false);
};

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

export const supprimerCompte = async (motDePasse: string): Promise<ReponseAPI<void>> => {
  return api.delete<void>('/profil', true, { motDePasse });
};

export { getToken };
