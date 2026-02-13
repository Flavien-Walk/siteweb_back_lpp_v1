import { useEffect, useState, useCallback, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, MessageCircle, Bell, User } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { couleurs } from '../../styles/theme';

export default function MobileNav() {
  const { socket } = useSocket();
  const location = useLocation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
    if (location.pathname === '/notifications') setUnreadNotifications(0);
  }, [location.pathname]);

  const fetchUnread = useCallback(() => {
    if (socket?.connected) socket.emit('get_unread_counts');
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleCounts = (data: { messages?: number; notifications?: number; demandesAmis?: number }) => {
      setUnreadMessages(data.messages || 0);
      if (pathnameRef.current !== '/notifications') {
        setUnreadNotifications((data.notifications || 0) + (data.demandesAmis || 0));
      }
    };
    const handleMsg = () => setUnreadMessages((p) => p + 1);
    const handleNotif = () => {
      if (pathnameRef.current !== '/notifications') setUnreadNotifications((p) => p + 1);
    };
    socket.on('unread_counts', handleCounts);
    socket.on('new_message', handleMsg);
    socket.on('new_notification', handleNotif);
    socket.on('demande_ami', handleNotif);
    fetchUnread();
    return () => {
      socket.off('unread_counts', handleCounts);
      socket.off('new_message', handleMsg);
      socket.off('new_notification', handleNotif);
      socket.off('demande_ami', handleNotif);
    };
  }, [socket, fetchUnread]);

  const items = [
    { to: '/feed', icon: Home, label: 'Accueil', badge: 0 },
    { to: '/decouvrir', icon: Compass, label: 'Explorer', badge: 0 },
    { to: '/messagerie', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
    { to: '/notifications', icon: Bell, label: 'Notifs', badge: unreadNotifications },
    { to: '/profil', icon: User, label: 'Profil', badge: 0 },
  ];

  return (
    <nav style={s.nav} className="bottom-nav">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          style={{ textDecoration: 'none', flex: 1, display: 'flex', justifyContent: 'center' }}
        >
          {({ isActive }) => (
            <div style={s.item}>
              <div style={{ position: 'relative' as const }}>
                <item.icon
                  size={22}
                  color={isActive ? couleurs.primaire : couleurs.texteSecondaire}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {item.badge > 0 && (
                  <span style={s.badge}>{item.badge > 99 ? '99+' : item.badge}</span>
                )}
              </div>
              <span style={{
                fontSize: '0.625rem',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? couleurs.primaire : couleurs.texteSecondaire,
                marginTop: 2,
              }}>
                {item.label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

const s: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: couleurs.fondElevated,
    borderTop: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 150,
    paddingBottom: 'env(safe-area-inset-bottom, 0)',
  },
  item: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 0',
    minWidth: 48,
  },
  badge: {
    position: 'absolute' as const,
    top: -5,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: couleurs.danger,
    color: couleurs.blanc,
    fontSize: '0.5625rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 3px',
  },
};
