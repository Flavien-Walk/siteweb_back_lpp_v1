import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Compass,
  MessageCircle,
  Bell,
  User,
  Radio,
  LogOut,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { rechercherUtilisateurs } from '../../services/utilisateurs';
import type { ProfilUtilisateur } from '../../services/utilisateurs';
import { couleurs } from '../../styles/theme';

const NAV_ITEMS = [
  { to: '/feed', icon: Home, label: 'Accueil' },
  { to: '/decouvrir', icon: Compass, label: 'Decouvrir' },
  { to: '/lives', icon: Radio, label: 'Lives' },
  { to: '/messagerie', icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profil', icon: User, label: 'Profil' },
];

export default function Sidebar() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ProfilUtilisateur[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await rechercherUtilisateurs(searchQuery.trim());
      if (res.succes && res.data) {
        setResults(res.data.utilisateurs);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDeconnexion = () => {
    deconnexion();
    navigate('/connexion');
  };

  const handleSelectUser = (userId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setResults([]);
    navigate(`/utilisateur/${userId}`);
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoContainer} onClick={() => navigate('/')} role="button">
        <motion.div
          style={styles.logoIcon}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles size={24} color={couleurs.primaire} />
        </motion.div>
        <span style={styles.logoText}>LPP</span>
      </div>

      {/* Search bar */}
      <div style={styles.searchSection}>
        <div style={styles.searchBar}>
          <Search size={16} color={couleurs.texteSecondaire} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!searchOpen && e.target.value) setSearchOpen(true);
            }}
            onFocus={() => { if (searchQuery) setSearchOpen(true); }}
            placeholder="Rechercher..."
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              style={styles.searchClear}
              onClick={() => { setSearchQuery(''); setSearchOpen(false); setResults([]); }}
            >
              <X size={14} color={couleurs.texteSecondaire} />
            </button>
          )}
        </div>
        <AnimatePresence>
          {searchOpen && searchQuery.trim() && (
            <motion.div
              style={styles.searchResults}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {searching ? (
                <div className="skeleton" style={{ height: 40, borderRadius: 8, margin: 8 }} />
              ) : results.length > 0 ? (
                results.slice(0, 8).map((u) => (
                  <button
                    key={u._id}
                    style={styles.resultItem}
                    onClick={() => handleSelectUser(u._id)}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.backgroundColor = couleurs.fondCard; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <div style={styles.resultAvatar}>
                      {u.avatar ? (
                        <img src={u.avatar} alt="" style={styles.resultAvatarImg} />
                      ) : (
                        <span style={styles.resultInitial}>{u.prenom[0]}</span>
                      )}
                    </div>
                    <div style={styles.resultInfo}>
                      <span style={styles.resultName}>{u.prenom} {u.nom}</span>
                      <span style={styles.resultStatut}>
                        {u.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p style={styles.noResults}>Aucun resultat</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav style={styles.nav}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            {({ isActive }) => (
              <motion.div
                style={styles.navLinkInner}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.15 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    style={styles.activeIndicator}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon
                  size={20}
                  color={isActive ? couleurs.primaire : couleurs.texteSecondaire}
                />
                <span
                  style={{
                    ...styles.navLabel,
                    color: isActive ? couleurs.texte : couleurs.texteSecondaire,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {item.label}
                </span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={styles.bottomSection}>
        {utilisateur && (
          <motion.div
            style={styles.userInfo}
            whileHover={{ backgroundColor: couleurs.primaireLight }}
            onClick={() => navigate('/profil')}
          >
            <div style={styles.avatar}>
              {utilisateur.avatar ? (
                <img src={utilisateur.avatar} alt="" style={styles.avatarImg} />
              ) : (
                <span style={styles.avatarInitial}>
                  {utilisateur.prenom[0]}
                </span>
              )}
            </div>
            <div style={styles.userDetails}>
              <span style={styles.userName}>
                {utilisateur.prenom} {utilisateur.nom}
              </span>
              <span style={styles.userStatus}>
                {utilisateur.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
              </span>
            </div>
          </motion.div>
        )}
        <motion.button
          style={styles.logoutBtn}
          whileHover={{ backgroundColor: couleurs.dangerLight }}
          whileTap={{ scale: 0.97 }}
          onClick={handleDeconnexion}
        >
          <LogOut size={18} color={couleurs.danger} />
          <span style={{ color: couleurs.danger, fontSize: '0.875rem' }}>
            Deconnexion
          </span>
        </motion.button>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 260,
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    backgroundColor: couleurs.fondElevated,
    borderRight: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 100,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 12px',
    marginBottom: 20,
    cursor: 'pointer',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: couleurs.primaireLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: '800',
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.secondaire})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '0.05em',
  },
  searchSection: {
    position: 'relative' as const,
    marginBottom: 16,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 10,
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: couleurs.texte,
    fontSize: '0.8125rem',
    minWidth: 0,
  },
  searchClear: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
  },
  searchResults: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: couleurs.fondElevated,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 12,
    padding: 4,
    maxHeight: 320,
    overflowY: 'auto' as const,
    zIndex: 50,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    backgroundColor: 'transparent',
    transition: 'background-color 150ms ease',
  },
  resultAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  resultAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  resultInitial: { color: couleurs.blanc, fontWeight: '600', fontSize: '0.75rem' },
  resultInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  resultName: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texte,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resultStatut: {
    fontSize: '0.6875rem',
    color: couleurs.texteSecondaire,
  },
  noResults: {
    textAlign: 'center' as const,
    padding: 16,
    color: couleurs.texteSecondaire,
    fontSize: '0.8125rem',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  navLink: {
    textDecoration: 'none',
    borderRadius: 12,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  },
  navLinkActive: {
    backgroundColor: couleurs.primaireLight,
  },
  navLinkInner: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    position: 'relative' as const,
  },
  activeIndicator: {
    position: 'absolute' as const,
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 20,
    borderRadius: 4,
    backgroundColor: couleurs.primaire,
  },
  navLabel: {
    fontSize: '0.9375rem',
    transition: 'color 150ms ease',
  },
  bottomSection: {
    borderTop: `1px solid ${couleurs.bordure}`,
    paddingTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  avatarInitial: {
    color: couleurs.blanc,
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: couleurs.texte,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userStatus: {
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 12,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
};
