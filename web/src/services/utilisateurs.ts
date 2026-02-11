import api from './api';
import type { ReponseAPI } from './api';

export interface ProfilUtilisateur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
  bio?: string;
  statut?: 'visiteur' | 'entrepreneur';
  dateInscription: string;
  estAmi?: boolean;
  demandeEnvoyee?: boolean;
  demandeRecue?: boolean;
  nbAmis?: number;
  projetsSuivis?: number;
}

export interface DemandeAmi {
  _id: string;
  expediteur: { _id: string; prenom: string; nom: string; avatar?: string };
  dateCreation: string;
}

export const getProfilUtilisateur = async (userId: string): Promise<ReponseAPI<{ utilisateur: ProfilUtilisateur }>> => {
  return api.get(`/utilisateurs/${userId}`, true);
};

export const rechercherUtilisateurs = async (recherche: string, page = 1, limit = 20): Promise<ReponseAPI<{ utilisateurs: ProfilUtilisateur[] }>> => {
  return api.get(`/utilisateurs/recherche?q=${encodeURIComponent(recherche)}&page=${page}&limit=${limit}`, true);
};

export const envoyerDemandeAmi = async (userId: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/utilisateurs/${userId}/demande-ami`, {}, true);
};

export const annulerDemandeAmi = async (userId: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/utilisateurs/${userId}/demande-ami`, true);
};

export const accepterDemandeAmi = async (userId: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/utilisateurs/${userId}/accepter-ami`, {}, true);
};

export const refuserDemandeAmi = async (userId: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.post(`/utilisateurs/${userId}/refuser-ami`, {}, true);
};

export const supprimerAmi = async (userId: string): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete(`/utilisateurs/${userId}/ami`, true);
};

export const getDemandesAmis = async (): Promise<ReponseAPI<{ demandes: DemandeAmi[] }>> => {
  return api.get('/utilisateurs/demandes-amis', true);
};

export const getMesAmis = async (): Promise<ReponseAPI<{ amis: ProfilUtilisateur[] }>> => {
  return api.get('/utilisateurs/mes-amis', true);
};

export const getAmisUtilisateur = async (userId: string): Promise<ReponseAPI<{ amis: ProfilUtilisateur[] }>> => {
  return api.get(`/utilisateurs/${userId}/amis`, true);
};
