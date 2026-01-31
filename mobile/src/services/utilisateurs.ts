/**
 * Service Utilisateurs - La Première Pierre Mobile
 * Gestion des profils utilisateurs, amis et recherche
 */

import { api, ReponseAPI } from './api';

// Types
export interface ProfilUtilisateur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
  bio?: string;
  role?: 'utilisateur' | 'admin';
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
  expediteur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
  };
  dateCreation: string;
}

interface ProfilResponse {
  utilisateur: ProfilUtilisateur;
}

interface RechercheResponse {
  utilisateurs: ProfilUtilisateur[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface DemandesAmisResponse {
  demandes: DemandeAmi[];
}

interface AmisResponse {
  amis: ProfilUtilisateur[];
}

// ============ PROFIL ============

/**
 * Récupérer le profil public d'un utilisateur
 */
export const getProfilUtilisateur = async (
  userId: string
): Promise<ReponseAPI<ProfilResponse>> => {
  return api.get<ProfilResponse>(`/utilisateurs/${userId}`, true);
};

/**
 * Rechercher des utilisateurs
 */
export const rechercherUtilisateurs = async (
  recherche: string,
  page = 1,
  limit = 20
): Promise<ReponseAPI<RechercheResponse>> => {
  const params = new URLSearchParams();
  params.append('q', recherche);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  // Essayer plusieurs endpoints possibles
  const endpoints = [
    `/utilisateurs/recherche?${params.toString()}`,
    `/utilisateurs?${params.toString()}`,
    `/users/search?${params.toString()}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const reponse = await api.get<RechercheResponse & { users?: ProfilUtilisateur[]; data?: ProfilUtilisateur[] }>(
        endpoint,
        true
      );

      if (reponse.succes && reponse.data) {
        // Normaliser la réponse
        const utilisateurs = reponse.data.utilisateurs
          || reponse.data.users
          || reponse.data.data
          || [];

        return {
          succes: true,
          data: { utilisateurs, pagination: reponse.data.pagination },
        };
      }
    } catch (error) {
      console.log(`Endpoint ${endpoint} non disponible`);
    }
  }

  return {
    succes: true,
    data: { utilisateurs: [] },
  };
};

// ============ AMIS ============

/**
 * Envoyer une demande d'ami
 */
export const envoyerDemandeAmi = async (
  userId: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.post<{ message: string }>(`/utilisateurs/${userId}/demande-ami`, {}, true);
};

/**
 * Annuler une demande d'ami envoyée
 */
export const annulerDemandeAmi = async (
  userId: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete<{ message: string }>(`/utilisateurs/${userId}/demande-ami`, true);
};

/**
 * Accepter une demande d'ami
 */
export const accepterDemandeAmi = async (
  userId: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.post<{ message: string }>(`/utilisateurs/${userId}/accepter-ami`, {}, true);
};

/**
 * Refuser une demande d'ami
 */
export const refuserDemandeAmi = async (
  userId: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.post<{ message: string }>(`/utilisateurs/${userId}/refuser-ami`, {}, true);
};

/**
 * Supprimer un ami
 */
export const supprimerAmi = async (
  userId: string
): Promise<ReponseAPI<{ message: string }>> => {
  return api.delete<{ message: string }>(`/utilisateurs/${userId}/ami`, true);
};

/**
 * Récupérer mes demandes d'amis reçues
 */
export const getDemandesAmis = async (): Promise<ReponseAPI<DemandesAmisResponse>> => {
  return api.get<DemandesAmisResponse>('/utilisateurs/demandes-amis', true);
};

/**
 * Récupérer ma liste d'amis
 */
export const getMesAmis = async (): Promise<ReponseAPI<AmisResponse>> => {
  return api.get<AmisResponse>('/utilisateurs/mes-amis', true);
};

// ============ STATS ============

export interface StatsUtilisateur {
  nbAmis: number;
  nbDemandesRecues: number;
  nbDemandesEnvoyees: number;
}

interface StatsResponse {
  stats: StatsUtilisateur;
}

/**
 * Récupérer les statistiques de l'utilisateur connecté
 * Utilise les endpoints existants pour calculer les stats
 */
export const getMesStats = async (): Promise<ReponseAPI<StatsResponse>> => {
  try {
    // Récupérer les amis et les demandes en parallèle
    const [amisReponse, demandesReponse] = await Promise.all([
      getMesAmis(),
      getDemandesAmis(),
    ]);

    const stats: StatsUtilisateur = {
      nbAmis: amisReponse.succes && amisReponse.data ? amisReponse.data.amis.length : 0,
      nbDemandesRecues: demandesReponse.succes && demandesReponse.data ? demandesReponse.data.demandes.length : 0,
      nbDemandesEnvoyees: 0, // Sera récupéré si l'endpoint existe
    };

    return {
      succes: true,
      data: { stats },
    };
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    return {
      succes: true,
      data: {
        stats: {
          nbAmis: 0,
          nbDemandesRecues: 0,
          nbDemandesEnvoyees: 0,
        },
      },
    };
  }
};
