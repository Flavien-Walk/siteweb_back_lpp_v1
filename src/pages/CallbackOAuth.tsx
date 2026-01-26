import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gererCallbackOAuth, getMoi } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import logoLpp from '../assets/logo-lpp.svg';
import '../styles/auth.css';

const CallbackOAuth = () => {
  const navigate = useNavigate();
  const { setUtilisateur } = useAuth();
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const traiterCallback = async () => {
      const resultat = gererCallbackOAuth();

      if (resultat.succes) {
        // Récupérer les infos utilisateur
        try {
          const reponse = await getMoi();
          if (reponse.succes && reponse.data) {
            setUtilisateur(reponse.data.utilisateur);
            navigate('/espace');
          } else {
            setErreur('Impossible de récupérer vos informations.');
          }
        } catch {
          setErreur('Une erreur est survenue.');
        }
      } else {
        setErreur(resultat.erreur || 'Échec de la connexion.');
      }
    };

    traiterCallback();
  }, [navigate, setUtilisateur]);

  if (erreur) {
    return (
      <div className="auth-page">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="auth-header">
            <a href="/" className="auth-logo" aria-label="Retour à l'accueil">
              <img src={logoLpp} alt="La Première Pierre" width={48} height={48} />
            </a>
            <h1 className="auth-title">Erreur de connexion</h1>
          </div>
          <div className="auth-content">
            <div className="form-alert form-alert-error" role="alert">
              {erreur}
            </div>
            <a href="/connexion" className="btn btn-primary btn-full" style={{ marginTop: 'var(--space-4)' }}>
              Réessayer
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <a href="/" className="auth-logo" aria-label="Retour à l'accueil">
            <img src={logoLpp} alt="La Première Pierre" width={48} height={48} />
          </a>
          <h1 className="auth-title">Connexion en cours...</h1>
          <p className="auth-subtitle">Veuillez patienter</p>
        </div>
      </motion.div>
    </div>
  );
};

export default CallbackOAuth;
