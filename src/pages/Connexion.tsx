import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CarteAuth from '../components/Auth/CarteAuth';
import BoutonsOAuth from '../components/Auth/BoutonsOAuth';
import ChampMotDePasse from '../components/Auth/ChampMotDePasse';
import { connexion } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

interface ErreurFormulaire {
  email?: string;
  motDePasse?: string;
  general?: string;
}

const Connexion = () => {
  const navigate = useNavigate();
  const { setUtilisateur } = useAuth();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreurs, setErreurs] = useState<ErreurFormulaire>({});
  const [chargement, setChargement] = useState(false);

  const validerFormulaire = (): boolean => {
    const nouvellesErreurs: ErreurFormulaire = {};

    if (!email.trim()) {
      nouvellesErreurs.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nouvellesErreurs.email = 'Veuillez entrer un email valide';
    }

    if (!motDePasse) {
      nouvellesErreurs.motDePasse = 'Le mot de passe est requis';
    }

    setErreurs(nouvellesErreurs);
    return Object.keys(nouvellesErreurs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErreurs({});

    if (!validerFormulaire()) return;

    setChargement(true);

    try {
      const reponse = await connexion({ email, motDePasse });

      if (reponse.succes && reponse.data) {
        setUtilisateur(reponse.data.utilisateur);
        if (!reponse.data.utilisateur.emailVerifie) {
          navigate('/verification-email');
        } else {
          navigate('/espace');
        }
      } else {
        if (reponse.erreurs) {
          setErreurs(reponse.erreurs);
        } else {
          setErreurs({ general: reponse.message || 'Une erreur est survenue' });
        }
      }
    } catch {
      setErreurs({ general: 'Impossible de se connecter. Veuillez réessayer.' });
    } finally {
      setChargement(false);
    }
  };

  return (
    <CarteAuth
      titre="Content de te revoir."
      sousTitre="Connecte-toi pour accéder à ton espace."
    >
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {erreurs.general && (
          <motion.div
            className="form-alert form-alert-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            {erreurs.general}
          </motion.div>
        )}

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Adresse email
          </label>
          <input
            type="email"
            id="email"
            className={`form-input ${erreurs.email ? 'form-input-error' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            autoComplete="email"
            aria-invalid={!!erreurs.email}
            aria-describedby={erreurs.email ? 'email-error' : undefined}
          />
          {erreurs.email && (
            <p id="email-error" className="form-error" role="alert">
              {erreurs.email}
            </p>
          )}
        </div>

        <ChampMotDePasse
          id="motDePasse"
          label="Mot de passe"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          erreur={erreurs.motDePasse}
        />

        <div className="form-options">
          <a href="#" className="form-link">
            Mot de passe oublié ?
          </a>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={chargement}
        >
          {chargement ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <BoutonsOAuth />

      <div className="auth-switch">
        <p>
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="auth-switch-link">
            Créer un compte
          </Link>
        </p>
      </div>
    </CarteAuth>
  );
};

export default Connexion;
