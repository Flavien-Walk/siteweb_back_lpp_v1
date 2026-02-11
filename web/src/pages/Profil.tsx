import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Briefcase, Calendar, BookOpen,
  Heart, Settings, MapPin, FolderHeart, Star, Shield,
  Pencil, X, AlertTriangle, History,
  ShieldAlert, ShieldCheck, ShieldBan, ShieldOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicationsUtilisateur } from '../services/publications';
import type { Publication } from '../services/publications';
import { getMesAmis } from '../services/utilisateurs';
import type { ProfilUtilisateur } from '../services/utilisateurs';
import { getMesProjets } from '../services/projets';
import type { Projet } from '../services/projets';
import {
  modifierProfil,
  getMySanctions,
  getModerationStatus,
} from '../services/auth';
import type { SanctionItem, ModerationStatus } from '../services/auth';
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

/* ─── Sanction helpers ─── */

function sanctionColor(type: SanctionItem['type']) {
  switch (type) {
    case 'warn': return '#FFBD59';
    case 'suspend': return '#FF8C42';
    case 'ban': return '#FF4D6D';
    case 'unwarn':
    case 'unsuspend':
    case 'unban': return '#00D68F';
    default: return couleurs.texteSecondaire;
  }
}

function sanctionIcon(type: SanctionItem['type']) {
  switch (type) {
    case 'warn': return AlertTriangle;
    case 'suspend': return ShieldAlert;
    case 'ban': return ShieldBan;
    case 'unwarn': return ShieldCheck;
    case 'unsuspend': return ShieldCheck;
    case 'unban': return ShieldOff;
    default: return Shield;
  }
}

function sanctionLabel(type: SanctionItem['type']) {
  switch (type) {
    case 'warn': return 'Avertissement';
    case 'unwarn': return 'Retrait avertissement';
    case 'suspend': return 'Suspension';
    case 'unsuspend': return 'Levée de suspension';
    case 'ban': return 'Bannissement';
    case 'unban': return 'Levée de bannissement';
    default: return type;
  }
}

function actorRoleLabel(role?: string) {
  switch (role) {
    case 'super_admin': return 'Fondateur';
    case 'admin_modo':
    case 'admin': return 'Admin';
    case 'modo': return 'Modérateur';
    case 'modo_test': return 'Modo Test';
    case 'system': return 'Système';
    default: return role || 'Système';
  }
}

/* ─── Main component ─── */

export default function Profil() {
  const { utilisateur, setUtilisateur } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('publications');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [amis, setAmis] = useState<ProfilUtilisateur[]>([]);
  const [projetsSuivis, setProjetsSuivis] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);

  // Bio editing state
  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [bioSaving, setBioSaving] = useState(false);

  // Sanctions state
  const [moderationStatus, setModerationStatus] = useState<ModerationStatus | null>(null);
  const [sanctionsModalOpen, setSanctionsModalOpen] = useState(false);
  const [sanctions, setSanctions] = useState<SanctionItem[]>([]);
  const [sanctionsLoading, setSanctionsLoading] = useState(false);

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

  // Load moderation status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getModerationStatus();
        if (res.succes && res.data) {
          setModerationStatus(res.data);
        }
      } catch {
        // silently ignore
      }
    })();
  }, []);

  /* ─── Bio handlers ─── */

  const openBioModal = () => {
    setBioValue(utilisateur?.bio || '');
    setBioModalOpen(true);
  };

  const closeBioModal = () => {
    setBioModalOpen(false);
    setBioSaving(false);
  };

  const saveBio = async () => {
    setBioSaving(true);
    try {
      const result = await modifierProfil({ bio: bioValue });
      if (result.succes && result.data) {
        setUtilisateur(result.data.utilisateur);
      }
      closeBioModal();
    } catch {
      setBioSaving(false);
    }
  };

  /* ─── Sanctions handlers ─── */

  const openSanctionsModal = async () => {
    setSanctionsModalOpen(true);
    setSanctionsLoading(true);
    try {
      const res = await getMySanctions();
      if (res.succes && res.data) {
        setSanctions(res.data.sanctions);
      }
    } catch {
      // silently ignore
    } finally {
      setSanctionsLoading(false);
    }
  };

  if (!utilisateur) return null;

  const dateInscription = utilisateur.dateInscription
    ? format(new Date(utilisateur.dateInscription), 'MMMM yyyy', { locale: fr })
    : '';

  const warnCount = moderationStatus?.warnCountSinceLastAutoSuspension ?? 0;

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

            {/* Bio with pencil edit button */}
            <div style={styles.bioRow}>
              {utilisateur.bio ? (
                <p style={styles.bio}>{utilisateur.bio}</p>
              ) : (
                <p style={{ ...styles.bio, fontStyle: 'italic', color: couleurs.texteMuted }}>
                  Ajouter une bio
                </p>
              )}
              <motion.button
                style={styles.bioEditBtn}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={openBioModal}
                title="Modifier la bio"
              >
                <Pencil size={14} />
              </motion.button>
            </div>

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
            onClick={() => navigate('/reglages')}
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

      {/* ─── Sanctions section ─── */}
      <div style={styles.sanctionsSection}>
        {warnCount > 0 && (
          <motion.div
            style={styles.warnCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={styles.warnCardInner}>
              <AlertTriangle size={20} color="#FFBD59" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={styles.warnTitle}>
                  Avertissements actifs : {warnCount} / 3
                </p>
                <p style={styles.warnSubtitle}>
                  Prochain avertissement ={' '}
                  {moderationStatus?.nextAutoAction === 'ban'
                    ? 'bannissement'
                    : 'suspension'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.button
          style={styles.sanctionsBtn}
          whileHover={{ scale: 1.02, backgroundColor: couleurs.bordureHover }}
          whileTap={{ scale: 0.98 }}
          onClick={openSanctionsModal}
        >
          <History size={18} color={couleurs.texteSecondaire} />
          <span style={styles.sanctionsBtnText}>Mes sanctions</span>
        </motion.button>
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

      {/* ─── Bio edit modal ─── */}
      <AnimatePresence>
        {bioModalOpen && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeBioModal}
          >
            <motion.div
              style={styles.modalContent}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Modifier la bio</h2>
                <motion.button
                  style={styles.modalCloseBtn}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeBioModal}
                >
                  <X size={18} />
                </motion.button>
              </div>

              <textarea
                style={styles.bioTextarea}
                value={bioValue}
                onChange={(e) => {
                  if (e.target.value.length <= 150) setBioValue(e.target.value);
                }}
                placeholder="Votre bio..."
                maxLength={150}
                rows={4}
                autoFocus
              />

              <p style={{
                ...styles.bioCounter,
                color: bioValue.length >= 140
                  ? (bioValue.length >= 150 ? couleurs.danger : couleurs.warning)
                  : couleurs.texteSecondaire,
              }}>
                {bioValue.length}/150 caracteres
              </p>

              <div style={styles.modalActions}>
                <motion.button
                  style={styles.btnSecondary}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={closeBioModal}
                >
                  Annuler
                </motion.button>
                <motion.button
                  style={{
                    ...styles.btnPrimary,
                    opacity: bioSaving ? 0.6 : 1,
                    cursor: bioSaving ? 'not-allowed' : 'pointer',
                  }}
                  whileHover={bioSaving ? {} : { scale: 1.03 }}
                  whileTap={bioSaving ? {} : { scale: 0.97 }}
                  onClick={saveBio}
                  disabled={bioSaving}
                >
                  {bioSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Sanctions history modal ─── */}
      <AnimatePresence>
        {sanctionsModalOpen && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSanctionsModalOpen(false)}
          >
            <motion.div
              style={{ ...styles.modalContent, maxHeight: '80vh', display: 'flex', flexDirection: 'column' as const }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Mes sanctions</h2>
                <motion.button
                  style={styles.modalCloseBtn}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSanctionsModalOpen(false)}
                >
                  <X size={18} />
                </motion.button>
              </div>

              <div style={styles.sanctionsListContainer}>
                {sanctionsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
                    ))}
                  </div>
                ) : sanctions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                    {sanctions.map((sanction, idx) => {
                      const color = sanctionColor(sanction.type);
                      const SIcon = sanctionIcon(sanction.type);
                      return (
                        <motion.div
                          key={idx}
                          style={{
                            ...styles.sanctionItem,
                            borderLeft: `3px solid ${color}`,
                          }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <div style={styles.sanctionItemHeader}>
                            <div style={{
                              ...styles.sanctionIconBg,
                              backgroundColor: `${color}20`,
                            }}>
                              <SIcon size={16} color={color} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={styles.sanctionTopRow}>
                                <span style={{ ...styles.sanctionType, color }}>
                                  {sanctionLabel(sanction.type)}
                                </span>
                                <span style={styles.sanctionDate}>
                                  {format(new Date(sanction.createdAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                                </span>
                              </div>
                              {sanction.titre && (
                                <p style={styles.sanctionTitre}>{sanction.titre}</p>
                              )}
                            </div>
                          </div>
                          {sanction.reason && (
                            <p style={styles.sanctionReason}>
                              Raison : {sanction.reason}
                            </p>
                          )}
                          {sanction.suspendedUntil && (
                            <p style={styles.sanctionSuspendedUntil}>
                              Suspendu jusqu'au {format(new Date(sanction.suspendedUntil), 'dd MMM yyyy, HH:mm', { locale: fr })}
                            </p>
                          )}
                          {sanction.actorRole && (
                            <p style={styles.sanctionActor}>
                              Par : {actorRoleLabel(sanction.actorRole)}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={styles.sanctionsEmpty}>
                    <ShieldCheck size={40} color={couleurs.succes} />
                    <p style={styles.sanctionsEmptyText}>Aucune sanction</p>
                    <p style={styles.sanctionsEmptySubtext}>Votre historique est vierge.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  bioRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bio: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.5,
    margin: 0,
  },
  bioEditBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'transparent',
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texteSecondaire,
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
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

  /* ─── Sanctions section ─── */
  sanctionsSection: {
    marginBottom: 24,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  warnCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 189, 89, 0.08)',
    border: '1px solid rgba(255, 189, 89, 0.25)',
  },
  warnCardInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  warnTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#FFBD59',
    margin: 0,
    marginBottom: 2,
  },
  warnSubtitle: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    margin: 0,
  },
  sanctionsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: 12,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  sanctionsBtnText: {
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: couleurs.texteSecondaire,
  },

  /* ─── Tab bar ─── */
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

  /* ─── Modal shared styles ─── */
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    border: `1px solid ${couleurs.bordure}`,
    padding: 24,
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: couleurs.texte,
    margin: 0,
  },
  modalCloseBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'transparent',
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texteSecondaire,
    cursor: 'pointer',
    padding: 0,
  },

  /* ─── Bio modal specific ─── */
  bioTextarea: {
    width: '100%',
    minHeight: 100,
    padding: 14,
    borderRadius: 12,
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    lineHeight: 1.5,
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  bioCounter: {
    fontSize: '0.75rem',
    textAlign: 'right' as const,
    marginTop: 6,
    marginBottom: 16,
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  btnSecondary: {
    padding: '10px 20px',
    borderRadius: 10,
    backgroundColor: 'transparent',
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texteSecondaire,
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '10px 20px',
    borderRadius: 10,
    backgroundColor: couleurs.primaire,
    border: 'none',
    color: couleurs.blanc,
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },

  /* ─── Sanctions modal specific ─── */
  sanctionsListContainer: {
    overflowY: 'auto' as const,
    maxHeight: 'calc(80vh - 100px)',
    paddingRight: 4,
  },
  sanctionItem: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: couleurs.fond,
    border: `1px solid ${couleurs.bordure}`,
  },
  sanctionItemHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  sanctionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sanctionTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  sanctionType: {
    fontSize: '0.875rem',
    fontWeight: '700',
  },
  sanctionDate: {
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  sanctionTitre: {
    fontSize: '0.8125rem',
    color: couleurs.texte,
    margin: '4px 0 0 0',
    lineHeight: 1.4,
  },
  sanctionReason: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    margin: '8px 0 0 42px',
    lineHeight: 1.4,
  },
  sanctionSuspendedUntil: {
    fontSize: '0.75rem',
    color: '#FF8C42',
    margin: '4px 0 0 42px',
  },
  sanctionActor: {
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
    margin: '4px 0 0 42px',
  },
  sanctionsEmpty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
    padding: '40px 20px',
  },
  sanctionsEmptyText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
    margin: 0,
  },
  sanctionsEmptySubtext: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    margin: 0,
  },
};
