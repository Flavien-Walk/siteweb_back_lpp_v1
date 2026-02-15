import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CarteAuth from '../components/Auth/CarteAuth';
import { verifierEmail, renvoyerCodeVerification } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import '../styles/auth.css';

const CODE_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

const VerificationEmail = () => {
  const navigate = useNavigate();
  const { utilisateur, setUtilisateur, deconnexion } = useAuth();
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown pour le renvoi
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Focus le premier input au mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setErreur('');

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;

    const newCode = [...code];
    pasted.split('').forEach((digit, i) => {
      if (i < CODE_LENGTH) {
        newCode[i] = digit;
      }
    });
    setCode(newCode);
    const nextIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifier = async () => {
    const codeComplet = code.join('');
    if (codeComplet.length !== CODE_LENGTH) {
      setErreur('Entre le code à 6 chiffres');
      return;
    }

    setChargement(true);
    setErreur('');

    try {
      const reponse = await verifierEmail(codeComplet);

      if (reponse.succes) {
        setSucces('Email vérifié !');
        if (utilisateur) {
          setUtilisateur({ ...utilisateur, emailVerifie: true });
        }
        setTimeout(() => navigate('/espace'), 800);
      } else {
        setErreur(reponse.message || 'Code invalide');
        setCode(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setErreur('Une erreur est survenue. Réessaie.');
    } finally {
      setChargement(false);
    }
  };

  const handleRenvoyer = async () => {
    if (cooldown > 0) return;

    setErreur('');
    try {
      const reponse = await renvoyerCodeVerification();
      if (reponse.succes) {
        setSucces('Nouveau code envoyé !');
        setCooldown(COOLDOWN_SECONDS);
        setTimeout(() => setSucces(''), 3000);
      } else {
        setErreur(reponse.message || 'Erreur lors du renvoi');
      }
    } catch {
      setErreur('Une erreur est survenue.');
    }
  };

  const handleDeconnexion = () => {
    deconnexion();
    navigate('/connexion');
  };

  const codeComplet = code.every((d) => d !== '');

  return (
    <CarteAuth
      titre="Vérifie ton email."
      sousTitre={`Un code à 6 chiffres a été envoyé à ${utilisateur?.email || 'ton email'}`}
    >
      <div className="auth-form">
        {erreur && (
          <motion.div
            className="form-alert form-alert-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            {erreur}
          </motion.div>
        )}

        {succes && (
          <motion.div
            className="form-alert form-alert-success"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
          >
            {succes}
          </motion.div>
        )}

        <div className="verification-code-container">
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className={`verification-code-input ${code[index] ? 'verification-code-input-filled' : ''}`}
              value={code[index]}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={index === 0 ? handlePaste : undefined}
              autoComplete="one-time-code"
            />
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-full"
          disabled={!codeComplet || chargement}
          onClick={handleVerifier}
        >
          {chargement ? 'Vérification...' : 'Vérifier'}
        </button>

        <div className="verification-renvoyer">
          <p>
            Tu n'as pas reçu le code ?{' '}
            <button
              type="button"
              className="verification-renvoyer-btn"
              onClick={handleRenvoyer}
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `Renvoyer (${cooldown}s)` : 'Renvoyer'}
            </button>
          </p>
        </div>
      </div>

      <div className="auth-switch">
        <p>
          <button
            type="button"
            className="verification-deconnexion-btn"
            onClick={handleDeconnexion}
          >
            Se déconnecter
          </button>
        </p>
      </div>
    </CarteAuth>
  );
};

export default VerificationEmail;
