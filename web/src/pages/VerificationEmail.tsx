import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { verifierEmail, renvoyerCodeVerification } from '../services/auth';
import { couleurs } from '../styles/theme';

export default function VerificationEmail() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { utilisateur, deconnexion, rafraichirUtilisateur } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!utilisateur) {
      navigate('/connexion', { replace: true });
      return;
    }
    if (utilisateur.emailVerifie) {
      navigate('/feed', { replace: true });
    }
  }, [utilisateur, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    // Gestion du collage
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const digits = pasted.split('');
    const newCode = [...code];
    digits.forEach((d, i) => {
      if (i < 6) newCode[i] = d;
    });
    setCode(newCode);
    const nextIndex = Math.min(digits.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifier = async () => {
    const codeComplet = code.join('');
    if (codeComplet.length !== 6) {
      setErreur('Entre le code complet à 6 chiffres');
      return;
    }

    setErreur('');
    setSucces('');
    setLoading(true);
    try {
      const reponse = await verifierEmail(codeComplet);
      if (reponse.succes) {
        setSucces('Email vérifié !');
        await rafraichirUtilisateur();
        setTimeout(() => navigate('/feed', { replace: true }), 1000);
      } else {
        setErreur(reponse.message || 'Code invalide ou expiré');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  const handleRenvoyer = async () => {
    if (cooldown > 0) return;
    setErreur('');
    setSucces('');
    try {
      const reponse = await renvoyerCodeVerification();
      if (reponse.succes) {
        setSucces('Nouveau code envoyé !');
        setCooldown(60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setErreur(reponse.message || 'Erreur lors du renvoi');
      }
    } catch {
      setErreur('Impossible de contacter le serveur');
    }
  };

  const handleDeconnexion = () => {
    deconnexion();
    navigate('/connexion', { replace: true });
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
            <Mail size={48} color={couleurs.primaire} />
          </div>
          <h1 style={styles.heroTitle}>Vérifie ton email</h1>
          <p style={styles.heroSubtitle}>
            Un code de vérification a été envoyé à{' '}
            <strong style={{ color: couleurs.primaire }}>{utilisateur?.email}</strong>.
            Consulte ta boîte de réception (et tes spams).
          </p>
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
          <h2 style={styles.formTitle}>Code de vérification</h2>
          <p style={styles.formSubtitle}>
            Entre le code à 6 chiffres reçu par email
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

          {succes && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={styles.succesBanner}
            >
              {succes}
            </motion.div>
          )}

          <div style={styles.codeContainer} onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  ...styles.codeInput,
                  borderColor: digit ? couleurs.primaire : couleurs.bordure,
                }}
              />
            ))}
          </div>

          <motion.button
            onClick={handleVerifier}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading}
          >
            {loading ? 'Vérification...' : 'Vérifier'}
            {!loading && <ArrowRight size={18} />}
          </motion.button>

          <button
            onClick={handleRenvoyer}
            disabled={cooldown > 0}
            style={{
              ...styles.resendBtn,
              opacity: cooldown > 0 ? 0.5 : 1,
              cursor: cooldown > 0 ? 'default' : 'pointer',
            }}
          >
            <RefreshCw size={16} />
            {cooldown > 0
              ? `Renvoyer dans ${cooldown}s`
              : 'Renvoyer le code'}
          </button>

          <button onClick={handleDeconnexion} style={styles.logoutBtn}>
            <LogOut size={16} />
            Se déconnecter
          </button>
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
    border: '1px solid rgba(255, 77, 109, 0.2)',
  },
  succesBanner: {
    padding: '12px 16px',
    borderRadius: 12,
    backgroundColor: couleurs.succesLight,
    color: couleurs.succes,
    fontSize: '0.875rem',
    marginBottom: 24,
    border: '1px solid rgba(0, 214, 143, 0.2)',
  },
  codeContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  codeInput: {
    width: 52,
    height: 60,
    textAlign: 'center' as const,
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
    backgroundColor: couleurs.fondInput,
    border: `2px solid ${couleurs.bordure}`,
    borderRadius: 12,
    outline: 'none',
    transition: 'border-color 150ms ease',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 24px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '1rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  resendBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 24px',
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    color: couleurs.primaire,
    fontSize: '0.875rem',
    fontWeight: '500',
    border: `1px solid ${couleurs.bordure}`,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '12px 24px',
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    color: couleurs.texteSecondaire,
    fontSize: '0.875rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
  },
};
