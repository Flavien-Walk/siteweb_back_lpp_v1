/**
 * Types Messagerie
 * Extraits de services/messagerie.ts
 */

export interface UtilisateurMessagerie {
  _id: string;
  prenom: string;
  nom: string;
  avatar?: string;
}

export type TypeMessage = 'texte' | 'image' | 'video' | 'systeme';
export type TypeReaction = 'heart' | 'laugh' | 'wow' | 'sad' | 'angry' | 'like';

export interface Reaction {
  userId: string;
  user?: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
  };
  type: TypeReaction;
  createdAt: string;
}

export interface ReplyToMessage {
  _id: string;
  contenu: string;
  expediteur: {
    _id?: string;
    prenom: string;
    nom: string;
  };
  type: TypeMessage;
}

export interface Message {
  _id: string;
  expediteur: UtilisateurMessagerie;
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
  participant?: UtilisateurMessagerie;
  participants?: UtilisateurMessagerie[];
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

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface MessagesResponse {
  conversation: {
    _id: string;
    estGroupe: boolean;
    nomGroupe?: string;
    imageGroupe?: string;
    participants: UtilisateurMessagerie[];
  };
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface EnvoyerMessageResponse {
  message: Message;
  conversationId: string;
}

export interface NonLusResponse {
  nombreNonLus: number;
}

export interface RechercheUtilisateursResponse {
  utilisateurs: UtilisateurMessagerie[];
}

export interface ConversationPriveeResponse {
  conversation: Conversation;
  participant: UtilisateurMessagerie;
}

export interface GroupeResponse {
  groupe: Conversation;
}
