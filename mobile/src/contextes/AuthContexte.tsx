/**
 * Contexte d'authentification
 * Gère l'état de connexion dans toute l'application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Utilisateur,
  getUtilisateurLocal,
  getMoi,
  deconnexion as authDeconnexion,
  getToken,
} from '../services/auth';

interface AuthContexteType {
  utilisateur: Utilisateur | null;
  estConnecte: boolean;
  chargement: boolean;
  setUtilisateur: (utilisateur: Utilisateur | null) => void;
  deconnexion: () => Promise<void>;
  rafraichirUtilisateur: () => Promise<void>;
}

const AuthContexte = createContext<AuthContexteType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  const rafraichirUtilisateur = async () => {
    const token = await getToken();
    if (!token) {
      setUtilisateur(null);
      setChargement(false);
      return;
    }

    try {
      const reponse = await getMoi();
      if (reponse.succes && reponse.data) {
        setUtilisateur(reponse.data.utilisateur);
      } else {
        // Token invalide, on efface la session
        await authDeconnexion();
        setUtilisateur(null);
      }
    } catch {
      // En cas d'erreur réseau, on utilise les données locales
      const utilisateurLocal = await getUtilisateurLocal();
      setUtilisateur(utilisateurLocal);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    // Charger l'utilisateur au démarrage
    const charger = async () => {
      const utilisateurLocal = await getUtilisateurLocal();
      if (utilisateurLocal) {
        setUtilisateur(utilisateurLocal);
      }
      // Vérifier le token avec le serveur
      await rafraichirUtilisateur();
    };

    charger();
  }, []);

  const deconnexion = async () => {
    await authDeconnexion();
    setUtilisateur(null);
  };

  return (
    <AuthContexte.Provider
      value={{
        utilisateur,
        estConnecte: !!utilisateur,
        chargement,
        setUtilisateur,
        deconnexion,
        rafraichirUtilisateur,
      }}
    >
      {children}
    </AuthContexte.Provider>
  );
};

export const useAuth = (): AuthContexteType => {
  const context = useContext(AuthContexte);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export default AuthContexte;
