import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import Feed from './pages/Feed';
import Decouvrir from './pages/Decouvrir';
import ProjetDetail from './pages/ProjetDetail';
import Messagerie from './pages/Messagerie';
import Profil from './pages/Profil';
import Lives from './pages/Lives';
import Notifications from './pages/Notifications';
import { couleurs } from './styles/theme';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { utilisateur, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loader} />
        <span style={styles.loadingText}>Chargement...</span>
      </div>
    );
  }

  if (!utilisateur) {
    return <Navigate to="/connexion" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { utilisateur, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loader} />
      </div>
    );
  }

  if (utilisateur) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
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
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Feed />} />
        <Route path="decouvrir" element={<Decouvrir />} />
        <Route path="projets/:id" element={<ProjetDetail />} />
        <Route path="messagerie" element={<Messagerie />} />
        <Route path="profil" element={<Profil />} />
        <Route path="lives" element={<Lives />} />
        <Route path="notifications" element={<Notifications />} />
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