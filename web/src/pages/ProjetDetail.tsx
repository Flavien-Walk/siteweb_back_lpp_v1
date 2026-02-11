import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Users, Heart, ExternalLink,
  FileText, BarChart3, Target, Lightbulb,
  Globe, Lock, Star, MessageCircle, Trophy,
  AlertCircle, CheckCircle, Tag,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getProjet, toggleSuivreProjet } from '../services/projets';
import type { Projet, TypeLien } from '../services/projets';
import { getOuCreerConversationPrivee } from '../services/messagerie';
import { couleurs } from '../styles/theme';

type Tab = 'vision' | 'market' | 'docs';

const ROLE_LABELS: Record<string, string> = {
  founder: 'Fondateur',
  cofounder: 'Co-fondateur',
  cto: 'CTO',
  cmo: 'CMO',
  cfo: 'CFO',
  developer: 'Développeur',
  designer: 'Designer',
  marketing: 'Marketing',
  sales: 'Commercial',
  other: 'Membre',
};

const MATURITE_LABELS: Record<string, { label: string; color: string }> = {
  idee: { label: 'Idée', color: '#9CA3AF' },
  prototype: { label: 'Prototype', color: '#F59E0B' },
  lancement: { label: 'Lancement', color: '#3B82F6' },
  croissance: { label: 'Croissance', color: '#10B981' },
};

const CATEGORIE_LABELS: Record<string, { label: string; emoji: string }> = {
  tech: { label: 'Tech', emoji: '💻' },
  food: { label: 'Food', emoji: '🍔' },
  sante: { label: 'Santé', emoji: '🏥' },
  education: { label: 'Éducation', emoji: '📚' },
  energie: { label: 'Énergie', emoji: '⚡' },
  culture: { label: 'Culture', emoji: '🎨' },
  environnement: { label: 'Environnement', emoji: '🌿' },
  autre: { label: 'Autre', emoji: '✨' },
};

const LIEN_LABELS: Record<TypeLien, { label: string; color: string }> = {
  site: { label: 'Site web', color: '#3B82F6' },
  fundraising: { label: 'Levée de fonds', color: '#10B981' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  twitter: { label: 'X / Twitter', color: '#1DA1F2' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  tiktok: { label: 'TikTok', color: '#000000' },
  youtube: { label: 'YouTube', color: '#FF0000' },
  discord: { label: 'Discord', color: '#5865F2' },
  doc: { label: 'Document', color: '#F59E0B' },
  email: { label: 'Email', color: '#6366F1' },
  other: { label: 'Lien', color: '#71717A' },
};

const formatMontant = (montant: number): string => {
  if (montant >= 1000000) return `${(montant / 1000000).toFixed(1)}M €`;
  if (montant >= 1000) return `${(montant / 1000).toFixed(0)}k €`;
  return `${montant} €`;
};

export default function ProjetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const [projet, setProjet] = useState<Projet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('vision');
  const [following, setFollowing] = useState(false);
  const [nbFollowers, setNbFollowers] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const res = await getProjet(id);
      if (res.succes && res.data) {
        setProjet(res.data.projet);
        setFollowing(res.data.projet.estSuivi);
        setNbFollowers(res.data.projet.nbFollowers);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleFollow = async () => {
    if (!id) return;
    const prev = following;
    const prevNb = nbFollowers;
    setFollowing(!prev);
    setNbFollowers(prev ? prevNb - 1 : prevNb + 1);
    const res = await toggleSuivreProjet(id);
    if (res.succes && res.data) {
      setFollowing(res.data.estSuivi);
      setNbFollowers(res.data.nbFollowers);
    } else {
      setFollowing(prev);
      setNbFollowers(prevNb);
    }
  };

  const handleContact = async () => {
    if (!projet?.porteur) return;
    const res = await getOuCreerConversationPrivee(projet.porteur._id);
    if (res.succes && res.data) {
      navigate(`/messagerie?conv=${res.data.conversation._id}`);
    }
  };

  const naviguerVersProfil = (userId: string) => {
    if (utilisateur?.id === userId) {
      navigate('/profil');
    } else {
      navigate(`/utilisateur/${userId}`);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <div className="skeleton" style={{ height: 300, borderRadius: 20, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 40, width: 300, borderRadius: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
      </div>
    );
  }

  if (!projet) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p style={{ color: couleurs.texteSecondaire }}>Projet introuvable</p>
        <button onClick={() => navigate('/decouvrir')} style={styles.backLink}>
          Retour aux projets
        </button>
      </div>
    );
  }

  const isOwnerOrMember = utilisateur && (
    projet.porteur?._id === utilisateur.id ||
    projet.equipe?.some((m) => m.utilisateur?._id === utilisateur.id)
  );

  const maturiteInfo = MATURITE_LABELS[projet.maturite] || MATURITE_LABELS.idee;
  const categorieInfo = CATEGORIE_LABELS[projet.categorie] || CATEGORIE_LABELS.autre;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'vision', label: 'Vision', icon: <Lightbulb size={16} /> },
    { key: 'market', label: 'Market', icon: <BarChart3 size={16} /> },
    { key: 'docs', label: 'Docs', icon: <FileText size={16} /> },
  ];

  const progressionFinancement = projet.objectifFinancement && projet.objectifFinancement > 0
    ? Math.min(((projet.montantLeve || 0) / projet.objectifFinancement) * 100, 100)
    : 0;

  return (
    <div style={styles.page}>
      <motion.button
        style={styles.backBtn}
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={18} /> Retour
      </motion.button>

      {/* Hero */}
      <div style={styles.hero}>
        <img
          src={projet.image || 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=400&fit=crop&q=80'}
          alt={projet.nom}
          style={styles.heroImg}
        />
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          {projet.logo && <img src={projet.logo} alt="" style={styles.heroLogo} />}
          <div>
            <h1 style={styles.heroTitle}>{projet.nom}</h1>
            {projet.localisation?.ville && (
              <span style={styles.heroLocation}>
                <MapPin size={14} color="rgba(255,255,255,0.85)" /> {projet.localisation.ville}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={styles.quickStats}>
        <div style={styles.quickStatItem}>
          <div style={{ ...styles.quickStatIcon, backgroundColor: `${couleurs.primaire}20` }}>
            <Users size={16} color={couleurs.primaire} />
          </div>
          <div>
            <span style={styles.quickStatValue}>{nbFollowers}</span>
            <span style={styles.quickStatLabel}>Abonnés</span>
          </div>
        </div>
        <div style={styles.quickStatDivider} />
        <div style={styles.quickStatItem}>
          <div style={{ ...styles.quickStatIcon, backgroundColor: `${maturiteInfo.color}20` }}>
            <Target size={16} color={maturiteInfo.color} />
          </div>
          <div>
            <span style={styles.quickStatValue}>{maturiteInfo.label}</span>
            <span style={styles.quickStatLabel}>Maturité</span>
          </div>
        </div>
        <div style={styles.quickStatDivider} />
        <div style={styles.quickStatItem}>
          <div style={{ ...styles.quickStatIcon, backgroundColor: `${couleurs.secondaire}20` }}>
            <Tag size={16} color={couleurs.secondaire} />
          </div>
          <div>
            <span style={styles.quickStatValue}>{categorieInfo.label}</span>
            <span style={styles.quickStatLabel}>Secteur</span>
          </div>
        </div>
      </div>

      {/* Funding Progress */}
      {projet.objectifFinancement && projet.objectifFinancement > 0 && (
        <div style={styles.fundingCard}>
          <div style={styles.fundingRow}>
            <div>
              <span style={styles.fundingAmount}>{formatMontant(projet.montantLeve || 0)}</span>
              <span style={styles.fundingGoal}> levés sur {formatMontant(projet.objectifFinancement)}</span>
            </div>
            <span style={styles.fundingPercent}>{Math.round(progressionFinancement)}%</span>
          </div>
          <div style={styles.bigProgressBar}>
            <motion.div
              style={styles.bigProgressFill}
              initial={{ width: 0 }}
              animate={{ width: `${progressionFinancement}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.actionsBar}>
        {!isOwnerOrMember && (
          <motion.button
            style={{
              ...styles.followBtn,
              background: following
                ? 'transparent'
                : `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
              border: following ? `1px solid ${couleurs.primaire}` : 'none',
              color: following ? couleurs.primaire : couleurs.blanc,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFollow}
          >
            <Heart size={16} fill={following ? couleurs.primaire : 'none'} />
            {following ? 'Suivi' : 'Suivre'}
          </motion.button>
        )}
        <motion.button
          style={styles.contactBtn}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleContact}
        >
          <MessageCircle size={16} /> Contacter
        </motion.button>
      </div>

      {/* Links (above tabs like mobile) */}
      {projet.liens && projet.liens.length > 0 && (
        <div style={styles.linksSection}>
          <div style={styles.linksSectionHeader}>
            <Globe size={16} color={couleurs.primaire} />
            <span style={styles.linksSectionTitle}>Liens</span>
          </div>
          <div style={styles.linksScroll}>
            {projet.liens.map((lien, i) => {
              const lienInfo = LIEN_LABELS[lien.type] || LIEN_LABELS.other;
              return (
                <a
                  key={i}
                  href={lien.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...styles.linkChipColored, borderColor: `${lienInfo.color}30` }}
                >
                  <div style={{ ...styles.linkChipIcon, backgroundColor: `${lienInfo.color}20` }}>
                    <Globe size={14} color={lienInfo.color} />
                  </div>
                  <span style={{ color: couleurs.texte }}>{lien.label || lienInfo.label}</span>
                  <ExternalLink size={12} color={couleurs.texteSecondaire} />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <motion.button
            key={tab.key}
            style={{
              ...styles.tabBtn,
              color: activeTab === tab.key ? couleurs.primaire : couleurs.texteSecondaire,
              borderBottomColor: activeTab === tab.key ? couleurs.primaire : 'transparent',
            }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {/* VISION TAB */}
        {activeTab === 'vision' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Pitch */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Pitch</h3>
              <p style={styles.sectionText}>{projet.pitch || projet.description}</p>
            </div>

            {/* Problème / Solution */}
            {(projet.probleme || projet.solution || projet.avantageConcurrentiel) && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Proposition de valeur</h3>
                {projet.probleme && (
                  <div style={styles.valueCard}>
                    <div style={{ ...styles.valueIcon, backgroundColor: `${couleurs.danger}15` }}>
                      <AlertCircle size={20} color={couleurs.danger} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={styles.valueLabel}>Problème</span>
                      <p style={styles.valueText}>{projet.probleme}</p>
                    </div>
                  </div>
                )}
                {projet.solution && (
                  <div style={styles.valueCard}>
                    <div style={{ ...styles.valueIcon, backgroundColor: `${couleurs.succes}15` }}>
                      <CheckCircle size={20} color={couleurs.succes} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={styles.valueLabel}>Solution</span>
                      <p style={styles.valueText}>{projet.solution}</p>
                    </div>
                  </div>
                )}
                {projet.avantageConcurrentiel && (
                  <div style={styles.valueCard}>
                    <div style={{ ...styles.valueIcon, backgroundColor: `${couleurs.primaire}15` }}>
                      <Trophy size={20} color={couleurs.primaire} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={styles.valueLabel}>Avantage concurrentiel</span>
                      <p style={styles.valueText}>{projet.avantageConcurrentiel}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cible */}
            {projet.cible && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Cible</h3>
                <div style={styles.cibleCard}>
                  <p style={styles.sectionText}>{projet.cible}</p>
                </div>
              </div>
            )}

            {/* Equipe (in Vision tab like mobile) */}
            {(projet.porteur || (projet.equipe && projet.equipe.length > 0)) && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Équipe</h3>
                <div style={styles.teamScroll}>
                  {projet.porteur && (
                    <div
                      style={styles.teamCardCompact}
                      onClick={() => naviguerVersProfil(projet.porteur!._id)}
                    >
                      <div style={styles.teamAvatarWrapper}>
                        <div style={styles.teamAvatar}>
                          {projet.porteur.avatar ? (
                            <img src={projet.porteur.avatar} alt="" style={styles.teamAvatarImg} />
                          ) : (
                            <span style={styles.teamInitial}>{projet.porteur.prenom[0]}</span>
                          )}
                        </div>
                        <div style={styles.founderBadge}>
                          <Star size={8} color="#fff" />
                        </div>
                      </div>
                      <span style={styles.teamNameCompact}>{projet.porteur.prenom}</span>
                      <span style={styles.teamLastName}>{projet.porteur.nom}</span>
                      <span style={styles.teamRoleBadge}>Fondateur</span>
                    </div>
                  )}
                  {projet.equipe.map((membre, i) => (
                    <div
                      key={i}
                      style={styles.teamCardCompact}
                      onClick={() => membre.utilisateur && naviguerVersProfil(membre.utilisateur._id)}
                    >
                      <div style={styles.teamAvatar}>
                        {(membre.photo || membre.utilisateur?.avatar) ? (
                          <img src={membre.photo || membre.utilisateur?.avatar} alt="" style={styles.teamAvatarImg} />
                        ) : (
                          <span style={styles.teamInitial}>{membre.nom[0]}</span>
                        )}
                      </div>
                      <span style={styles.teamNameCompact}>
                        {membre.utilisateur ? membre.utilisateur.prenom : membre.nom.split(' ')[0]}
                      </span>
                      <span style={styles.teamLastName}>
                        {membre.utilisateur ? membre.utilisateur.nom : membre.nom.split(' ')[1] || ''}
                      </span>
                      <span style={styles.teamRoleBadgeMember}>
                        {membre.titre || ROLE_LABELS[membre.role] || membre.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {projet.tags && projet.tags.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Tags</h3>
                <div style={styles.tags}>
                  {projet.tags.map((tag, i) => (
                    <span key={i} style={styles.tag}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* MARKET TAB */}
        {activeTab === 'market' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* KPIs / Metrics */}
            {projet.metriques && projet.metriques.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Métriques clés</h3>
                <div style={styles.metriquesGrid}>
                  {projet.metriques.map((m, i) => (
                    <div key={i} style={styles.metriqueCard}>
                      <span style={styles.metriqueValeur}>{m.valeur}</span>
                      <span style={styles.metriqueLabel}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Business Model */}
            {projet.businessModel && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Business Model</h3>
                <div style={styles.businessModelCard}>
                  <p style={styles.sectionText}>{projet.businessModel}</p>
                </div>
              </div>
            )}

            {/* Gallery */}
            {projet.galerie && projet.galerie.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Galerie</h3>
                <div style={styles.gallery}>
                  {projet.galerie.map((img, i) => (
                    <img key={i} src={img.thumbnailUrl || img.url} alt="" style={styles.galleryImg} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* DOCS TAB */}
        {activeTab === 'docs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {projet.pitchVideo && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Pitch vidéo</h3>
                <a href={projet.pitchVideo} target="_blank" rel="noopener noreferrer" style={styles.videoCard}>
                  <div style={styles.videoPlaceholder}>▶</div>
                  <span>Voir le pitch vidéo</span>
                  <ExternalLink size={14} color={couleurs.texteSecondaire} />
                </a>
              </div>
            )}

            {projet.documents && projet.documents.length > 0 ? (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Data Room</h3>
                <div style={styles.docsList}>
                  {projet.documents
                    .filter((d) => d.visibilite === 'public')
                    .map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" style={styles.docCard}>
                        <FileText size={20} color={couleurs.primaire} />
                        <div style={{ flex: 1 }}>
                          <span style={styles.docName}>{doc.nom}</span>
                          <span style={styles.docType}>
                            {doc.type.toUpperCase()} {doc.dateAjout ? `• ${new Date(doc.dateAjout).toLocaleDateString('fr-FR')}` : ''}
                          </span>
                        </div>
                        <ExternalLink size={16} color={couleurs.texteSecondaire} />
                      </a>
                    ))}
                </div>
                {projet.documents.filter((d) => d.visibilite === 'private').length > 0 && (
                  <div style={styles.privateNotice}>
                    <Lock size={14} color={couleurs.texteSecondaire} />
                    <span style={styles.privateNoticeText}>
                      {projet.documents.filter((d) => d.visibilite === 'private').length} document(s) privé(s) réservé(s) aux investisseurs
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <FileText size={48} color={couleurs.texteMuted} />
                <p style={styles.emptyTab}>Aucun document disponible</p>
                <p style={styles.emptySubtext}>Les documents du projet seront affichés ici</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto' },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 0',
    background: 'none',
    border: 'none',
    color: couleurs.texteSecondaire,
    fontSize: '0.875rem',
    cursor: 'pointer',
    marginBottom: 16,
  },
  backLink: {
    marginTop: 16,
    color: couleurs.primaire,
    background: 'none',
    border: 'none',
    fontSize: '0.9375rem',
    cursor: 'pointer',
  },
  /* Hero */
  hero: {
    position: 'relative' as const,
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  heroImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  heroOverlay: {
    position: 'absolute' as const,
    inset: 0,
    background: 'linear-gradient(transparent 30%, rgba(13,13,18,0.9))',
  },
  heroContent: {
    position: 'absolute' as const,
    bottom: 24,
    left: 24,
    right: 24,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 16,
  },
  heroLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    objectFit: 'cover' as const,
    border: `2px solid ${couleurs.bordure}`,
  },
  heroTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: couleurs.blanc,
    marginBottom: 4,
  },
  heroLocation: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.875rem',
    color: 'rgba(255,255,255,0.85)',
  },
  /* Quick Stats */
  quickStats: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 16,
    marginBottom: 16,
    gap: 16,
  },
  quickStatItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  quickStatValue: {
    display: 'block',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  quickStatLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
  },
  quickStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: couleurs.bordure,
    flexShrink: 0,
  },
  /* Funding */
  fundingCard: {
    padding: '16px 20px',
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 16,
    marginBottom: 16,
  },
  fundingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fundingAmount: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.succes,
  },
  fundingGoal: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
  },
  fundingPercent: {
    fontSize: '1rem',
    fontWeight: '700',
    color: couleurs.primaire,
  },
  bigProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: couleurs.bordure,
    overflow: 'hidden',
  },
  bigProgressFill: {
    height: '100%',
    borderRadius: 4,
    background: `linear-gradient(90deg, ${couleurs.primaire}, ${couleurs.secondaire})`,
  },
  /* Actions */
  actionsBar: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
  },
  followBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 12,
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  contactBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '0.875rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  /* Links Section */
  linksSection: {
    marginBottom: 16,
  },
  linksSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  linksSectionTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  linksScroll: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto' as const,
    paddingBottom: 4,
  },
  linkChipColored: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 12,
    backgroundColor: couleurs.fondCard,
    border: `1px solid`,
    textDecoration: 'none',
    fontSize: '0.8125rem',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    transition: 'all 150ms ease',
  },
  linkChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  /* Tabs */
  tabBar: {
    display: 'flex',
    gap: 4,
    borderBottom: `1px solid ${couleurs.bordure}`,
    marginBottom: 24,
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  tabContent: { minHeight: 200 },
  /* Sections */
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.6,
  },
  /* Value cards (problem/solution) */
  valueCard: {
    display: 'flex',
    gap: 14,
    padding: 16,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 14,
    marginBottom: 10,
  },
  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  valueLabel: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 4,
  },
  valueText: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.5,
    margin: 0,
  },
  cibleCard: {
    padding: 16,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 14,
  },
  /* Tags */
  tags: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
  tag: {
    padding: '4px 12px',
    borderRadius: 20,
    backgroundColor: couleurs.primaireLight,
    color: couleurs.primaire,
    fontSize: '0.75rem',
    fontWeight: '500',
    border: `1px solid rgba(124,92,255,0.2)`,
  },
  /* Team horizontal scroll */
  teamScroll: {
    display: 'flex',
    gap: 14,
    overflowX: 'auto' as const,
    paddingBottom: 8,
  },
  teamCardCompact: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    minWidth: 90,
    cursor: 'pointer',
  },
  teamAvatarWrapper: {
    position: 'relative' as const,
  },
  teamAvatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  teamInitial: { color: couleurs.blanc, fontWeight: '600', fontSize: '1rem' },
  founderBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${couleurs.fond}`,
  },
  teamNameCompact: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texte,
    textAlign: 'center' as const,
  },
  teamLastName: {
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
    textAlign: 'center' as const,
  },
  teamRoleBadge: {
    padding: '2px 8px',
    borderRadius: 8,
    backgroundColor: `${couleurs.primaire}20`,
    color: couleurs.primaire,
    fontSize: '0.625rem',
    fontWeight: '600',
  },
  teamRoleBadgeMember: {
    padding: '2px 8px',
    borderRadius: 8,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texteSecondaire,
    fontSize: '0.625rem',
    fontWeight: '500',
  },
  /* Metrics */
  metriquesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
  },
  metriqueCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  metriqueValeur: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.primaire,
  },
  metriqueLabel: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
  },
  businessModelCard: {
    padding: 16,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 14,
  },
  gallery: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  galleryImg: {
    width: '100%',
    height: 160,
    objectFit: 'cover' as const,
    borderRadius: 12,
  },
  /* Docs */
  docsList: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
  docCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    backgroundColor: couleurs.fondCard,
    borderRadius: 14,
    border: `1px solid ${couleurs.bordure}`,
    textDecoration: 'none',
    transition: 'border-color 150ms ease',
  },
  docName: {
    display: 'block',
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: couleurs.texte,
  },
  docType: {
    display: 'block',
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  privateNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 12,
    marginTop: 12,
  },
  privateNoticeText: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
  },
  videoCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    backgroundColor: couleurs.fondCard,
    borderRadius: 14,
    border: `1px solid ${couleurs.bordure}`,
    textDecoration: 'none',
    color: couleurs.texte,
    fontSize: '0.9375rem',
    cursor: 'pointer',
  },
  videoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${couleurs.primaire}20`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: couleurs.primaire,
    fontSize: '1.25rem',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: 48,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },
  emptyTab: {
    color: couleurs.texteSecondaire,
    fontSize: '0.9375rem',
    fontWeight: '500',
  },
  emptySubtext: {
    color: couleurs.texteMuted,
    fontSize: '0.8125rem',
  },
};
