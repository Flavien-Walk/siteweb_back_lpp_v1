import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiBell } from 'react-icons/hi';
import { getNotifications, marquerLue, type Notification } from '../../services/notifications';
import { MOCK_NOTIFICATIONS } from '../../data/mockData';

interface Props {
  onVoirTout: () => void;
}

const iconType: Record<string, string> = {
  'projet-update': '📊',
  annonce: '📢',
  'live-rappel': '🔴',
  interaction: '💬',
};

const NotificationDropdown = ({ onVoirTout }: Props) => {
  const [ouvert, setOuvert] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    charger();
  }, []);

  // Fermer le dropdown quand on clique ailleurs
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
    const res = await getNotifications({ limit: '8' });
    if (res.succes && res.data && res.data.notifications.length > 0) {
      setNotifications(res.data.notifications);
      setNonLues(res.data.nonLues);
    } else {
      const mock = MOCK_NOTIFICATIONS.slice(0, 8);
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
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const heures = Math.floor(diff / (1000 * 60 * 60));
    if (heures < 1) return 'Maintenant';
    if (heures < 24) return `${heures}h`;
    return `${Math.floor(heures / 24)}j`;
  };

  return (
    <div className="notif-dropdown-wrapper" ref={ref}>
      <button
        className="notif-dropdown-btn"
        onClick={() => setOuvert(!ouvert)}
        aria-label="Notifications"
        aria-expanded={ouvert}
      >
        <HiBell size={20} />
        {nonLues > 0 && <span className="notif-dropdown-badge">{nonLues}</span>}
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            className="notif-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="notif-dropdown-header">
              <strong>Notifications</strong>
              {nonLues > 0 && <span className="notif-dropdown-count">{nonLues} nouvelle{nonLues > 1 ? 's' : ''}</span>}
            </div>

            <div className="notif-dropdown-list">
              {notifications.length === 0 ? (
                <p className="notif-dropdown-vide">Aucune notification</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`notif-dropdown-item ${!notif.lue ? 'notif-dropdown-item-new' : ''}`}
                    onClick={() => handleClick(notif)}
                  >
                    <span className="notif-dropdown-icon">{iconType[notif.type] || '🔔'}</span>
                    <div className="notif-dropdown-text">
                      <span className="notif-dropdown-titre">{notif.titre}</span>
                      <span className="notif-dropdown-date">{formatDate(notif.dateCreation)}</span>
                    </div>
                    {!notif.lue && <span className="notif-dropdown-dot" />}
                  </div>
                ))
              )}
            </div>

            <button
              className="notif-dropdown-voir-tout"
              onClick={() => {
                setOuvert(false);
                onVoirTout();
              }}
            >
              Voir toutes les notifications
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
