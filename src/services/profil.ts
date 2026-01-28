import api from './api';
import { Utilisateur } from './auth';

interface ProfilUpdate {
  prenom?: string;
  nom?: string;
  email?: string;
}

interface MotDePasseUpdate {
  motDePasseActuel: string;
  nouveauMotDePasse: string;
  confirmationMotDePasse: string;
}

interface SupprimerCompteData {
  motDePasse?: string;
  confirmation: 'SUPPRIMER MON COMPTE';
}

export const modifierProfil = (donnees: ProfilUpdate) =>
  api.patch<{ utilisateur: Utilisateur }>('/profil', donnees, true);

export const changerMotDePasse = (donnees: MotDePasseUpdate) =>
  api.patch<void>('/profil/mot-de-passe', donnees, true);

export const supprimerCompte = (donnees: SupprimerCompteData) =>
  api.delete<void>('/profil', true);

// Fonction spéciale pour delete avec body
export const supprimerCompteAvecBody = async (donnees: SupprimerCompteData) => {
  const token = localStorage.getItem('lpp_token');
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  try {
    const response = await fetch(`${API_BASE_URL}/profil`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(donnees),
    });

    const data = await response.json();

    if (!response.ok) {
      return { succes: false, message: data.message || 'Erreur lors de la suppression' };
    }

    return data;
  } catch {
    return { succes: false, message: 'Impossible de contacter le serveur.' };
  }
};
