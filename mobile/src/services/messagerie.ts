/**
 * Service Messagerie - La Première Pierre Mobile
 * Gestion des conversations et messages
 */

import { api, ReponseAPI } from './api';

// Types
export interface Utilisateur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export interface Message {
  _id: string;
  expediteur: Utilisateur;
  contenu: string;
  lu: boolean;
  dateCreation: string;
  estMoi: boolean;
}

export interface Conversation {
  _id: string;
  participant: Utilisateur;
  dernierMessage?: {
    contenu: string;
    expediteur: string;
    dateCreation: string;
    lu: boolean;
  };
  messagesNonLus: number;
  dateMiseAJour: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
}

interface MessagesResponse {
  participant: Utilisateur;
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface EnvoyerMessageResponse {
  message: Message;
  conversationId: string;
}

interface NonLusResponse {
  nombreNonLus: number;
}

interface RechercheUtilisateursResponse {
  utilisateurs: Utilisateur[];
}

/**
 * Récupérer la liste des conversations
 */
export const getConversations = async (): Promise<ReponseAPI<ConversationsResponse>> => {
  return api.get<ConversationsResponse>('/messagerie/conversations', true);
};

/**
 * Récupérer les messages d'une conversation avec un utilisateur
 */
export const getMessages = async (
  userId: string,
  page = 1,
  limit = 50
): Promise<ReponseAPI<MessagesResponse>> => {
  return api.get<MessagesResponse>(
    `/messagerie/conversations/${userId}?page=${page}&limit=${limit}`,
    true
  );
};

/**
 * Envoyer un message
 */
export const envoyerMessage = async (
  destinataireId: string,
  contenu: string
): Promise<ReponseAPI<EnvoyerMessageResponse>> => {
  return api.post<EnvoyerMessageResponse>(
    '/messagerie/envoyer',
    { destinataireId, contenu },
    true
  );
};

/**
 * Marquer une conversation comme lue
 */
export const marquerConversationLue = async (
  conversationId: string
): Promise<ReponseAPI<void>> => {
  return api.patch<void>(`/messagerie/conversations/${conversationId}/lire`, {}, true);
};

/**
 * Récupérer le nombre de messages non lus
 */
export const getNombreNonLus = async (): Promise<ReponseAPI<NonLusResponse>> => {
  return api.get<NonLusResponse>('/messagerie/non-lus', true);
};

/**
 * Rechercher des utilisateurs par nom/prénom
 */
export const rechercherUtilisateurs = async (
  recherche: string,
  limit = 10
): Promise<ReponseAPI<RechercheUtilisateursResponse>> => {
  return api.get<RechercheUtilisateursResponse>(
    `/utilisateurs/recherche?q=${encodeURIComponent(recherche)}&limit=${limit}`,
    true
  );
};

/**
 * Obtenir le profil public d'un utilisateur
 */
export const getUtilisateur = async (
  userId: string
): Promise<ReponseAPI<{ utilisateur: Utilisateur }>> => {
  return api.get<{ utilisateur: Utilisateur }>(`/utilisateurs/${userId}`, false);
};
