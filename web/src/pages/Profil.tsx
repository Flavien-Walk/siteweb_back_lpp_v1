import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Briefcase, Calendar, BookOpen,
  Heart, Settings, MapPin, FolderHeart, Star, Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicationsUtilisateur } from '../services/publications';
import type { Publication } from '../services/publications';
import { getMesAmis } from '../services/utilisateurs';
import type { ProfilUtilisateur } from '../services/utilisateurs';
import { getMesProjets } from '../services/projets';
import type { Projet } from '../services/projets';
import { couleurs } from '../styles/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Tab = 'publications' | 'amis' | 'projets';

function getUserBadge(role?: string, statut?: string) {
  switch (role) {
    case 'super_admin':
      return { label: 'Fondateur', icon: Star, color: '#FFD700', bgColor: 'rgba(255, 215, 0, 0.15)' };
    case 'admin_modo':
    case 'admin':
      return { label: 'Admin', icon: Shield, color: '#9B59B6', bgColor: 'rgba(155, 89, 182, 0.15)' };
    case 'modo':
      return { label: 'Modérateur', icon: Shield, color: '#27AE60', bgColor: 'rgba(39, 174, 96, 0.15)' };
    case 'modo_test':
      return { label: 'Modo Test', icon: Shield, color: '#3498DB', bgColor: 'rgba(52, 152, 219, 0.15)' };
  }
  if (statut === 'entrepreneur') {
    return { label: 'Entrepreneur', icon: Briefcase, color: couleurs.accent, bgColor: couleurs.accentLight };
  }
  return { label: 'Visiteur', icon: BookOpen, color: couleurs.secondaire, bgColor: couleurs.secondaireLight };
}

export default function Profil() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('publications');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [amis, setAmis] = useState<ProfilUtilisateur[]>([]);
  const [projetsSuivis, setProjetsSuivis] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!utilisateur) return;
    (async () => {
      setLoading(true);
      const [pubRes, amisRes, projetsRes] = await Promise.all([
        getPublicationsUtilisateur(utilisateur.id),
        getMesAmis(),
        getMesProjets(),
      ]);
      if (pubRes.succes && pubRes.data) {
        // Filter strictly: only user's own publications
        setPublications(
          pubRes.data.publications.filter(
            (p) => p.auteur._id === utilisateur.id
          )
        );
      }
      if (amisRes.succes && amisRes.data) {
        setAmis(amisRes.data.amis);
      }
      if (projetsRes.succes && projetsRes.data) {
        setProjetsSuivis(projetsRes.data.projets);
      }
      setLoading(false);
    })();
  }, [utilisateur]);

  if (!utilisateur) return null;

  const dateInscription = utilisateur.dateInscription
    ? format(new Date(utilisateur.dateInscription), 'MMMM yyyy', { locale: fr })
    : '';

  return (
    <div style={styles.page}>
      <div style={styles.coverArea}>
        <div style={styles.coverGradient} />
        <div style={styles.profileHeader}>
          <div style={styles.avatarContainer}>
            {utilisateur.avatar ? (
              <img src={utilisateur.avatar} alt="" style={styles.avatar} />
            ) : (
              <div style={styles.avatarPlaceholder}>
                <span style={styles.avatarLetter}>{utilisateur.prenom[0]}</span>
              </div>
            )}
          </div>
          <div style={styles.profileInfo}>
            <h1 style={styles.name}>{utilisateur.prenom} {utilisateur.nom}</h1>
            <div style={styles.badges}>
              {(() => {
                const badge = getUserBadge(utilisateur.role, utilisateur.statut);
                const Icon = badge.icon;
                return (
                  <span style={{ ...styles.badgeDynamic, backgroundColor: badge.bgColor, color: badge.color }}>
                    <Icon size={12} /> {badge.label}
                  </span>
                );
              })()}
            </div>
            {utilisateur.bio && <p style={styles.bio}>{utilisateur.bio}</p>}
            <div style={styles.metaRow}>
              {dateInscription && (
                <span style={styles.metaItem}>
                  <Calendar size={14} /> Membre depuis {dateInscription}
                </span>
              )}
              <span style={styles.metaItem}>
                <Users size={14} /> {amis.length || utilisateur.nbAmis || 0} amis
              </span>
            </div>
          </div>
          <motion.button
            style={styles.editBtn}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={18} />
          </motion.button>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{publications.length}</span>
          <span style={styles.statLabel}>Publications</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{amis.length}</span>
          <span style={styles.statLabel}>Amis</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{projetsSuivis.length || utilisateur.projetsSuivis || 0}</span>
          <span style={styles.statLabel}>Projets suivis</span>
        </div>
      </div>

      <div style={styles.tabBar}>
        {([
          { key: 'publications' as Tab, label: 'Publications' },
          { key: 'amis' as Tab, label: 'Amis' },
          { key: 'projets' as Tab, label: 'Projets suivis' },
        ]).map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              color: activeTab === tab.key ? couleurs.primaire : couleurs.texteSecondaire,
              borderBottomColor: activeTab === tab.key ? couleurs.primaire : 'transparent',
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {activeTab === 'publications' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 12 }} />
              ))
            ) : publications.length > 0 ? (
              publications.map((pub) => (
                <div key={pub._id} style={styles.pubCard}>
                  <p style={styles.pubContent}>{pub.contenu}</p>
                  {pub.medias?.[0] && (
                    <img src={pub.medias[0].url} alt="" style={styles.pubMedia} />
                  )}
                  <div style={styles.pubStats}>
                    <span><Heart size={14} color={couleurs.danger} /> {pub.nbLikes}</span>
                    <span>{pub.nbCommentaires} commentaires</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={styles.emptyText}>Aucune publication</p>
            )}
          </motion.div>
        )}

        {activeTab === 'amis' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.amisGrid}>
            {amis.map((ami) => (
              <motion.div
                key={ami._id}
                style={styles.amiCard}
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
                onClick={() => navigate(`/utilisateur/${ami._id}`)}
              >
                <div style={styles.amiAvatar}>
                  {ami.avatar ? (
                    <img src={ami.avatar} alt="" style={styles.amiAvatarImg} />
                  ) : (
                    <span style={styles.amiInitial}>{ami.prenom[0]}</span>
                  )}
                </div>
                <span style={styles.amiName}>{ami.prenom} {ami.nom}</span>
                {ami.statut && (
                  <span style={styles.amiStatut}>
                    {ami.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
                  </span>
                )}
              </motion.div>
            ))}
            {amis.length === 0 && <p style={styles.emptyText}>Aucun ami</p>}
          </motion.div>
        )}

        {activeTab === 'projets' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14, marginBottom: 12 }} />
              ))
            ) : projetsSuivis.length > 0 ? (
              projetsSuivis.map((projet) => (
                <motion.div
                  key={projet._id}
                  style={styles.projetCard}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
                  onClick={() => navigate(`/projets/${projet._id}`)}
                >
                  <div style={styles.projetImgContainer}>
                    <img
                      src={projet.image || projet.logo || 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&h=120&fit=crop&q=80'}
                      alt={projet.nom}
                      style={styles.projetImg}
                    />
                  </div>
                  <div style={styles.projetInfo}>
                    <h3 style={styles.projetNom}>{projet.nom}</h3>
                    <p style={styles.projetPitch}>{projet.pitch}</p>
                    <div style={styles.projetMeta}>
                      {projet.localisation?.ville && (
                        <span style={styles.projetMetaItem}>
                          <MapPin size={12} /> {projet.localisation.ville}
                        </span>
                      )}
                      <span style={styles.projetMetaItem}>
                        <Users size={12} /> {projet.nbFollowers || 0}
                      </span>
                    </div>
                  </div>
                  <FolderHeart size={20} color={couleurs.primaire} style={{ flexShrink: 0 }} />
                </motion.div>
              ))
            ) : (
              <p style={styles.emptyText}>Aucun projet suivi</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {},
  coverArea: {
    position: 'relative' as const,
    marginBottom: 24,
    paddingTop: 60,
  },
  coverGradient: {
    position: 'absolute' as const,
    top: 0,
    left: -40,
    right: -40,
    height: 120,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.secondaire})`,
    borderRadius: '0 0 24px 24px',
    opacity: 0.15,
  },
  profileHeader: {
    display: 'flex',
    gap: 20,
    alignItems: 'flex-start',
    position: 'relative' as const,
  },
  avatarContainer: {
    flexShrink: 0,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: `3px solid ${couleurs.primaire}`,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `3px solid ${couleurs.primaireDark}`,
  },
  avatarLetter: {
    fontSize: '2rem',
    fontWeight: '700',
    color: couleurs.blanc,
  },
  profileInfo: {
    flex: 1,
    paddingTop: 8,
  },
  name: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 6,
  },
  badges: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
  },
  badgeDynamic: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  bio: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  metaRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap' as const,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.8125rem',
    color: couleurs.texteMuted,
  },
  editBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texteSecondaire,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.primaire,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
  },
  tabBar: {
    display: 'flex',
    borderBottom: `1px solid ${couleurs.bordure}`,
    marginBottom: 24,
    gap: 4,
  },
  tab: {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '0.9375rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  tabContent: {},
  pubCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    marginBottom: 12,
  },
  pubContent: {
    fontSize: '0.9375rem',
    color: couleurs.texte,
    lineHeight: 1.5,
    marginBottom: 8,
    whiteSpace: 'pre-wrap' as const,
  },
  pubMedia: {
    width: '100%',
    maxHeight: 300,
    objectFit: 'cover' as const,
    borderRadius: 10,
    marginBottom: 8,
  },
  pubStats: {
    display: 'flex',
    gap: 16,
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
  },
  amisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  amiCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  amiAvatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  amiAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  amiInitial: { color: couleurs.blanc, fontWeight: '600' },
  amiName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: couleurs.texte,
    textAlign: 'center' as const,
  },
  amiStatut: {
    fontSize: '0.6875rem',
    color: couleurs.texteSecondaire,
  },
  projetCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    marginBottom: 12,
    cursor: 'pointer',
    transition: 'all 200ms ease',
  },
  projetImgContainer: {
    width: 80,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  projetImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  projetInfo: {
    flex: 1,
    minWidth: 0,
  },
  projetNom: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 4,
  },
  projetPitch: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    marginBottom: 6,
  },
  projetMeta: {
    display: 'flex',
    gap: 12,
  },
  projetMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  emptyText: {
    textAlign: 'center' as const,
    padding: 40,
    color: couleurs.texteSecondaire,
    fontSize: '0.9375rem',
  },
};
