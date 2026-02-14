/**
 * Service Support - Gestion des tickets de support utilisateur
 */

import api, { ReponseAPI } from './api';

// Types
export type TicketStatus = 'en_attente' | 'en_cours' | 'termine';
export type TicketCategory = 'bug' | 'compte' | 'contenu' | 'signalement' | 'suggestion' | 'autre';

export interface TicketMessage {
  _id: string;
  sender: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
  };
  senderRole: 'user' | 'staff';
  content: string;
  dateCreation: string;
}

export interface SupportTicket {
  _id: string;
  user: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
  };
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: string;
  messages: TicketMessage[];
  dateCreation: string;
  dateMiseAJour: string;
  dateFermeture?: string;
}

export interface CreateTicketData {
  subject: string;
  category: TicketCategory;
  message: string;
}

// Labels
export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  bug: 'Bug',
  compte: 'Compte',
  contenu: 'Contenu',
  signalement: 'Signalement',
  suggestion: 'Suggestion',
  autre: 'Autre',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  termine: 'Termine',
};

// ============ API ============

/**
 * Creer un nouveau ticket
 */
export const creerTicket = async (
  data: CreateTicketData
): Promise<ReponseAPI<{ ticket: SupportTicket }>> => {
  return api.post('/support', data, true);
};

/**
 * Lister mes tickets
 */
export const listerMesTickets = async (): Promise<
  ReponseAPI<{ tickets: SupportTicket[]; pagination: { total: number } }>
> => {
  return api.get('/support', true);
};

/**
 * Obtenir un ticket par ID
 */
export const getMonTicket = async (
  ticketId: string
): Promise<ReponseAPI<{ ticket: SupportTicket }>> => {
  return api.get(`/support/${ticketId}`, true);
};

/**
 * Ajouter un message a un ticket
 */
export const ajouterMessage = async (
  ticketId: string,
  content: string
): Promise<ReponseAPI<{ ticket: SupportTicket }>> => {
  return api.post(`/support/${ticketId}/messages`, { content }, true);
};
