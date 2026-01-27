import api from './api';

export interface Projet {
  _id: string;
  nom: string;
  description: string;
  pitch: string;
  categorie: string;
  secteur: string;
  maturite: string;
  porteur?: { prenom: string; nom: string; avatar?: string };
  localisation: { ville: string; lat: number; lng: number };
  progression: number;
  objectif: string;
  montant: number;
  image: string;
  tags: string[];
  followers: string[];
  dateCreation: string;
}

interface PaginatedProjets {
  projets: Projet[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const getProjets = (params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return api.get<PaginatedProjets>(`/projets${query}`);
};

export const getProjet = (id: string) =>
  api.get<{ projet: Projet }>(`/projets/${id}`);

export const suivreProjet = (id: string) =>
  api.post<{ suivi: boolean; totalFollowers: number }>(`/projets/${id}/suivre`, {}, true);

export const getMesProjets = () =>
  api.get<{ projets: Projet[] }>('/projets/suivis', true);
