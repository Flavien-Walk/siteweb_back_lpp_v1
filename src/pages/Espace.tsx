import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiArrowLeft, HiFolder, HiBell, HiCog } from 'react-icons/hi';
import logoLpp from '../assets/logo-lpp.svg';
import '../styles/auth.css';

const Espace = () => {
  const { utilisateur, deconnexion } = useAuth();

  const handleDeconnexion = () => {
    deconnexion();
    window.location.href = '/';
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        style={{ maxWidth: '600px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-header">
          <Link to="/" className="auth-logo" aria-label="Retour à l'accueil">
            <img src={logoLpp} alt="La Première Pierre" width={48} height={48} />
          </Link>
          <h1 className="auth-title">
            Bienvenue{utilisateur ? `, ${utilisateur.prenom}` : ''} !
          </h1>
          <p className="auth-subtitle">
            Ton espace personnel La Première Pierre
          </p>
        </div>

        <div className="auth-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <motion.div
              className="espace-card"
              style={{
                padding: 'var(--space-5)',
                background: 'var(--card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}
              whileHover={{ borderColor: 'var(--primary)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiFolder style={{ fontSize: '24px', color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ color: 'var(--text-heading)', fontWeight: 600, marginBottom: '4px' }}>
                    Mes projets suivis
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
                    Retrouve les projets que tu suis
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="espace-card"
              style={{
                padding: 'var(--space-5)',
                background: 'var(--card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}
              whileHover={{ borderColor: 'var(--primary)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiBell style={{ fontSize: '24px', color: 'var(--secondary)' }} />
                <div>
                  <h3 style={{ color: 'var(--text-heading)', fontWeight: 600, marginBottom: '4px' }}>
                    Notifications
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
                    Actualités et mises à jour
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="espace-card"
              style={{
                padding: 'var(--space-5)',
                background: 'var(--card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}
              whileHover={{ borderColor: 'var(--primary)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <HiCog style={{ fontSize: '24px', color: 'var(--muted)' }} />
                <div>
                  <h3 style={{ color: 'var(--text-heading)', fontWeight: 600, marginBottom: '4px' }}>
                    Paramètres
                  </h3>
                  <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
                    Gérer ton compte
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <div style={{ marginTop: 'var(--space-6)', display: 'flex', gap: 'var(--space-3)' }}>
            <Link to="/" className="btn btn-secondary" style={{ flex: 1 }}>
              <HiArrowLeft style={{ marginRight: '8px' }} />
              Retour à l'accueil
            </Link>
            <button
              onClick={handleDeconnexion}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Se déconnecter
            </button>
          </div>
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

export default Espace;
