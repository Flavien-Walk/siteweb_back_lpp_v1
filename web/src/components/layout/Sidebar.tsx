import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Compass,
  MessageCircle,
  Bell,
  User,
  Radio,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { couleurs } from '../../styles/theme';

const NAV_ITEMS = [
  { to: '/feed', icon: Home, label: 'Accueil' },
  { to: '/decouvrir', icon: Compass, label: 'Découvrir' },
  { to: '/lives', icon: Radio, label: 'Lives' },
  { to: '/messagerie', icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profil', icon: User, label: 'Profil' },
];

export default function Sidebar() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate = useNavigate();

  const handleDeconnexion = () => {
    deconnexion();
    navigate('/connexion');
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoContainer}>
        <motion.div
          style={styles.logoIcon}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles size={24} color={couleurs.primaire} />
        </motion.div>
        <span style={styles.logoText}>LPP</span>
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
          <div style={styles.userInfo}>
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
                {utilisateur.statut === 'entrepreneur' ? 'Entrepreneur' : 'Investisseur'}
              </span>
            </div>
          </div>
        )}
        <motion.button
          style={styles.logoutBtn}
          whileHover={{ backgroundColor: couleurs.dangerLight }}
          whileTap={{ scale: 0.97 }}
          onClick={handleDeconnexion}
        >
          <LogOut size={18} color={couleurs.danger} />
          <span style={{ color: couleurs.danger, fontSize: '0.875rem' }}>
            Déconnexion
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
    marginBottom: 32,
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