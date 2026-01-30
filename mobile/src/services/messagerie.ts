/**
 * Service Messagerie - La Première Pierre Mobile
 * Gestion des conversations, groupes et messages
 */

import { api, ReponseAPI } from './api';

// Types
export interface Utilisateur {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export type TypeMessage = 'texte' | 'image' | 'systeme';

export interface Message {
  _id: string;
  expediteur: Utilisateur;
  type: TypeMessage;
  contenu: string;
  estLu: boolean;
  lecteurs: string[];
  dateCreation: string;
  estMoi: boolean;
  modifie?: boolean;
}

export interface Conversation {
  _id: string;
  estGroupe: boolean;
  nomGroupe?: string;
  imageGroupe?: string;
  participant?: Utilisateur; // Pour les conversations privées
  participants?: Utilisateur[]; // Pour les groupes
  dernierMessage?: {
    contenu: string;
    expediteur: string;
    dateCreation: string;
    type: TypeMessage;
  };
  messagesNonLus: number;
  estMuet: boolean;
  dateMiseAJour: string;
}

interface ConversationsResponse {
  conversations: Conversation[];
}

interface MessagesResponse {
  conversation: {
    _id: string;
    estGroupe: boolean;
    nomGroupe?: string;
    imageGroupe?: string;
    participants: Utilisateur[];
  };
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

interface ConversationPriveeResponse {
  conversation: Conversation;
  participant: Utilisateur;
}

interface GroupeResponse {
  groupe: Conversation;
}

/**
 * Récupérer la liste des conversations
 */
export const getConversations = async (): Promise<ReponseAPI<ConversationsResponse>> => {
  return api.get<ConversationsResponse>('/messagerie/conversations', true);
};

/**
 * Récupérer les messages d'une conversation
 */
export const getMessages = async (
  conversationId: string,
  page = 1,
  limit = 50
): Promise<ReponseAPI<MessagesResponse>> => {
  return api.get<MessagesResponse>(
    `/messagerie/conversations/${conversationId}?page=${page}&limit=${limit}`,
    true
  );
};

/**
 * Envoyer un message dans une conversation ou à un nouveau destinataire
 */
export const envoyerMessage = async (
  contenu: string,
  options: { conversationId?: string; destinataireId?: string; type?: TypeMessage }
): Promise<ReponseAPI<EnvoyerMessageResponse>> => {
  return api.post<EnvoyerMessageResponse>(
    '/messagerie/envoyer',
    {
      contenu,
      conversationId: options.conversationId,
      destinataireId: options.destinataireId,
      type: options.type || 'texte',
    },
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
 * Toggle sourdine d'une conversation
 */
export const toggleMuetConversation = async (
  conversationId: string
): Promise<ReponseAPI<{ estMuet: boolean }>> => {
  return api.patch<{ estMuet: boolean }>(
    `/messagerie/conversations/${conversationId}/muet`,
    {},
    true
  );
};

/**
 * Modifier un message (dans les 15 minutes après envoi)
 */
export const modifierMessage = async (
  conversationId: string,
  messageId: string,
  contenu: string
): Promise<ReponseAPI<{ message: Message }>> => {
  return api.patch<{ message: Message }>(
    `/messagerie/conversations/${conversationId}/messages/${messageId}`,
    { contenu },
    true
  );
};

/**
 * Supprimer un message (dans les 15 minutes après envoi)
 */
export const supprimerMessage = async (
  conversationId: string,
  messageId: string
): Promise<ReponseAPI<void>> => {
  return api.delete<void>(
    `/messagerie/conversations/${conversationId}/messages/${messageId}`,
    true
  );
};

/**
 * Récupérer le nombre de messages non lus
 */
export const getNombreNonLus = async (): Promise<ReponseAPI<NonLusResponse>> => {
  return api.get<NonLusResponse>('/messagerie/non-lus', true);
};

/**
 * Obtenir ou créer une conversation privée avec un utilisateur
 */
export const getOuCreerConversationPrivee = async (
  userId: string
): Promise<ReponseAPI<ConversationPriveeResponse>> => {
  return api.get<ConversationPriveeResponse>(
    `/messagerie/conversation-privee/${userId}`,
    true
  );
};

/**
 * Rechercher des utilisateurs pour nouvelle conversation
 */
export const rechercherUtilisateurs = async (
  recherche: string
): Promise<ReponseAPI<RechercheUtilisateursResponse>> => {
  return api.get<RechercheUtilisateursResponse>(
    `/messagerie/rechercher-utilisateurs?q=${encodeURIComponent(recherche)}`,
    true
  );
};

// ===== Groupes =====

/**
 * Créer un groupe
 */
export const creerGroupe = async (
  nom: string,
  participantsIds: string[],
  imageGroupe?: string
): Promise<ReponseAPI<GroupeResponse>> => {
  return api.post<GroupeResponse>(
    '/messagerie/groupes',
    { nom, participants: participantsIds, imageGroupe },
    true
  );
};

/**
 * Modifier un groupe
 */
export const modifierGroupe = async (
  groupeId: string,
  donnees: { nom?: string; imageGroupe?: string | null }
): Promise<ReponseAPI<GroupeResponse>> => {
  return api.patch<GroupeResponse>(
    `/messagerie/groupes/${groupeId}`,
    donnees,
    true
  );
};

/**
 * Ajouter des participants à un groupe
 */
export const ajouterParticipantsGroupe = async (
  groupeId: string,
  participantsIds: string[]
): Promise<ReponseAPI<{ participantsAjoutes: number }>> => {
  return api.post<{ participantsAjoutes: number }>(
    `/messagerie/groupes/${groupeId}/participants`,
    { participants: participantsIds },
    true
  );
};

/**
 * Retirer un participant ou quitter un groupe
 */
export const retirerParticipantGroupe = async (
  groupeId: string,
  participantId: string
): Promise<ReponseAPI<void>> => {
  return api.delete<void>(
    `/messagerie/groupes/${groupeId}/participants/${participantId}`,
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
