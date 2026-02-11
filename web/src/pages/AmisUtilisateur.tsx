import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Users, Lock, Briefcase, BookOpen, Star, Shield,
} from 'lucide-react';
import { getAmisUtilisateur, getProfilUtilisateur } from '../services/utilisateurs';
import type { ProfilUtilisateur } from '../services/utilisateurs';
import { couleurs, rayons, transitions } from '../styles/theme';

function getUserBadge(role?: string, statut?: string) {
  switch (role) {
    case 'super_admin':
      return { label: 'Fondateur', icon: Star, color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)' };
    case 'admin_modo':
    case 'admin':
      return { label: 'Admin', icon: Shield, color: '#9B59B6', bgColor: 'rgba(155, 89, 182, 0.15)' };
    case 'modo':
      return { label: 'Moderateur', icon: Shield, color: '#27AE60', bgColor: 'rgba(39, 174, 96, 0.15)' };
    case 'modo_test':
      return { label: 'Modo Test', icon: Shield, color: '#3498DB', bgColor: 'rgba(52, 152, 219, 0.15)' };
  }
  if (statut === 'entrepreneur') {
    return { label: 'Entrepreneur', icon: Briefcase, color: couleurs.accent, bgColor: couleurs.accentLight };
  }
  return { label: 'Visiteur', icon: BookOpen, color: couleurs.secondaire, bgColor: couleurs.secondaireLight };
}

export default function AmisUtilisateur() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [amis, setAmis] = useState<ProfilUtilisateur[]>([]);
  const [nomUtilisateur, setNomUtilisateur] = useState('');
  const [loading, setLoading] = useState(true);
  const [accesRestreint, setAccesRestreint] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setAccesRestreint(false);

      const [amisRes, profilRes] = await Promise.all([
        getAmisUtilisateur(id),
        getProfilUtilisateur(id),
      ]);

      if (profilRes.succes && profilRes.data) {
        const u = profilRes.data.utilisateur;
        setNomUtilisateur(`${u.prenom} ${u.nom}`);
      }

      if (amisRes.succes && amisRes.data) {
        setAmis(amisRes.data.amis);
      } else {
        setAccesRestreint(true);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} color={couleurs.texte} />
          </button>
          <div className="skeleton" style={{ height: 24, width: 200, borderRadius: 8 }} />
        </div>
        <div style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={styles.skeletonCard} />
          ))}
        </div>
      </div>
    );
  }

  if (accesRestreint) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} color={couleurs.texte} />
          </button>
          <h1 style={styles.titre}>
            Amis{nomUtilisateur ? ` de ${nomUtilisateur}` : ''}
          </h1>
        </div>
        <motion.div
          style={styles.restrictedContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div style={styles.restrictedIconWrapper}>
            <Lock size={40} color={couleurs.texteSecondaire} />
          </div>
          <h2 style={styles.restrictedTitle}>Acces restreint</h2>
          <p style={styles.restrictedText}>
            Vous devez etre ami avec cette personne pour voir sa liste d'amis.
          </p>
          <motion.button
            style={styles.restrictedBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/utilisateur/${id}`)}
          >
            Voir le profil
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} color={couleurs.texte} />
        </button>
        <h1 style={styles.titre}>
          Amis{nomUtilisateur ? ` de ${nomUtilisateur}` : ''}
        </h1>
        <span style={styles.count}>{amis.length}</span>
      </div>

      {amis.length === 0 ? (
        <motion.div
          style={styles.emptyContainer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Users size={48} color={couleurs.texteMuted} />
          <p style={styles.emptyText}>Aucun ami pour le moment</p>
        </motion.div>
      ) : (
        <motion.div
          style={styles.grid}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {amis.map((ami, index) => {
            const badge = getUserBadge(ami.role, ami.statut);
            const BadgeIcon = badge.icon;
            return (
              <motion.div
                key={ami._id}
                style={styles.card}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
                onClick={() => navigate(`/utilisateur/${ami._id}`)}
              >
                <div style={styles.cardAvatarContainer}>
                  {ami.avatar ? (
                    <img src={ami.avatar} alt="" style={styles.cardAvatar} />
                  ) : (
                    <div style={styles.cardAvatarPlaceholder}>
                      <span style={styles.cardAvatarLetter}>
                        {ami.prenom?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                <div style={styles.cardInfo}>
                  <span style={styles.cardName}>
                    {ami.prenom} {ami.nom}
                  </span>
                  <span
                    style={{
                      ...styles.cardBadge,
                      backgroundColor: badge.bgColor,
                      color: badge.color,
                    }}
                  >
                    <BadgeIcon size={10} /> {badge.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
    flexShrink: 0,
    transition: transitions.fast,
  },
  titre: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.texte,
    flex: 1,
    margin: 0,
  },
  count: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    height: 28,
    padding: '0 8px',
    borderRadius: rayons.full,
    backgroundColor: couleurs.primaireLight,
    color: couleurs.primaire,
    fontSize: '0.8125rem',
    fontWeight: '700',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 12,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
    transition: transitions.normal,
  },
  cardAvatarContainer: {
    flexShrink: 0,
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: `2px solid ${couleurs.bordure}`,
  },
  cardAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarLetter: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: couleurs.blanc,
  },
  cardInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    minWidth: 0,
  },
  cardName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: '0.6875rem',
    fontWeight: '600',
    width: 'fit-content',
  },
  skeletonCard: {
    height: 80,
    borderRadius: 14,
  },
  restrictedContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    textAlign: 'center' as const,
  },
  restrictedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  restrictedTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 8,
    margin: '0 0 8px 0',
  },
  restrictedText: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.5,
    maxWidth: 360,
    marginBottom: 24,
    margin: '0 0 24px 0',
  },
  restrictedBtn: {
    padding: '10px 24px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '0.875rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    gap: 16,
  },
  emptyText: {
    textAlign: 'center' as const,
    color: couleurs.texteSecondaire,
    fontSize: '0.9375rem',
    margin: 0,
  },
};
