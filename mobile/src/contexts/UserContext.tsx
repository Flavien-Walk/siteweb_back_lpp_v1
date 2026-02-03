/**
 * Contexte utilisateur - Gestion globale de l'utilisateur connecte
 * Synchronisation avatar, statut et donnees utilisateur partout dans l'app
 *
 * SECURITE:
 * - Revalidation du statut a chaque retour au foreground (AppState)
 * - Deconnexion forcee si compte banni/suspendu (via callback API)
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  Utilisateur,
  getUtilisateurLocal,
  getMoi,
  setUtilisateurLocal,
  deconnexion as deconnexionService,
  StatutUtilisateur,
} from '../services/auth';
import {
  setAccountRestrictionCallback,
  AccountRestrictionInfo,
} from '../services/api';

interface UserContextType {
  utilisateur: Utilisateur | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsStatut: boolean;
  // Info de restriction de compte (banni/suspendu)
  accountRestriction: AccountRestrictionInfo | null;
  clearRestriction: () => void;
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
  const [accountRestriction, setAccountRestriction] = useState<AccountRestrictionInfo | null>(null);
  const appState = useRef(AppState.currentState);

  // Enregistrer le callback pour les restrictions de compte (ban/suspension)
  useEffect(() => {
    setAccountRestrictionCallback((info: AccountRestrictionInfo) => {
      console.log('[UserContext] Compte restreint:', info.type);
      setAccountRestriction(info);
      setUtilisateur(null);
    });

    return () => {
      setAccountRestrictionCallback(null);
    };
  }, []);

  // Revalidation du statut au retour au foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Quand l'app revient au premier plan
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[UserContext] App revenue au foreground, revalidation du statut...');
        revalidateUserStatus();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Charger l'utilisateur au demarrage
  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Revalider le statut utilisateur (appele au foreground)
   * Si banni/suspendu, declenche la deconnexion forcee via le callback API
   */
  const revalidateUserStatus = async () => {
    try {
      const response = await getMoi();
      // Si succes, l'utilisateur n'est pas banni/suspendu
      if (response.succes && response.data) {
        setUtilisateur(response.data.utilisateur);
        await setUtilisateurLocal(response.data.utilisateur);
      }
      // Si erreur avec code ACCOUNT_BANNED/ACCOUNT_SUSPENDED,
      // le callback sera declenche automatiquement par api.ts
    } catch (error) {
      console.log('[UserContext] Erreur revalidation:', error);
    }
  };

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
          // Si erreur 403 banni/suspendu, le callback sera declenche
        } catch (apiError) {
          // Garder les donnees locales si l'API echoue (erreur reseau)
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
      // Si banni/suspendu, callback declenche automatiquement
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
    setAccountRestriction(null);
  }, []);

  const clearRestriction = useCallback(() => {
    setAccountRestriction(null);
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
        accountRestriction,
        clearRestriction,
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
