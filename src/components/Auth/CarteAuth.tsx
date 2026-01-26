import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logoLpp from '../../assets/logo-lpp.svg';

interface CarteAuthProps {
  children: ReactNode;
  titre: string;
  sousTitre?: string;
}

const CarteAuth = ({ children, titre, sousTitre }: CarteAuthProps) => {
  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <Link to="/" className="auth-logo" aria-label="Retour à l'accueil">
            <img src={logoLpp} alt="La Première Pierre" width={48} height={48} />
          </Link>
          <h1 className="auth-title">{titre}</h1>
          {sousTitre && <p className="auth-subtitle">{sousTitre}</p>}
        </div>

        <div className="auth-content">
          {children}
        </div>

        <div className="auth-footer">
          <p className="auth-footer-text">
            Découvre des projets près de chez toi. Transparence, communauté, impact.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CarteAuth;
