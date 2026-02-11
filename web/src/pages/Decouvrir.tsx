import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Users, TrendingUp, Filter, X } from 'lucide-react';
import { getProjets, getProjetsTendance } from '../services/projets';
import type { Projet, CategorieProjet, MaturiteProjet } from '../services/projets';
import { couleurs } from '../styles/theme';

const CATEGORIES: { value: CategorieProjet; label: string; emoji: string }[] = [
  { value: 'tech', label: 'Tech', emoji: '💻' },
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'sante', label: 'Santé', emoji: '🏥' },
  { value: 'education', label: 'Éducation', emoji: '📚' },
  { value: 'energie', label: 'Énergie', emoji: '⚡' },
  { value: 'culture', label: 'Culture', emoji: '🎨' },
  { value: 'environnement', label: 'Environnement', emoji: '🌿' },
  { value: 'autre', label: 'Autre', emoji: '✨' },
];

const MATURITES: { value: MaturiteProjet; label: string }[] = [
  { value: 'idee', label: 'Idée' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'lancement', label: 'Lancement' },
  { value: 'croissance', label: 'Croissance' },
];

function ProjetCard({ projet, index }: { projet: Projet; index: number }) {
  const navigate = useNavigate();
  const cat = CATEGORIES.find((c) => c.value === projet.categorie);

  return (
    <motion.div
      style={styles.projetCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}
      onClick={() => navigate(`/projets/${projet._id}`)}
    >
      <div style={styles.projetImgContainer}>
        <img
          src={projet.image || projet.logo || 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=300&fit=crop&q=80'}
          alt={projet.nom}
          style={styles.projetImg}
        />
        <div style={styles.projetBadge}>
          {cat?.emoji} {cat?.label || projet.categorie}
        </div>
        {projet.maturite && (
          <div style={styles.maturiteBadge}>
            {MATURITES.find((m) => m.value === projet.maturite)?.label || projet.maturite}
          </div>
        )}
      </div>
      <div style={styles.projetBody}>
        <h3 style={styles.projetNom}>{projet.nom}</h3>
        <p style={styles.projetPitch}>{projet.pitch}</p>
        <div style={styles.projetMeta}>
          {projet.localisation?.ville && (
            <span style={styles.metaItem}>
              <MapPin size={14} /> {projet.localisation.ville}
            </span>
          )}
          <span style={styles.metaItem}>
            <Users size={14} /> {projet.nbFollowers || projet.followers?.length || 0}
          </span>
        </div>
        {projet.objectifFinancement && projet.objectifFinancement > 0 && (
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <motion.div
                style={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(projet.progression || 0, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
            <span style={styles.progressText}>{projet.progression || 0}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Decouvrir() {
  const [projets, setProjets] = useState<Projet[]>([]);
  const [tendances, setTendances] = useState<Projet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categorie, setCategorie] = useState<CategorieProjet | ''>('');
  const [maturite, setMaturite] = useState<MaturiteProjet | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getProjetsTendance(8).then((res) => {
      if (res.succes && res.data) {
        setTendances(res.data.projets);
      }
    });
  }, []);

  const chargerProjets = useCallback(async () => {
    setLoading(true);
    const res = await getProjets({
      q: search || undefined,
      categorie: categorie || undefined,
      maturite: maturite || undefined,
      limit: 30,
    });
    if (res.succes && res.data) {
      setProjets(res.data.projets);
    }
    setLoading(false);
  }, [search, categorie, maturite]);

  useEffect(() => {
    const timer = setTimeout(chargerProjets, 300);
    return () => clearTimeout(timer);
  }, [chargerProjets]);

  const resetFilters = () => {
    setCategorie('');
    setMaturite('');
    setSearch('');
  };

  const hasFilters = categorie || maturite || search;

  return (
    <div style={styles.page}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={styles.header}
      >
        <div>
          <h1 style={styles.pageTitle}>Découvrir</h1>
          <p style={styles.pageSubtitle}>Explore les projets qui façonnent demain</p>
        </div>
      </motion.div>

      {tendances.length > 0 && (
        <div style={styles.tendancesSection}>
          <div style={styles.tendancesHeader}>
            <TrendingUp size={18} color={couleurs.secondaire} />
            <span style={styles.tendancesTitle}>Tendances</span>
          </div>
          <div style={styles.tendancesScroll}>
            {tendances.map((p, i) => (
              <motion.div
                key={p._id}
                style={styles.tendanceCard}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
                onClick={() => navigate(`/projets/${p._id}`)}
              >
                <img
                  src={p.image || p.logo || 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&h=120&fit=crop&q=80'}
                  alt={p.nom}
                  style={styles.tendanceImg}
                />
                <div style={styles.tendanceBody}>
                  <span style={styles.tendanceName}>{p.nom}</span>
                  <span style={styles.tendanceCat}>
                    {CATEGORIES.find((c) => c.value === p.categorie)?.emoji}{' '}
                    {CATEGORIES.find((c) => c.value === p.categorie)?.label || p.categorie}
                  </span>
                  <span style={styles.tendanceFollowers}>
                    <Users size={12} /> {p.nbFollowers || 0}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.searchBar}>
        <Search size={20} color={couleurs.texteSecondaire} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un projet, un secteur..."
          style={styles.searchInput}
        />
        <motion.button
          style={{
            ...styles.filterBtn,
            backgroundColor: showFilters ? couleurs.primaireLight : 'transparent',
          }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={showFilters ? couleurs.primaire : couleurs.texteSecondaire} />
        </motion.button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={styles.filtersContainer}>
              <div style={styles.filterSection}>
                <span style={styles.filterLabel}>Catégorie</span>
                <div style={styles.chips}>
                  {CATEGORIES.map((cat) => (
                    <motion.button
                      key={cat.value}
                      style={{
                        ...styles.chip,
                        backgroundColor: categorie === cat.value ? couleurs.primaireLight : 'transparent',
                        borderColor: categorie === cat.value ? couleurs.primaire : couleurs.bordure,
                        color: categorie === cat.value ? couleurs.primaire : couleurs.texteSecondaire,
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCategorie(categorie === cat.value ? '' : cat.value)}
                    >
                      {cat.emoji} {cat.label}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div style={styles.filterSection}>
                <span style={styles.filterLabel}>Maturité</span>
                <div style={styles.chips}>
                  {MATURITES.map((m) => (
                    <motion.button
                      key={m.value}
                      style={{
                        ...styles.chip,
                        backgroundColor: maturite === m.value ? couleurs.secondaireLight : 'transparent',
                        borderColor: maturite === m.value ? couleurs.secondaire : couleurs.bordure,
                        color: maturite === m.value ? couleurs.secondaire : couleurs.texteSecondaire,
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMaturite(maturite === m.value ? '' : m.value)}
                    >
                      {m.label}
                    </motion.button>
                  ))}
                </div>
              </div>
              {hasFilters && (
                <button style={styles.resetBtn} onClick={resetFilters}>
                  <X size={14} /> Réinitialiser
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton" style={{ height: 320, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <>
          <div style={styles.grid}>
            {projets.map((projet, i) => (
              <ProjetCard key={projet._id} projet={projet} index={i} />
            ))}
          </div>
          {projets.length === 0 && (
            <div style={styles.empty}>
              <TrendingUp size={48} color={couleurs.texteMuted} />
              <p style={styles.emptyText}>Aucun projet trouvé</p>
              <p style={styles.emptySubtext}>Essaie de modifier tes filtres</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {},
  header: {
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  pageSubtitle: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
    marginTop: 4,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 14,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: couleurs.texte,
    fontSize: '0.9375rem',
  },
  filterBtn: {
    padding: 8,
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  filtersContainer: {
    padding: '16px 20px',
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 14,
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  filterLabel: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid',
    fontSize: '0.8125rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 150ms ease',
    backgroundColor: 'transparent',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: couleurs.dangerLight,
    color: couleurs.danger,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  projetCard: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    border: `1px solid ${couleurs.bordure}`,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 300ms ease',
  },
  projetImgContainer: {
    position: 'relative' as const,
    height: 160,
    overflow: 'hidden',
  },
  projetImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  projetBadge: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    padding: '4px 10px',
    borderRadius: 8,
    backgroundColor: 'rgba(13, 13, 18, 0.8)',
    backdropFilter: 'blur(8px)',
    color: couleurs.texte,
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  maturiteBadge: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    padding: '4px 10px',
    borderRadius: 8,
    backgroundColor: 'rgba(124, 92, 255, 0.8)',
    backdropFilter: 'blur(8px)',
    color: couleurs.blanc,
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  projetBody: {
    padding: 16,
  },
  projetNom: {
    fontSize: '1.0625rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 6,
  },
  projetPitch: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
    marginBottom: 12,
  },
  projetMeta: {
    display: 'flex',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: couleurs.bordure,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    background: `linear-gradient(90deg, ${couleurs.primaire}, ${couleurs.secondaire})`,
  },
  progressText: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: couleurs.primaire,
  },
  empty: {
    textAlign: 'center' as const,
    padding: 64,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  emptySubtext: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
  },
  tendancesSection: {
    marginBottom: 24,
  },
  tendancesHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  tendancesTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  tendancesScroll: {
    display: 'flex',
    gap: 14,
    overflowX: 'auto' as const,
    paddingBottom: 8,
  },
  tendanceCard: {
    minWidth: 200,
    backgroundColor: couleurs.fondCard,
    borderRadius: 14,
    border: `1px solid ${couleurs.bordure}`,
    overflow: 'hidden' as const,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'box-shadow 200ms ease',
  },
  tendanceImg: {
    width: '100%',
    height: 100,
    objectFit: 'cover' as const,
  },
  tendanceBody: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  tendanceName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: couleurs.texte,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  tendanceCat: {
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
  },
  tendanceFollowers: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
};