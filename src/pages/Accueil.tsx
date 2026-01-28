import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/accueil.css';

import Header from '../components/Header';
import Hero from '../components/Hero';
import Stats from '../components/Stats';
import ProjetsALaUne from '../components/ProjetsALaUne';
import CommentCaMarche from '../components/CommentCaMarche';
import Communaute from '../components/Communaute';
import Securite from '../components/Securite';
import CtaFinal from '../components/CtaFinal';
import Marquee from '../components/Marquee';
import Footer from '../components/Footer';

const Accueil = () => {
  const { estConnecte, chargement } = useAuth();
  const navigate = useNavigate();

  // Rediriger vers le dashboard si l'utilisateur est connecté
  useEffect(() => {
    if (!chargement && estConnecte) {
      navigate('/espace', { replace: true });
    }
  }, [estConnecte, chargement, navigate]);

  // Afficher un écran de chargement pendant la vérification
  if (chargement) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Si connecté, ne rien afficher (la redirection va se faire)
  if (estConnecte) {
    return null;
  }

  return (
    <div className="page-accueil">
      <Header />
      <main>
        <Hero />
        <Stats />
        <ProjetsALaUne />
        <CommentCaMarche />
        <Communaute />
        <Securite />
        <CtaFinal />
        <Marquee />
      </main>
      <Footer />
    </div>
  );
};

export default Accueil;
