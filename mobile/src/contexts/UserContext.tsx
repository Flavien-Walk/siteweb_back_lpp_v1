/**
 * Contexte utilisateur - Gestion globale de l'utilisateur connecte
 * Synchronisation avatar, statut et donnees utilisateur partout dans l'app
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  Utilisateur,
  getUtilisateurLocal,
  getMoi,
  setUtilisateurLocal,
  deconnexion as deconnexionService,
  StatutUtilisateur,
} from '../services/auth';

interface UserContextType {
  utilisateur: Utilisateur | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsStatut: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (user: Utilisateur) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger l'utilisateur au demarrage
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // D'abord charger depuis le stockage local
      const localUser = await getUtilisateurLocal();
      if (localUser) {
        setUtilisateur(localUser);

        // Ensuite rafraichir depuis l'API en arriere-plan
        try {
          const response = await getMoi();
          if (response.succes && response.data) {
            setUtilisateur(response.data.utilisateur);
            await setUtilisateurLocal(response.data.utilisateur);
          }
        } catch (apiError) {
          // Garder les donnees locales si l'API echoue
          console.log('Erreur rafraichissement utilisateur:', apiError);
        }
      }
    } catch (error) {
      console.log('Erreur chargement utilisateur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await getMoi();
      if (response.succes && response.data) {
        setUtilisateur(response.data.utilisateur);
        await setUtilisateurLocal(response.data.utilisateur);
      }
    } catch (error) {
      console.log('Erreur rafraichissement utilisateur:', error);
    }
  }, []);

  const updateUser = useCallback(async (user: Utilisateur) => {
    setUtilisateur(user);
    await setUtilisateurLocal(user);
  }, []);

  const logout = useCallback(async () => {
    await deconnexionService();
    setUtilisateur(null);
  }, []);

  const isAuthenticated = !!utilisateur;
  const needsStatut = isAuthenticated && !utilisateur?.statut;

  return (
    <UserContext.Provider
      value={{
        utilisateur,
        isLoading,
        isAuthenticated,
        needsStatut,
        refreshUser,
        updateUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// Hook personnalise pour utiliser le contexte utilisateur
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser doit etre utilise dans un UserProvider');
  }
  return context;
};

export default UserContext;
