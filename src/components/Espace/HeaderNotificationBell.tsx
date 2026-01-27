import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiBell } from 'react-icons/hi';
import { getNotifications, marquerLue, type Notification } from '../../services/notifications';

const iconType: Record<string, string> = {
  'projet-update': '📊',
  annonce: '📢',
  'live-rappel': '🔴',
  interaction: '💬',
};

const HeaderNotificationBell = () => {
  const navigate = useNavigate();
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
    const res = await getNotifications({ limit: '5' });
    if (res.succes && res.data) {
      setNotifications(res.data.notifications);
      setNonLues(res.data.nonLues);
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
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'Maintenant';
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}j`;
  };

  return (
    <div className="notif-dropdown-wrapper" ref={ref}>
      <button
        className="header-notif-btn"
        onClick={() => setOuvert(!ouvert)}
        aria-label="Notifications"
      >
        <HiBell size={18} />
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
              onClick={() => { setOuvert(false); navigate('/espace'); }}
            >
              Voir tout dans Mon espace
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeaderNotificationBell;
