import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Accueil from './pages/Accueil';

const Connexion = lazy(() => import('./pages/Connexion'));
const Inscription = lazy(() => import('./pages/Inscription'));
const Espace = lazy(() => import('./pages/Espace'));
const CallbackOAuth = lazy(() => import('./pages/CallbackOAuth'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/inscription" element={<Inscription />} />
            <Route path="/espace" element={<Espace />} />
            <Route path="/auth/callback" element={<CallbackOAuth />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
