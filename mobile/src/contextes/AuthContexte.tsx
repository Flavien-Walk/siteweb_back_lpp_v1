/**
 * Contexte d'authentification
 * Wrapper autour de UserContext pour compatibilité avec l'ancienne API
 * Unifié avec UserContext pour éviter la désynchronisation des données utilisateur
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useUser } from '../contexts/UserContext';
import { Utilisateur } from '../services/auth';

interface AuthContexteType {
  utilisateur: Utilisateur | null;
  estConnecte: boolean;
  chargement: boolean;
  setUtilisateur: (utilisateur: Utilisateur | null) => void;
  deconnexion: () => Promise<void>;
  rafraichirUtilisateur: () => Promise<void>;
}

const AuthContexte = createContext<AuthContexteType | undefined>(undefined);

/**
 * AuthProvider - Wrapper qui expose les données de UserContext
 * avec l'API legacy pour compatibilité.
 * Note: Ce provider DOIT être ENFANT de UserProvider dans le layout
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Utilise UserContext comme source unique de vérité
  const userContext = useUser();

  const value: AuthContexteType = {
    utilisateur: userContext.utilisateur,
    estConnecte: userContext.isAuthenticated,
    chargement: userContext.isLoading,
    setUtilisateur: (user) => {
      if (user) {
        userContext.updateUser(user);
      }
    },
    deconnexion: userContext.logout,
    rafraichirUtilisateur: userContext.refreshUser,
  };

  return (
    <AuthContexte.Provider value={value}>
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
