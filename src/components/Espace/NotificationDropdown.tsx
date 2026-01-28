import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiBell,
  HiTrendingUp,
  HiSpeakerphone,
  HiVideoCamera,
  HiChat,
  HiHeart,
  HiUserAdd,
  HiChevronRight,
} from 'react-icons/hi';
import { getNotifications, marquerLue, type Notification } from '../../services/notifications';
import { MOCK_NOTIFICATIONS } from '../../data/mockData';

interface Props {
  onVoirTout: () => void;
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'projet-update': { icon: HiTrendingUp, color: '#2DE2E6', bg: 'rgba(45, 226, 230, 0.15)' },
  annonce: { icon: HiSpeakerphone, color: '#FFBD59', bg: 'rgba(255, 189, 89, 0.15)' },
  'live-rappel': { icon: HiVideoCamera, color: '#FF4D6D', bg: 'rgba(255, 77, 109, 0.15)' },
  interaction: { icon: HiChat, color: '#7C5CFF', bg: 'rgba(124, 92, 255, 0.15)' },
  like: { icon: HiHeart, color: '#FF4D6D', bg: 'rgba(255, 77, 109, 0.15)' },
  follow: { icon: HiUserAdd, color: '#00D68F', bg: 'rgba(0, 214, 143, 0.15)' },
};

const NotificationDropdown = ({ onVoirTout }: Props) => {
  const [ouvert, setOuvert] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    charger();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const charger = async () => {
    const res = await getNotifications({ limit: '6' });
    if (res.succes && res.data && res.data.notifications.length > 0) {
      setNotifications(res.data.notifications);
      setNonLues(res.data.nonLues);
    } else {
      const mock = MOCK_NOTIFICATIONS.slice(0, 6);
      setNotifications(mock);
      setNonLues(mock.filter((n) => !n.lue).length);
    }
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.lue) {
      await marquerLue(notif._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notif._id ? { ...n, lue: true } : n))
      );
      setNonLues((prev) => Math.max(0, prev - 1));
    }
  };

  const formatDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    if (min < 1) return 'Maintenant';
    if (min < 60) return `${min}min`;
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
  };

  return (
    <div className="notif-dropdown-wrapper" ref={ref}>
      <button
        className="notif-bell-btn"
        onClick={() => setOuvert(!ouvert)}
        aria-label="Notifications"
        aria-expanded={ouvert}
      >
        <HiBell />
        {nonLues > 0 && (
          <span className="notif-bell-badge">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            className="notif-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="notif-dropdown-header">
              <div className="notif-dropdown-header-left">
                <HiBell className="notif-dropdown-header-icon" />
                <span className="notif-dropdown-header-title">Notifications</span>
              </div>
              {nonLues > 0 && (
                <span className="notif-dropdown-header-badge">
                  {nonLues} nouvelle{nonLues > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Liste */}
            <div className="notif-dropdown-list">
              {notifications.length === 0 ? (
                <div className="notif-dropdown-empty">
                  <HiBell className="notif-dropdown-empty-icon" />
                  <span>Aucune notification</span>
                </div>
              ) : (
                notifications.map((notif) => {
                  const config = typeConfig[notif.type] || { icon: HiBell, color: '#7C5CFF', bg: 'rgba(124, 92, 255, 0.15)' };
                  const Icon = config.icon;

                  return (
                    <div
                      key={notif._id}
                      className={`notif-dropdown-item ${!notif.lue ? 'unread' : ''}`}
                      onClick={() => handleClick(notif)}
                    >
                      <div
                        className="notif-dropdown-item-icon"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        <Icon />
                      </div>
                      <div className="notif-dropdown-item-content">
                        <span className="notif-dropdown-item-title">{notif.titre}</span>
                        <span className="notif-dropdown-item-time">{formatDate(notif.dateCreation)}</span>
                      </div>
                      {!notif.lue && <span className="notif-dropdown-item-dot" />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <button
              className="notif-dropdown-footer"
              onClick={() => {
                setOuvert(false);
                onVoirTout();
              }}
            >
              <span>Voir toutes les notifications</span>
              <HiChevronRight />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
