import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Utilisateur, getMoi, deconnexion as deconnexionService, connexion as connexionService, inscription as inscriptionService } from '../services/auth';
import { getToken, ReponseAPI } from '../services/api';

interface AuthContextType {
  utilisateur: Utilisateur | null;
  loading: boolean;
  connexion: (email: string, motDePasse: string) => Promise<ReponseAPI<any>>;
  inscription: (donnees: { prenom: string; nom: string; email: string; motDePasse: string; confirmationMotDePasse: string; cguAcceptees: boolean }) => Promise<ReponseAPI<any>>;
  deconnexion: () => void;
  rafraichirUtilisateur: () => Promise<void>;
  setUtilisateur: (u: Utilisateur | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [loading, setLoading] = useState(true);

  const chargerUtilisateur = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const reponse = await getMoi();
      if (reponse.succes && reponse.data) {
        setUtilisateur(reponse.data.utilisateur);
      } else {
        deconnexionService();
        setUtilisateur(null);
      }
    } catch {
      deconnexionService();
      setUtilisateur(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerUtilisateur();
  }, []);

  const connexion = async (email: string, motDePasse: string) => {
    const reponse = await connexionService({ email, motDePasse });
    if (reponse.succes && reponse.data) {
      setUtilisateur(reponse.data.utilisateur);
    }
    return reponse;
  };

  const inscription = async (donnees: { prenom: string; nom: string; email: string; motDePasse: string; confirmationMotDePasse: string; cguAcceptees: boolean }) => {
    const reponse = await inscriptionService(donnees);
    if (reponse.succes && reponse.data) {
      setUtilisateur(reponse.data.utilisateur);
    }
    return reponse;
  };

  const deconnexion = () => {
    deconnexionService();
    setUtilisateur(null);
  };

  const rafraichirUtilisateur = async () => {
    const reponse = await getMoi();
    if (reponse.succes && reponse.data) {
      setUtilisateur(reponse.data.utilisateur);
    }
  };

  return (
    <AuthContext.Provider value={{ utilisateur, loading, connexion, inscription, deconnexion, rafraichirUtilisateur, setUtilisateur }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}