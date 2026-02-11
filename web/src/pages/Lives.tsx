import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Eye, Clock, RefreshCw } from 'lucide-react';
import { getActiveLives, formatLiveDuration, LIVE_THUMBNAILS } from '../services/live';
import type { Live } from '../services/live';
import { couleurs } from '../styles/theme';

function LiveCard({ live, index }: { live: Live; index: number }) {
  const thumbnail = live.thumbnail || LIVE_THUMBNAILS[index % LIVE_THUMBNAILS.length];
  const duration = formatLiveDuration(live.startedAt);

  return (
    <motion.div
      style={styles.liveCard}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(124, 92, 255, 0.2)' }}
    >
      <div style={styles.liveImgContainer}>
        <img src={thumbnail} alt="" style={styles.liveImg} />
        <div style={styles.liveOverlay} />
        <div style={styles.liveBadge}>
          <div style={styles.liveDot} />
          LIVE
        </div>
        <div style={styles.viewerBadge}>
          <Eye size={12} /> {live.viewerCount}
        </div>
        <div style={styles.durationBadge}>
          <Clock size={12} /> {duration}
        </div>
      </div>
      <div style={styles.liveBody}>
        <div style={styles.liveHostRow}>
          <div style={styles.liveHostAvatar}>
            {live.host.avatar ? (
              <img src={live.host.avatar} alt="" style={styles.liveHostAvatarImg} />
            ) : (
              <span style={styles.liveHostInitial}>{live.host.prenom[0]}</span>
            )}
          </div>
          <div>
            <span style={styles.liveHostName}>{live.host.prenom} {live.host.nom}</span>
            {live.title && <span style={styles.liveTitle}>{live.title}</span>}
          </div>
        </div>
        <motion.button
          style={styles.joinBtn}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Radio size={16} /> Rejoindre
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function Lives() {
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);

  const chargerLives = useCallback(async () => {
    setLoading(true);
    const res = await getActiveLives();
    if (res.succes && res.data) {
      setLives(res.data.lives);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    chargerLives();
    const interval = setInterval(chargerLives, 30000);
    return () => clearInterval(interval);
  }, [chargerLives]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>
            <Radio size={24} color={couleurs.danger} /> Lives
          </h1>
          <p style={styles.pageSubtitle}>
            {lives.length > 0
              ? `${lives.length} diffusion${lives.length > 1 ? 's' : ''} en cours`
              : 'Aucune diffusion en cours'}
          </p>
        </div>
        <motion.button
          style={styles.refreshBtn}
          whileHover={{ rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={chargerLives}
        >
          <RefreshCw size={18} color={couleurs.texteSecondaire} />
        </motion.button>
      </div>

      {loading ? (
        <div style={styles.grid}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 300, borderRadius: 20 }} />
          ))}
        </div>
      ) : lives.length > 0 ? (
        <div style={styles.grid}>
          <AnimatePresence>
            {lives.map((live, i) => (
              <LiveCard key={live._id} live={live} index={i} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          style={styles.emptyState}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={styles.emptyIcon}>
            <Radio size={48} color={couleurs.texteMuted} />
          </div>
          <h3 style={styles.emptyTitle}>Aucun live en ce moment</h3>
          <p style={styles.emptySubtext}>
            Les diffusions en direct apparaitront ici quand un utilisateur sera en live
          </p>
        </motion.div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {},
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  pageSubtitle: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    marginTop: 4,
  },
  refreshBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 20,
  },
  liveCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
    transition: 'all 300ms ease',
  },
  liveImgContainer: {
    position: 'relative' as const,
    height: 180,
    overflow: 'hidden',
  },
  liveImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  liveOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'linear-gradient(transparent 50%, rgba(13,13,18,0.6))',
  },
  liveBadge: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 77, 109, 0.9)',
    color: couleurs.blanc,
    fontSize: '0.6875rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: couleurs.blanc,
    animation: 'pulse 1.5s infinite',
  },
  viewerBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 8,
    backgroundColor: 'rgba(13, 13, 18, 0.7)',
    backdropFilter: 'blur(8px)',
    color: couleurs.blanc,
    fontSize: '0.6875rem',
    fontWeight: '600',
  },
  durationBadge: {
    position: 'absolute' as const,
    bottom: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 6,
    backgroundColor: 'rgba(13, 13, 18, 0.7)',
    color: couleurs.blanc,
    fontSize: '0.625rem',
  },
  liveBody: {
    padding: 16,
  },
  liveHostRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  liveHostAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  liveHostAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  liveHostInitial: { color: couleurs.blanc, fontWeight: '600', fontSize: '0.875rem' },
  liveHostName: {
    display: 'block',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  liveTitle: {
    display: 'block',
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: 220,
  },
  joinBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '10px 16px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.danger}, #e6365e)`,
    color: couleurs.blanc,
    fontSize: '0.875rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 80,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: couleurs.fondCard,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  emptySubtext: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    textAlign: 'center' as const,
    maxWidth: 360,
  },
};