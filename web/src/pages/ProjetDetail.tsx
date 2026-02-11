import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Users, Heart, ExternalLink, Play,
  FileText, Image as ImageIcon, BarChart3, Target, Lightbulb,
  Shield, Globe, Share2,
} from 'lucide-react';
import { getProjet, toggleSuivreProjet, Projet } from '../services/projets';
import { couleurs } from '../styles/theme';

type Tab = 'vision' | 'market' | 'equipe' | 'docs';

export default function ProjetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projet, setProjet] = useState<Projet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('vision');
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const res = await getProjet(id);
      if (res.succes && res.data) {
        setProjet(res.data.projet);
        setFollowing(res.data.projet.estSuivi);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleFollow = async () => {
    if (!id) return;
    const res = await toggleSuivreProjet(id);
    if (res.succes && res.data) {
      setFollowing(res.data.estSuivi);
      setProjet((p) => p ? { ...p, estSuivi: res.data!.estSuivi, nbFollowers: res.data!.nbFollowers } : p);
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

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'vision', label: 'Vision', icon: <Lightbulb size={16} /> },
    { key: 'market', label: 'Marché', icon: <BarChart3 size={16} /> },
    { key: 'equipe', label: 'Équipe', icon: <Users size={16} /> },
    { key: 'docs', label: 'Documents', icon: <FileText size={16} /> },
  ];

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
            <p style={styles.heroPitch}>{projet.pitch}</p>
          </div>
        </div>
      </div>

      <div style={styles.infoBar}>
        <div style={styles.infoItems}>
          {projet.localisation?.ville && (
            <span style={styles.infoItem}>
              <MapPin size={16} color={couleurs.primaire} /> {projet.localisation.ville}
            </span>
          )}
          <span style={styles.infoItem}>
            <Users size={16} color={couleurs.secondaire} /> {projet.nbFollowers || projet.followers?.length || 0} abonnés
          </span>
          <span style={styles.infoItem}>
            <Target size={16} color={couleurs.accent} /> {projet.secteur}
          </span>
        </div>
        <div style={styles.infoActions}>
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
        </div>
      </div>

      {projet.tags && projet.tags.length > 0 && (
        <div style={styles.tags}>
          {projet.tags.map((tag, i) => (
            <span key={i} style={styles.tag}>{tag}</span>
          ))}
        </div>
      )}

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

      <div style={styles.tabContent}>
        {activeTab === 'vision' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p style={styles.description}>{projet.description}</p>
            {projet.probleme && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Problème</h3>
                <p style={styles.sectionText}>{projet.probleme}</p>
              </div>
            )}
            {projet.solution && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Solution</h3>
                <p style={styles.sectionText}>{projet.solution}</p>
              </div>
            )}
            {projet.avantageConcurrentiel && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Avantage concurrentiel</h3>
                <p style={styles.sectionText}>{projet.avantageConcurrentiel}</p>
              </div>
            )}
            {projet.cible && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Cible</h3>
                <p style={styles.sectionText}>{projet.cible}</p>
              </div>
            )}
            {projet.businessModel && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Business Model</h3>
                <p style={styles.sectionText}>{projet.businessModel}</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'market' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {projet.metriques && projet.metriques.length > 0 && (
              <div style={styles.metriquesGrid}>
                {projet.metriques.map((m, i) => (
                  <div key={i} style={styles.metriqueCard}>
                    <span style={styles.metriqueValeur}>{m.valeur}</span>
                    <span style={styles.metriqueLabel}>{m.label}</span>
                  </div>
                ))}
              </div>
            )}
            {projet.objectifFinancement && projet.objectifFinancement > 0 && (
              <div style={styles.financingCard}>
                <h3 style={styles.sectionTitle}>Financement</h3>
                <div style={styles.financingRow}>
                  <span style={styles.financingAmount}>
                    {projet.montantLeve?.toLocaleString() || 0} €
                  </span>
                  <span style={styles.financingGoal}>
                    sur {projet.objectifFinancement.toLocaleString()} €
                  </span>
                </div>
                <div style={styles.bigProgressBar}>
                  <motion.div
                    style={styles.bigProgressFill}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(projet.progression || 0, 100)}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            )}
            {projet.galerie && projet.galerie.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Galerie</h3>
                <div style={styles.gallery}>
                  {projet.galerie.map((img, i) => (
                    <img key={i} src={img.url} alt="" style={styles.galleryImg} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'equipe' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {projet.porteur && (
              <div style={styles.teamCard}>
                <div style={styles.teamAvatar}>
                  {projet.porteur.avatar ? (
                    <img src={projet.porteur.avatar} alt="" style={styles.teamAvatarImg} />
                  ) : (
                    <span style={styles.teamInitial}>{projet.porteur.prenom[0]}</span>
                  )}
                </div>
                <div>
                  <span style={styles.teamName}>{projet.porteur.prenom} {projet.porteur.nom}</span>
                  <span style={styles.teamRole}>Fondateur</span>
                </div>
              </div>
            )}
            {projet.equipe && projet.equipe.map((membre, i) => (
              <div key={i} style={styles.teamCard}>
                <div style={styles.teamAvatar}>
                  {membre.photo ? (
                    <img src={membre.photo} alt="" style={styles.teamAvatarImg} />
                  ) : (
                    <span style={styles.teamInitial}>{membre.nom[0]}</span>
                  )}
                </div>
                <div>
                  <span style={styles.teamName}>{membre.nom}</span>
                  <span style={styles.teamRole}>{membre.titre || membre.role}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'docs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {projet.documents && projet.documents.length > 0 ? (
              <div style={styles.docsList}>
                {projet.documents
                  .filter((d) => d.visibilite === 'public')
                  .map((doc, i) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" style={styles.docCard}>
                      <FileText size={20} color={couleurs.primaire} />
                      <div style={{ flex: 1 }}>
                        <span style={styles.docName}>{doc.nom}</span>
                        <span style={styles.docType}>{doc.type.toUpperCase()}</span>
                      </div>
                      <ExternalLink size={16} color={couleurs.texteSecondaire} />
                    </a>
                  ))}
              </div>
            ) : (
              <p style={styles.emptyTab}>Aucun document public disponible</p>
            )}
            {projet.liens && projet.liens.length > 0 && (
              <div style={{ ...styles.section, marginTop: 24 }}>
                <h3 style={styles.sectionTitle}>Liens</h3>
                <div style={styles.linksList}>
                  {projet.liens.map((lien, i) => (
                    <a key={i} href={lien.url} target="_blank" rel="noopener noreferrer" style={styles.linkChip}>
                      <Globe size={14} /> {lien.label || lien.type}
                    </a>
                  ))}
                </div>
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
  heroPitch: {
    fontSize: '0.9375rem',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.4,
  },
  infoBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 0',
    borderBottom: `1px solid ${couleurs.bordure}`,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  infoItems: { display: 'flex', gap: 20, flexWrap: 'wrap' as const },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.875rem',
    color: couleurs.texte,
  },
  infoActions: { display: 'flex', gap: 8 },
  followBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 20px',
    borderRadius: 12,
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  tags: { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 20 },
  tag: {
    padding: '4px 12px',
    borderRadius: 20,
    backgroundColor: couleurs.primaireLight,
    color: couleurs.primaire,
    fontSize: '0.75rem',
    fontWeight: '500',
    border: `1px solid rgba(124,92,255,0.2)`,
  },
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
  description: {
    fontSize: '0.9375rem',
    color: couleurs.texte,
    lineHeight: 1.7,
    marginBottom: 24,
    whiteSpace: 'pre-wrap' as const,
  },
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
  metriquesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
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
  financingCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    marginBottom: 24,
  },
  financingRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  financingAmount: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.succes,
  },
  financingGoal: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
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
  teamCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    backgroundColor: couleurs.fondCard,
    borderRadius: 14,
    border: `1px solid ${couleurs.bordure}`,
    marginBottom: 10,
  },
  teamAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  teamInitial: { color: couleurs.blanc, fontWeight: '600' },
  teamName: {
    display: 'block',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  teamRole: {
    display: 'block',
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
  },
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
  emptyTab: {
    textAlign: 'center' as const,
    padding: 40,
    color: couleurs.texteSecondaire,
    fontSize: '0.9375rem',
  },
  linksList: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
  linkChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 10,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.primaire,
    fontSize: '0.8125rem',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'border-color 150ms ease',
  },
};