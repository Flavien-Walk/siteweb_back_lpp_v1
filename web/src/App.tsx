import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { setToken } from './services/api';
import MainLayout from './components/layout/MainLayout';
import Landing from './pages/Landing';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import Feed from './pages/Feed';
import Decouvrir from './pages/Decouvrir';
import ProjetDetail from './pages/ProjetDetail';
import Messagerie from './pages/Messagerie';
import Profil from './pages/Profil';
import Lives from './pages/Lives';
import Notifications from './pages/Notifications';
import ProfilPublic from './pages/ProfilPublic';
import ChoixStatut from './pages/ChoixStatut';
import Entrepreneur from './pages/Entrepreneur';
import Reglages from './pages/Reglages';
import AmisUtilisateur from './pages/AmisUtilisateur';
import PublicationDetail from './pages/PublicationDetail';
import { couleurs } from './styles/theme';

function LoadingScreen() {
  return (
    <div style={styles.loadingScreen}>
      <div style={styles.loader} />
      <span style={styles.loadingText}>Chargement...</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { utilisateur, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!utilisateur) return <Navigate to="/connexion" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { utilisateur, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (utilisateur) return <Navigate to="/feed" replace />;
  return <>{children}</>;
}

function HomeRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return <>{children}</>;
}

function AuthCallback() {
  const navigate = useNavigate();
  const { rafraichirUtilisateur } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    // Nettoyer immediatement le token de l'URL (securite: eviter exposition dans l'historique navigateur)
    window.history.replaceState({}, '', window.location.pathname);
    if (token) {
      setToken(token);
      rafraichirUtilisateur().then(() => {
        navigate('/feed', { replace: true });
      });
    } else {
      navigate('/connexion', { replace: true });
    }
  }, [navigate, rafraichirUtilisateur]);

  return <LoadingScreen />;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomeRoute>
            <Landing />
          </HomeRoute>
        }
      />
      <Route
        path="/connexion"
        element={
          <PublicRoute>
            <Connexion />
          </PublicRoute>
        }
      />
      <Route
        path="/inscription"
        element={
          <PublicRoute>
            <Inscription />
          </PublicRoute>
        }
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/choix-statut"
        element={
          <ProtectedRoute>
            <ChoixStatut />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="feed" element={<Feed />} />
        <Route path="decouvrir" element={<Decouvrir />} />
        <Route path="projets/:id" element={<ProjetDetail />} />
        <Route path="messagerie" element={<Messagerie />} />
        <Route path="profil" element={<Profil />} />
        <Route path="lives" element={<Lives />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="utilisateur/:id" element={<ProfilPublic />} />
        <Route path="utilisateur/:id/amis" element={<AmisUtilisateur />} />
        <Route path="publication/:id" element={<PublicationDetail />} />
        <Route path="entrepreneur" element={<Entrepreneur />} />
        <Route path="reglages" element={<Reglages />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: couleurs.fond,
    gap: 16,
  },
  loader: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `3px solid ${couleurs.bordure}`,
    borderTopColor: couleurs.primaire,
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: couleurs.texteSecondaire,
    fontSize: '0.875rem',
  },
};
