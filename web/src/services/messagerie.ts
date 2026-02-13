import api from './api';
import type { ReponseAPI } from './api';

export interface UtilisateurMsg {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export type TypeMessage = 'texte' | 'image' | 'video' | 'systeme';
export type TypeReaction = 'heart' | 'laugh' | 'wow' | 'sad' | 'angry' | 'like';

export interface Reaction {
  userId: string;
  user?: { _id: string; prenom: string; nom: string; avatar?: string };
  type: TypeReaction;
  createdAt: string;
}

export interface ReplyToMessage {
  _id: string;
  contenu: string;
  expediteur: { _id?: string; prenom: string; nom: string };
  type: TypeMessage;
}

export interface Message {
  _id: string;
  expediteur: UtilisateurMsg;
  type: TypeMessage;
  contenu: string;
  estLu: boolean;
  lecteurs: string[];
  dateCreation: string;
  estMoi: boolean;
  modifie?: boolean;
  replyTo?: ReplyToMessage;
  reactions?: Reaction[];
}

export interface Conversation {
  _id: string;
  estGroupe: boolean;
  nomGroupe?: string;
  imageGroupe?: string;
  participant?: UtilisateurMsg;
  participants?: UtilisateurMsg[];
  dernierMessage?: { contenu: string; expediteur: string; dateCreation: string; type: TypeMessage };
  messagesNonLus: number;
  estMuet: boolean;
  dateMiseAJour: string;
}

export const getConversations = async (): Promise<ReponseAPI<{ conversations: Conversation[] }>> => {
  return api.get('/messagerie/conversations', true);
};

export const getMessages = async (conversationId: string, page = 1, limit = 50): Promise<ReponseAPI<{
  conversation: { _id: string; estGroupe: boolean; nomGroupe?: string; participants: UtilisateurMsg[] };
  messages: Message[];
  pagination: { page: number; limit: number; total: number; pages: number };
}>> => {
  return api.get(`/messagerie/conversations/${conversationId}?page=${page}&limit=${limit}`, true);
};

export const envoyerMessage = async (contenu: string, options: {
  conversationId?: string;
  destinataireId?: string;
  type?: TypeMessage;
  replyTo?: string;
}): Promise<ReponseAPI<{ message: Message; conversationId: string }>> => {
  return api.post('/messagerie/envoyer', {
    contenu,
    conversationId: options.conversationId,
    destinataireId: options.destinataireId,
    type: options.type || 'texte',
    replyTo: options.replyTo,
  }, true);
};

export const marquerConversationLue = async (conversationId: string): Promise<ReponseAPI<void>> => {
  return api.patch(`/messagerie/conversations/${conversationId}/lire`, {}, true);
};

export const getNombreNonLus = async (): Promise<ReponseAPI<{ nombreNonLus: number }>> => {
  return api.get('/messagerie/non-lus', true);
};

export const getOuCreerConversationPrivee = async (userId: string): Promise<ReponseAPI<{ conversation: Conversation; participant: UtilisateurMsg }>> => {
  return api.get(`/messagerie/conversation-privee/${userId}`, true);
};

export const rechercherUtilisateurs = async (recherche: string): Promise<ReponseAPI<{ utilisateurs: UtilisateurMsg[] }>> => {
  return api.get(`/messagerie/rechercher-utilisateurs?q=${encodeURIComponent(recherche)}`, true);
};

export const supprimerConversation = async (conversationId: string): Promise<ReponseAPI<void>> => {
  return api.delete(`/messagerie/conversations/${conversationId}`, true);
};

export const reagirMessage = async (messageId: string, reactionType: TypeReaction | null): Promise<ReponseAPI<{ messageId: string; reactions: Reaction[] }>> => {
  return api.post(`/messagerie/messages/${messageId}/react`, { reactionType }, true);
};

export const modifierMessage = async (conversationId: string, messageId: string, contenu: string): Promise<ReponseAPI<{ message: Message }>> => {
  return api.patch(`/messagerie/conversations/${conversationId}/messages/${messageId}`, { contenu }, true);
};

export const supprimerMessage = async (conversationId: string, messageId: string): Promise<ReponseAPI<void>> => {
  return api.delete(`/messagerie/conversations/${conversationId}/messages/${messageId}`, true);
};

export const creerGroupe = async (nom: string, participantIds: string[]): Promise<ReponseAPI<{ conversation: Conversation }>> => {
  return api.post('/messagerie/groupes', { nom, participantIds }, true);
};

export const modifierGroupe = async (groupeId: string, data: { nom?: string; image?: string }): Promise<ReponseAPI<{ conversation: Conversation }>> => {
  return api.patch(`/messagerie/groupes/${groupeId}`, data, true);
};

export const ajouterParticipant = async (groupeId: string, participantId: string): Promise<ReponseAPI<void>> => {
  return api.post(`/messagerie/groupes/${groupeId}/participants`, { participantId }, true);
};

export const retirerParticipant = async (groupeId: string, participantId: string): Promise<ReponseAPI<void>> => {
  return api.delete(`/messagerie/groupes/${groupeId}/participants/${participantId}`, true);
};

export const toggleMuetConversation = async (conversationId: string): Promise<ReponseAPI<{ estMuet: boolean }>> => {
  return api.patch(`/messagerie/conversations/${conversationId}/muet`, {}, true);
};
