import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, Rocket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { modifierStatut } from '../services/auth';
import type { StatutUtilisateur } from '../services/auth';
import { couleurs } from '../styles/theme';

const STATUTS: { value: StatutUtilisateur; label: string; icon: typeof Compass; color: string; colorLight: string; description: string }[] = [
  {
    value: 'visiteur',
    label: 'Visiteur',
    icon: Compass,
    color: '#10B981',
    colorLight: 'rgba(16, 185, 129, 0.15)',
    description: 'Je decouvre des projets innovants et je soutiens les entrepreneurs',
  },
  {
    value: 'entrepreneur',
    label: 'Entrepreneur',
    icon: Rocket,
    color: '#F59E0B',
    colorLight: 'rgba(245, 158, 11, 0.15)',
    description: 'Je porte un projet et je cherche a developper ma communaute',
  },
];

export default function ChoixStatut() {
  const [selection, setSelection] = useState<StatutUtilisateur | null>(null);
  const [loading, setLoading] = useState(false);
  const { rafraichirUtilisateur } = useAuth();
  const navigate = useNavigate();

  const handleConfirm = async () => {
    if (!selection || loading) return;
    setLoading(true);
    const res = await modifierStatut(selection);
    if (res.succes) {
      await rafraichirUtilisateur();
      navigate('/feed', { replace: true });
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <motion.div
        style={styles.container}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 style={styles.title}>Quel est ton profil ?</h1>
        <p style={styles.subtitle}>
          Choisis le statut qui te correspond le mieux.
          Tu pourras le changer plus tard dans les parametres.
        </p>

        <div style={styles.cardsRow}>
          {STATUTS.map((statut) => {
            const Icon = statut.icon;
            const isSelected = selection === statut.value;
            return (
              <motion.button
                key={statut.value}
                style={{
                  ...styles.card,
                  borderColor: isSelected ? statut.color : couleurs.bordure,
                  backgroundColor: isSelected ? statut.colorLight : couleurs.fondCard,
                }}
                whileHover={{ y: -4, boxShadow: `0 12px 32px rgba(0,0,0,0.3)` }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelection(statut.value)}
              >
                <div style={{
                  ...styles.iconContainer,
                  backgroundColor: isSelected ? statut.color : couleurs.fondElevated,
                }}>
                  <Icon size={32} color={isSelected ? couleurs.blanc : statut.color} />
                </div>
                <h3 style={{ ...styles.cardTitle, color: isSelected ? statut.color : couleurs.texte }}>
                  {statut.label}
                </h3>
                <p style={styles.cardDesc}>{statut.description}</p>
                {isSelected && (
                  <motion.div
                    style={styles.checkmark}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={statut.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <motion.button
          style={{
            ...styles.confirmBtn,
            opacity: selection && !loading ? 1 : 0.5,
          }}
          whileHover={selection ? { scale: 1.02 } : {}}
          whileTap={selection ? { scale: 0.98 } : {}}
          onClick={handleConfirm}
          disabled={!selection || loading}
        >
          {loading ? 'Enregistrement...' : 'Continuer'}
        </motion.button>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: couleurs.fond,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  container: {
    maxWidth: 640,
    width: '100%',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: '1rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.6,
    marginBottom: 40,
  },
  cardsRow: {
    display: 'flex',
    gap: 20,
    marginBottom: 32,
  },
  card: {
    flex: 1,
    padding: 32,
    borderRadius: 20,
    border: '2px solid',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
    position: 'relative' as const,
    transition: 'all 200ms ease',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 200ms ease',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    transition: 'color 200ms ease',
  },
  cardDesc: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.5,
  },
  checkmark: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
  },
  confirmBtn: {
    width: '100%',
    padding: '16px 32px',
    borderRadius: 14,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '1rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
};
