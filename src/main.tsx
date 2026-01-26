import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Accueil from './pages/Accueil';
import Connexion from './pages/Connexion';
import Inscription from './pages/Inscription';
import Espace from './pages/Espace';
import CallbackOAuth from './pages/CallbackOAuth';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/espace" element={<Espace />} />
          <Route path="/auth/callback" element={<CallbackOAuth />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
