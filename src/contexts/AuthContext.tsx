import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Utilisateur, getUtilisateurLocal, getToken, deconnexion as authDeconnexion, getMoi } from '../services/auth';

interface AuthContextType {
  utilisateur: Utilisateur | null;
  estConnecte: boolean;
  chargement: boolean;
  setUtilisateur: (utilisateur: Utilisateur | null) => void;
  deconnexion: () => void;
  rafraichirUtilisateur: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);

  const rafraichirUtilisateur = async () => {
    const token = getToken();
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
        authDeconnexion();
        setUtilisateur(null);
      }
    } catch {
      // En cas d'erreur réseau, on utilise les données locales
      const utilisateurLocal = getUtilisateurLocal();
      setUtilisateur(utilisateurLocal);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    // Charger l'utilisateur au démarrage
    const utilisateurLocal = getUtilisateurLocal();
    if (utilisateurLocal) {
      setUtilisateur(utilisateurLocal);
    }

    // Vérifier le token avec le serveur
    rafraichirUtilisateur();
  }, []);

  const deconnexion = () => {
    authDeconnexion();
    setUtilisateur(null);
  };

  return (
    <AuthContext.Provider
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
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export default AuthContext;
