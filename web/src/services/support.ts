import api from './api';
import type { ReponseAPI } from './api';

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
  assignedTo?: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
  };
  messages: TicketMessage[];
  dateCreation: string;
  dateMiseAJour: string;
  dateFermeture?: string;
}

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

export const creerTicket = async (
  data: { subject: string; category: TicketCategory; message: string }
): Promise<ReponseAPI<{ ticket: SupportTicket }>> => {
  return api.post('/support', data, true);
};

export const listerMesTickets = async (): Promise<
  ReponseAPI<{ tickets: SupportTicket[] }>
> => {
  return api.get('/support', true);
};

export const getMonTicket = async (
  ticketId: string
): Promise<ReponseAPI<{ ticket: SupportTicket }>> => {
  return api.get(`/support/${ticketId}`, true);
};

export const ajouterMessage = async (
  ticketId: string,
  content: string
): Promise<ReponseAPI<{ ticket: SupportTicket }>> => {
  return api.post(`/support/${ticketId}/messages`, { content }, true);
};
