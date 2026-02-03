/**
 * Contexte utilisateur - Gestion globale de l'utilisateur connecte
 * Synchronisation avatar, statut et donnees utilisateur partout dans l'app
 *
 * SECURITE:
 * - Revalidation du statut a chaque retour au foreground (AppState)
 * - Heartbeat periodique (90s) pour detecter ban/suspension meme sans action
 * - Blocage UI si compte banni/suspendu (mais token conserve pour retry)
 *
 * IMPORTANT: Le token n'est JAMAIS supprime automatiquement sur ban/suspend.
 * L'utilisateur doit explicitement cliquer "Se deconnecter".
 * Le bouton "Reessayer" permet de verifier si unban/unsuspend a ete fait.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Intervalle du heartbeat en ms (90 secondes - entre 60 et 120 comme demande)
const HEARTBEAT_INTERVAL = 90 * 1000;
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
  removeToken,
  hydrateToken,
  isTokenReady,
} from '../services/api';

interface UserContextType {
  utilisateur: Utilisateur | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsStatut: boolean;
  // Flag indiquant si le token est pret (hydrate)
  tokenReady: boolean;
  // Info de restriction de compte (banni/suspendu)
  accountRestriction: AccountRestrictionInfo | null;
  // Reessayer apres unban/unsuspend (ne supprime PAS le token)
  retryRestriction: () => Promise<boolean>;
  // Se deconnecter (supprime le token - action volontaire)
  logoutFromRestriction: () => Promise<void>;
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
  const [tokenReady, setTokenReady] = useState(false);
  const [accountRestriction, setAccountRestriction] = useState<AccountRestrictionInfo | null>(null);
  const appState = useRef(AppState.currentState);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Revalider le statut utilisateur
   * Si succes, clear la restriction (compte n'est plus banni/suspendu)
   * Si 403, le callback sera declenche automatiquement par api.ts
   */
  const revalidateUserStatus = useCallback(async () => {
    try {
      const response = await getMoi();
      // Si succes, l'utilisateur n'est pas banni/suspendu
      if (response.succes && response.data) {
        setUtilisateur(response.data.utilisateur);
        await setUtilisateurLocal(response.data.utilisateur);
        // IMPORTANT: Clear la restriction si elle existait (unban/unsuspend detecte)
        setAccountRestriction(null);
      }
      // Si erreur avec code ACCOUNT_BANNED/ACCOUNT_SUSPENDED,
      // le callback sera declenche automatiquement par api.ts
    } catch (error) {
      console.log('[UserContext] Erreur revalidation:', error);
    }
  }, []);

  // Fonction pour demarrer le heartbeat
  const startHeartbeat = useCallback(() => {
    // Ne pas demarrer si deja actif
    if (heartbeatTimer.current) return;

    console.log('[UserContext] Demarrage heartbeat (90s)');
    heartbeatTimer.current = setInterval(() => {
      // Seulement si l'app est au premier plan
      if (appState.current === 'active') {
        console.log('[UserContext] Heartbeat - verification statut...');
        revalidateUserStatus();
      }
    }, HEARTBEAT_INTERVAL);
  }, [revalidateUserStatus]);

  // Fonction pour arreter le heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      console.log('[UserContext] Arret heartbeat');
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  // Enregistrer le callback pour les restrictions de compte (ban/suspension)
  // IMPORTANT: On ne supprime PAS le token ni l'utilisateur ici
  // L'utilisateur reste "identifie" mais bloque par accountRestriction
  useEffect(() => {
    setAccountRestrictionCallback((info: AccountRestrictionInfo) => {
      console.log('[UserContext] Compte restreint:', info.type);
      setAccountRestriction(info);
      // NE PAS faire setUtilisateur(null) - on garde les infos pour AccountRestrictedScreen
      // NE PAS supprimer le token - permet le retry apres unban/unsuspend
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
  }, [revalidateUserStatus]);

  // Charger l'utilisateur au demarrage
  useEffect(() => {
    loadUser();
  }, []);

  // Gerer le heartbeat selon l'etat d'authentification
  // Demarre quand authentifie, s'arrete quand deconnecte ou restreint
  useEffect(() => {
    if (utilisateur && !accountRestriction) {
      startHeartbeat();
    } else {
      stopHeartbeat();
    }

    // Cleanup au demontage
    return () => {
      stopHeartbeat();
    };
  }, [utilisateur, accountRestriction, startHeartbeat, stopHeartbeat]);

  const loadUser = async () => {
    try {
      // 1. HYDRATER LE TOKEN D'ABORD (critique pour eviter race conditions)
      const token = await hydrateToken();
      setTokenReady(true);
      console.log('[UserContext] Token hydrate:', token ? 'present' : 'absent');

      // 2. Charger l'utilisateur depuis le stockage local
      const localUser = await getUtilisateurLocal();
      if (localUser) {
        setUtilisateur(localUser);

        // 3. Rafraichir depuis l'API si on a un token
        if (token) {
          try {
            const response = await getMoi();
            if (response.succes && response.data) {
              setUtilisateur(response.data.utilisateur);
              await setUtilisateurLocal(response.data.utilisateur);
              // Si on arrive ici, le compte n'est plus restreint
              setAccountRestriction(null);
            }
            // Si erreur 403 banni/suspendu, le callback sera declenche
          } catch (apiError) {
            // Garder les donnees locales si l'API echoue (erreur reseau)
            console.log('Erreur rafraichissement utilisateur:', apiError);
          }
        }
      }
    } catch (error) {
      console.log('Erreur chargement utilisateur:', error);
      setTokenReady(true); // Marquer comme ready meme en cas d'erreur
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
        // Clear restriction si elle existait
        setAccountRestriction(null);
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

  /**
   * Reessayer apres un unban/unsuspend
   * Appelle /auth/moi pour verifier si la restriction est levee
   * NE SUPPRIME PAS le token
   * @returns true si la restriction est levee, false sinon
   */
  const retryRestriction = useCallback(async (): Promise<boolean> => {
    console.log('[UserContext] Retry restriction...');
    try {
      const response = await getMoi();
      if (response.succes && response.data) {
        // Succes = compte n'est plus restreint
        console.log('[UserContext] Restriction levee!');
        setUtilisateur(response.data.utilisateur);
        await setUtilisateurLocal(response.data.utilisateur);
        setAccountRestriction(null);
        return true;
      }
      // Echec mais pas 403 = erreur reseau ou autre
      console.log('[UserContext] Retry failed (not 403):', response.message);
      return false;
    } catch (error) {
      console.log('[UserContext] Retry error:', error);
      return false;
    }
    // Si 403, le callback sera declenche et accountRestriction reste actif
  }, []);

  /**
   * Se deconnecter depuis l'ecran de restriction
   * Action VOLONTAIRE de l'utilisateur
   * Supprime le token et redirige vers login
   */
  const logoutFromRestriction = useCallback(async (): Promise<void> => {
    console.log('[UserContext] Deconnexion volontaire depuis restriction');
    await removeToken();
    setUtilisateur(null);
    setAccountRestriction(null);
  }, []);

  const isAuthenticated = !!utilisateur && !accountRestriction;
  const needsStatut = isAuthenticated && !utilisateur?.statut;

  return (
    <UserContext.Provider
      value={{
        utilisateur,
        isLoading,
        isAuthenticated,
        needsStatut,
        tokenReady,
        accountRestriction,
        retryRestriction,
        logoutFromRestriction,
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
