/**
 * Badge de niveau reutilisable.
 * Taille 'sm' : icone + "Niv.X" — pour sidebar et profils.
 * Taille 'md' : icone + "Niv.X NomNiveau" + barre XP — pour page parcours.
 */

import { getIcon } from '../utils/iconMap';
import { couleurs } from '../styles/theme';

interface LevelBadgeProps {
  level: number;
  levelName: string;
  levelIcon: string;
  xpInLevel?: number;
  xpForNextLevel?: number;
  size?: 'sm' | 'md';
}

export default function LevelBadge({
  level,
  levelName,
  levelIcon,
  xpInLevel,
  xpForNextLevel,
  size = 'sm',
}: LevelBadgeProps) {
  const Icon = getIcon(levelIcon);

  if (size === 'sm') {
    return (
      <div style={styles.smContainer}>
        <div style={styles.smIconWrap}>
          <Icon size={14} color={couleurs.primaire} />
        </div>
        <span style={styles.smText}>Niv.{level}</span>
      </div>
    );
  }

  const progress = xpForNextLevel && xpForNextLevel > 0
    ? Math.min((xpInLevel || 0) / xpForNextLevel, 1)
    : 0;

  return (
    <div style={styles.mdContainer}>
      <div style={styles.mdIconWrap}>
        <Icon size={20} color={couleurs.primaire} />
      </div>
      <div style={styles.mdInfo}>
        <div style={styles.mdRow}>
          <span style={styles.mdLevelText}>Niv.{level} {levelName}</span>
          <span style={styles.mdXpText}>
            {xpInLevel || 0}/{xpForNextLevel || 100} XP
          </span>
        </div>
        <div style={styles.xpBarBg}>
          <div
            style={{
              ...styles.xpBarFill,
              width: `${progress * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // SM
  smContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 10,
    backgroundColor: couleurs.primaireLight,
  },
  smIconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smText: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: couleurs.primaire,
  },

  // MD
  mdContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  mdIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: couleurs.primaireLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mdInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  mdRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mdLevelText: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  mdXpText: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: couleurs.texteMuted,
  },
  xpBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: couleurs.fondCard,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: couleurs.primaire,
    transition: 'width 500ms ease',
  },
};
