import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { couleurs } from '../styles/theme';
import BoutonsOAuth from '../components/BoutonsOAuth';

export default function Connexion() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);
  const { connexion } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');
    setLoading(true);
    try {
      const reponse = await connexion(email, motDePasse);
      if (reponse.succes) {
        if (reponse.data?.utilisateur?.emailVerifie === false) {
          navigate('/verification-email', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setErreur(reponse.message || 'Identifiants incorrects');
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={styles.heroContent}
        >
          <div style={styles.heroIcon}>
            <Sparkles size={48} color={couleurs.primaire} />
          </div>
          <h1 style={styles.heroTitle}>La Première Pierre</h1>
          <p style={styles.heroSubtitle}>
            Connecte les jeunes investisseurs aux startups et projets locaux qui façonnent le monde de demain.
          </p>
          <div style={styles.stats}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>500+</span>
              <span style={styles.statLabel}>Projets</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={styles.statValue}>2K+</span>
              <span style={styles.statLabel}>Membres</span>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <span style={styles.statValue}>50+</span>
              <span style={styles.statLabel}>Lives</span>
            </div>
          </div>
        </motion.div>
        <div style={styles.bgGradient} />
      </div>

      <div style={styles.rightPanel}>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={styles.formContainer}
        >
          <h2 style={styles.formTitle}>Bon retour !</h2>
          <p style={styles.formSubtitle}>
            Connecte-toi pour retrouver tes projets et ta communauté
          </p>

          {erreur && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.errorBanner}
            >
              {erreur}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} color={couleurs.texteSecondaire} style={{ marginLeft: 14 }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Mot de passe</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} color={couleurs.texteSecondaire} style={{ marginLeft: 14 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  style={styles.input}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? (
                    <EyeOff size={18} color={couleurs.texteSecondaire} />
                  ) : (
                    <Eye size={18} color={couleurs.texteSecondaire} />
                  )}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
              }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
              {!loading && <ArrowRight size={18} />}
            </motion.button>
          </form>

          <BoutonsOAuth />

          <p style={styles.switchText}>
            Pas encore de compte ?{' '}
            <Link to="/inscription" style={styles.switchLink}>
              Inscris-toi
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: couleurs.fond,
  },
  leftPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: 48,
  },
  bgGradient: {
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: `radial-gradient(circle at 30% 50%, ${couleurs.primaireLight} 0%, transparent 50%), radial-gradient(circle at 70% 80%, ${couleurs.secondaireLight} 0%, transparent 40%)`,
    pointerEvents: 'none',
    zIndex: 0,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 480,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background: couleurs.primaireLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: couleurs.texte,
    marginBottom: 16,
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontSize: '1.125rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.6,
    marginBottom: 40,
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '24px 0',
    borderTop: `1px solid ${couleurs.bordure}`,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.primaire,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: couleurs.bordure,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    backgroundColor: couleurs.fondElevated,
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
  },
  formTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    marginBottom: 32,
  },
  errorBanner: {
    padding: '12px 16px',
    borderRadius: 12,
    backgroundColor: couleurs.dangerLight,
    color: couleurs.danger,
    fontSize: '0.875rem',
    marginBottom: 24,
    border: `1px solid rgba(255, 77, 109, 0.2)`,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: couleurs.texte,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 12,
    transition: 'border-color 150ms ease',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    padding: '12px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    color: couleurs.texte,
    fontSize: '0.9375rem',
  },
  eyeBtn: {
    padding: '0 14px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 24px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '1rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    marginTop: 8,
  },
  switchText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
  },
  switchLink: {
    color: couleurs.primaire,
    fontWeight: '600',
  },
};