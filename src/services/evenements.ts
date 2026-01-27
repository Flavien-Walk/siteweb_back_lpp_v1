import api from './api';

export interface Evenement {
  _id: string;
  titre: string;
  description: string;
  type: 'live' | 'replay' | 'qr';
  projet?: { _id: string; nom: string; image?: string };
  date: string;
  duree: number;
  lienVideo?: string;
  statut: 'a-venir' | 'en-cours' | 'termine';
  dateCreation: string;
}

interface PaginatedEvenements {
  evenements: Evenement[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const getEvenements = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<PaginatedEvenements>(`/evenements${query}`);
};
