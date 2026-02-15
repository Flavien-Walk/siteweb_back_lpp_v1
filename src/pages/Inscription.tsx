import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CarteAuth from '../components/Auth/CarteAuth';
import BoutonsOAuth from '../components/Auth/BoutonsOAuth';
import ChampMotDePasse from '../components/Auth/ChampMotDePasse';
import { inscription } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

interface ErreurFormulaire {
  prenom?: string;
  nom?: string;
  email?: string;
  motDePasse?: string;
  confirmationMotDePasse?: string;
  cguAcceptees?: string;
  general?: string;
}

const Inscription = () => {
  const navigate = useNavigate();
  const { setUtilisateur } = useAuth();
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmationMotDePasse, setConfirmationMotDePasse] = useState('');
  const [cguAcceptees, setCguAcceptees] = useState(false);
  const [erreurs, setErreurs] = useState<ErreurFormulaire>({});
  const [chargement, setChargement] = useState(false);

  const validerFormulaire = (): boolean => {
    const nouvellesErreurs: ErreurFormulaire = {};

    if (!prenom.trim()) {
      nouvellesErreurs.prenom = 'Le prénom est requis';
    } else if (prenom.trim().length < 2) {
      nouvellesErreurs.prenom = 'Le prénom doit contenir au moins 2 caractères';
    }

    if (!nom.trim()) {
      nouvellesErreurs.nom = 'Le nom est requis';
    } else if (nom.trim().length < 2) {
      nouvellesErreurs.nom = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!email.trim()) {
      nouvellesErreurs.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nouvellesErreurs.email = 'Veuillez entrer un email valide';
    }

    if (!motDePasse) {
      nouvellesErreurs.motDePasse = 'Le mot de passe est requis';
    } else if (motDePasse.length < 8) {
      nouvellesErreurs.motDePasse = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(motDePasse)) {
      nouvellesErreurs.motDePasse = 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre';
    }

    if (!confirmationMotDePasse) {
      nouvellesErreurs.confirmationMotDePasse = 'Veuillez confirmer votre mot de passe';
    } else if (motDePasse !== confirmationMotDePasse) {
      nouvellesErreurs.confirmationMotDePasse = 'Les mots de passe ne correspondent pas';
    }

    if (!cguAcceptees) {
      nouvellesErreurs.cguAcceptees = 'Vous devez accepter les conditions générales';
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
      const reponse = await inscription({
        prenom,
        nom,
        email,
        motDePasse,
        confirmationMotDePasse,
        cguAcceptees,
      });

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
      setErreurs({ general: 'Impossible de créer le compte. Veuillez réessayer.' });
    } finally {
      setChargement(false);
    }
  };

  return (
    <CarteAuth
      titre="Crée ton compte."
      sousTitre="Rejoins la communauté La Première Pierre."
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

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="prenom" className="form-label">
              Prénom
            </label>
            <input
              type="text"
              id="prenom"
              className={`form-input ${erreurs.prenom ? 'form-input-error' : ''}`}
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Jean"
              autoComplete="given-name"
              aria-invalid={!!erreurs.prenom}
              aria-describedby={erreurs.prenom ? 'prenom-error' : undefined}
            />
            {erreurs.prenom && (
              <p id="prenom-error" className="form-error" role="alert">
                {erreurs.prenom}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="nom" className="form-label">
              Nom
            </label>
            <input
              type="text"
              id="nom"
              className={`form-input ${erreurs.nom ? 'form-input-error' : ''}`}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Dupont"
              autoComplete="family-name"
              aria-invalid={!!erreurs.nom}
              aria-describedby={erreurs.nom ? 'nom-error' : undefined}
            />
            {erreurs.nom && (
              <p id="nom-error" className="form-error" role="alert">
                {erreurs.nom}
              </p>
            )}
          </div>
        </div>

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
          autoComplete="new-password"
          erreur={erreurs.motDePasse}
        />

        <ChampMotDePasse
          id="confirmationMotDePasse"
          label="Confirmer le mot de passe"
          value={confirmationMotDePasse}
          onChange={(e) => setConfirmationMotDePasse(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          erreur={erreurs.confirmationMotDePasse}
        />

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={cguAcceptees}
              onChange={(e) => setCguAcceptees(e.target.checked)}
              aria-invalid={!!erreurs.cguAcceptees}
              aria-describedby={erreurs.cguAcceptees ? 'cgu-error' : undefined}
            />
            <span className="form-checkbox-text">
              J'accepte les{' '}
              <a href="#" className="form-link-inline">
                conditions générales d'utilisation
              </a>{' '}
              et la{' '}
              <a href="#" className="form-link-inline">
                politique de confidentialité
              </a>
            </span>
          </label>
          {erreurs.cguAcceptees && (
            <p id="cgu-error" className="form-error" role="alert">
              {erreurs.cguAcceptees}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={chargement}
        >
          {chargement ? 'Création...' : 'Créer mon compte'}
        </button>
      </form>

      <BoutonsOAuth />

      <div className="auth-switch">
        <p>
          Déjà un compte ?{' '}
          <Link to="/connexion" className="auth-switch-link">
            Se connecter
          </Link>
        </p>
      </div>
    </CarteAuth>
  );
};

export default Inscription;
