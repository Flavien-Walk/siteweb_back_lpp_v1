import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { setToken } from './services/api';
import MainLayout from './components/layout/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { couleurs } from './styles/theme';

// Code splitting: chargement lazy des pages
const Landing = lazy(() => import('./pages/Landing'));
const Connexion = lazy(() => import('./pages/Connexion'));
const Inscription = lazy(() => import('./pages/Inscription'));
const Feed = lazy(() => import('./pages/Feed'));
const Decouvrir = lazy(() => import('./pages/Decouvrir'));
const ProjetDetail = lazy(() => import('./pages/ProjetDetail'));
const Messagerie = lazy(() => import('./pages/Messagerie'));
const Profil = lazy(() => import('./pages/Profil'));
const Lives = lazy(() => import('./pages/Lives'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ProfilPublic = lazy(() => import('./pages/ProfilPublic'));
const ChoixStatut = lazy(() => import('./pages/ChoixStatut'));
const Entrepreneur = lazy(() => import('./pages/Entrepreneur'));
const Reglages = lazy(() => import('./pages/Reglages'));
const AmisUtilisateur = lazy(() => import('./pages/AmisUtilisateur'));
const PublicationDetail = lazy(() => import('./pages/PublicationDetail'));
const VerificationEmail = lazy(() => import('./pages/VerificationEmail'));

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
  if (!utilisateur.emailVerifie) return <Navigate to="/verification-email" replace />;
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
    <ErrorBoundary>
    <Suspense fallback={<LoadingScreen />}>
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
      <Route path="/verification-email" element={<VerificationEmail />} />
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
    </Suspense>
    </ErrorBoundary>
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
