import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { couleurs } from '../styles/theme';

export default function Inscription() {
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    motDePasse: '',
    confirmationMotDePasse: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [cguAcceptees, setCguAcceptees] = useState(false);
  const [erreur, setErreur] = useState('');
  const [loading, setLoading] = useState(false);
  const { inscription } = useAuth();
  const navigate = useNavigate();

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur('');

    if (form.motDePasse !== form.confirmationMotDePasse) {
      setErreur('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.motDePasse.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (!cguAcceptees) {
      setErreur('Tu dois accepter les conditions générales');
      return;
    }

    setLoading(true);
    try {
      const reponse = await inscription({ ...form, cguAcceptees });
      if (reponse.succes) {
        navigate('/');
      } else {
        setErreur(reponse.message || 'Erreur lors de l\'inscription');
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  const avantages = [
    'Découvre des projets innovants',
    'Suis les startups qui t\'inspirent',
    'Échange avec les entrepreneurs',
    'Assiste aux lives exclusifs',
  ];

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={styles.formContainer}
        >
          <h2 style={styles.formTitle}>Rejoins l'aventure</h2>
          <p style={styles.formSubtitle}>
            Crée ton compte et commence à investir dans le futur
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
            <div style={styles.row}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Prénom</label>
                <div style={styles.inputWrapper}>
                  <User size={18} color={couleurs.texteSecondaire} style={{ marginLeft: 14 }} />
                  <input
                    type="text"
                    value={form.prenom}
                    onChange={(e) => updateForm('prenom', e.target.value)}
                    placeholder="Ton prénom"
                    style={styles.input}
                    required
                  />
                </div>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nom</label>
                <div style={styles.inputWrapper}>
                  <User size={18} color={couleurs.texteSecondaire} style={{ marginLeft: 14 }} />
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(e) => updateForm('nom', e.target.value)}
                    placeholder="Ton nom"
                    style={styles.input}
                    required
                  />
                </div>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} color={couleurs.texteSecondaire} style={{ marginLeft: 14 }} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
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
                  value={form.motDePasse}
                  onChange={(e) => updateForm('motDePasse', e.target.value)}
                  placeholder="Min. 6 caractères"
                  style={styles.input}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  {showPassword ? <EyeOff size={18} color={couleurs.texteSecondaire} /> : <Eye size={18} color={couleurs.texteSecondaire} />}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirmer le mot de passe</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} color={couleurs.texteSecondaire} style={{ marginLeft: 14 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmationMotDePasse}
                  onChange={(e) => updateForm('confirmationMotDePasse', e.target.value)}
                  placeholder="Retape ton mot de passe"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={cguAcceptees}
                onChange={(e) => setCguAcceptees(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>
                J'accepte les conditions générales d'utilisation
              </span>
            </label>

            <motion.button
              type="submit"
              style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={loading}
            >
              {loading ? 'Inscription...' : 'Créer mon compte'}
              {!loading && <ArrowRight size={18} />}
            </motion.button>
          </form>

          <p style={styles.switchText}>
            Déjà un compte ?{' '}
            <Link to="/connexion" style={styles.switchLink}>
              Connecte-toi
            </Link>
          </p>
        </motion.div>
      </div>

      <div style={styles.rightPanel}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={styles.benefitsContainer}
        >
          <h3 style={styles.benefitsTitle}>Pourquoi nous rejoindre ?</h3>
          <div style={styles.benefitsList}>
            {avantages.map((avantage, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                style={styles.benefitItem}
              >
                <CheckCircle size={20} color={couleurs.succes} />
                <span style={styles.benefitText}>{avantage}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        <div style={styles.bgGradient} />
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
    padding: 48,
    backgroundColor: couleurs.fondElevated,
  },
  formContainer: {
    width: '100%',
    maxWidth: 480,
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
    gap: 18,
  },
  row: {
    display: 'flex',
    gap: 16,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: 1,
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: couleurs.primaire,
    width: 16,
    height: 16,
  },
  checkboxText: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
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
    marginTop: 4,
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
  rightPanel: {
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
    background: `radial-gradient(circle at 60% 40%, ${couleurs.primaireLight} 0%, transparent 50%), radial-gradient(circle at 30% 70%, ${couleurs.secondaireLight} 0%, transparent 40%)`,
    pointerEvents: 'none',
    zIndex: 0,
  },
  benefitsContainer: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 400,
  },
  benefitsTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 32,
  },
  benefitsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  benefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    borderRadius: 16,
    backgroundColor: 'rgba(26, 26, 36, 0.6)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${couleurs.bordure}`,
  },
  benefitText: {
    fontSize: '0.9375rem',
    color: couleurs.texte,
    fontWeight: '500',
  },
};