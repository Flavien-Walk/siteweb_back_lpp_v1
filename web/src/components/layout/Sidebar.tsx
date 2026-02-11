import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { couleurs } from '../../styles/theme';

export default function Sidebar() {
  const { utilisateur, deconnexion } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const pathnameRef = useRef(location.pathname);

  // Keep ref in sync and reset badge when on notifications page
  useEffect(() => {
    pathnameRef.current = location.pathname;
    if (location.pathname === '/notifications') {
      setUnreadNotifications(0);
    }
  }, [location.pathname]);

  const fetchUnreadCounts = useCallback(() => {
    if (socket?.connected) {
      socket.emit('get_unread_counts');
    }
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleUnreadCounts = (data: { messages?: number; notifications?: number; demandesAmis?: number }) => {
      setUnreadMessages(data.messages || 0);
      if (pathnameRef.current !== '/notifications') {
        setUnreadNotifications((data.notifications || 0) + (data.demandesAmis || 0));
      }
    };

    const handleNewMessage = () => {
      setUnreadMessages((prev) => prev + 1);
    };

    const handleNewNotification = () => {
      if (pathnameRef.current !== '/notifications') {
        setUnreadNotifications((prev) => prev + 1);
      }
    };

    socket.on('unread_counts', handleUnreadCounts);
    socket.on('new_message', handleNewMessage);
    socket.on('new_notification', handleNewNotification);
    socket.on('demande_ami', handleNewNotification);

    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 60000);

    return () => {
      socket.off('unread_counts', handleUnreadCounts);
      socket.off('new_message', handleNewMessage);
      socket.off('new_notification', handleNewNotification);
      socket.off('demande_ami', handleNewNotification);
      clearInterval(interval);
    };
  }, [socket, fetchUnreadCounts]);

  const handleDeconnexion = () => {
    deconnexion();
    navigate('/connexion');
  };

  const navItems = [
    { to: '/feed', icon: Home, label: 'Accueil', badge: 0 },
    { to: '/decouvrir', icon: Compass, label: 'Decouvrir', badge: 0 },
    { to: '/lives', icon: Radio, label: 'Lives', badge: 0 },
    { to: '/messagerie', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications },
    ...(utilisateur?.statut === 'entrepreneur'
      ? [{ to: '/entrepreneur', icon: Briefcase, label: 'Mes Projets', badge: 0 }]
      : []),
    { to: '/profil', icon: User, label: 'Profil', badge: 0 },
  ];

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

      <nav style={styles.nav}>
        {navItems.map((item) => (
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
                <div style={{ position: 'relative' as const }}>
                  <item.icon
                    size={20}
                    color={isActive ? couleurs.primaire : couleurs.texteSecondaire}
                  />
                  {item.badge > 0 && (
                    <span style={styles.badge}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
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
                {utilisateur.role === 'super_admin' ? 'Fondateur'
                  : utilisateur.role === 'admin' || utilisateur.role === 'admin_modo' ? 'Admin'
                  : utilisateur.role === 'modo' ? 'Moderateur'
                  : utilisateur.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
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
  badge: {
    position: 'absolute' as const,
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: couleurs.danger,
    color: couleurs.blanc,
    fontSize: '0.625rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
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
