/**
 * Toast XP — affiche "+X XP" avec animation Framer Motion.
 * Si level-up, animation speciale.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Star, TrendingUp } from 'lucide-react';
import { useGamification } from '../contexts/GamificationContext';
import { couleurs } from '../styles/theme';

export default function XpToast() {
  const { xpToast, hideXpToast } = useGamification();

  return (
    <AnimatePresence>
      {xpToast && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          style={styles.container}
          onClick={hideXpToast}
        >
          {xpToast.levelUp ? (
            <>
              <div style={styles.levelUpIcon}>
                <TrendingUp size={18} color={couleurs.accent} />
              </div>
              <div style={styles.textCol}>
                <span style={styles.levelUpText}>
                  Niveau {xpToast.levelName} atteint !
                </span>
                <span style={styles.xpSubText}>+{xpToast.xp} XP</span>
              </div>
            </>
          ) : (
            <>
              <div style={styles.xpIcon}>
                <Star size={16} color={couleurs.accent} />
              </div>
              <span style={styles.xpText}>+{xpToast.xp} XP</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 24,
    right: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 18px',
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    zIndex: 9999,
  },
  xpIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: couleurs.accentLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpText: {
    fontSize: '0.9375rem',
    fontWeight: '700',
    color: couleurs.accent,
  },
  levelUpIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: couleurs.accentLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  levelUpText: {
    fontSize: '0.9375rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  xpSubText: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: couleurs.accent,
  },
};
