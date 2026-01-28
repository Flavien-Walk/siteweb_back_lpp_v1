import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiBell,
  HiCheckCircle,
  HiTrendingUp,
  HiSpeakerphone,
  HiVideoCamera,
  HiChat,
  HiHeart,
  HiUserAdd,
  HiTrash,
  HiChevronRight,
  HiX,
} from 'react-icons/hi';
import {
  getNotifications,
  marquerLue,
  marquerToutLu,
  supprimerNotification,
  type Notification,
} from '../../services/notifications';
import { MOCK_NOTIFICATIONS } from '../../data/mockData';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'projet-update': { icon: HiTrendingUp, color: '#2DE2E6', bg: 'rgba(45, 226, 230, 0.1)' },
  annonce: { icon: HiSpeakerphone, color: '#FFBD59', bg: 'rgba(255, 189, 89, 0.1)' },
  'live-rappel': { icon: HiVideoCamera, color: '#FF4D6D', bg: 'rgba(255, 77, 109, 0.1)' },
  interaction: { icon: HiChat, color: '#7C5CFF', bg: 'rgba(124, 92, 255, 0.1)' },
  like: { icon: HiHeart, color: '#FF4D6D', bg: 'rgba(255, 77, 109, 0.1)' },
  follow: { icon: HiUserAdd, color: '#00D68F', bg: 'rgba(0, 214, 143, 0.1)' },
};

const NotificationsPanel = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    setChargement(true);
    const res = await getNotifications();
    if (res.succes && res.data && res.data.notifications.length > 0) {
      setNotifications(res.data.notifications);
      setNonLues(res.data.nonLues);
    } else {
      setNotifications(MOCK_NOTIFICATIONS);
      setNonLues(MOCK_NOTIFICATIONS.filter((n) => !n.lue).length);
    }
    setChargement(false);
  };

  const handleMarquerLue = async (id: string) => {
    const notif = notifications.find((n) => n._id === id);
    if (notif && !notif.lue) {
      await marquerLue(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, lue: true } : n))
      );
      setNonLues((prev) => Math.max(0, prev - 1));
    }
  };

  const handleToutLu = async () => {
    await marquerToutLu();
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    setNonLues(0);
  };

  const handleSupprimer = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const notif = notifications.find((n) => n._id === id);
    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (notif && !notif.lue) {
      setNonLues((prev) => Math.max(0, prev - 1));
    }
    await supprimerNotification(id);
  };

  const handleClick = (notif: Notification) => {
    handleMarquerLue(notif._id);
    if (notif.lien) {
      if (notif.lien.startsWith('http')) {
        window.open(notif.lien, '_blank');
      } else {
        navigate(notif.lien);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const heures = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (heures < 24) return `Il y a ${heures}h`;
    const jours = Math.floor(heures / 24);
    if (jours < 7) return `Il y a ${jours} jour${jours > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const filteredNotifications = filtre === 'unread'
    ? notifications.filter((n) => !n.lue)
    : notifications;

  if (chargement) {
    return (
      <div className="notif-panel">
        <div className="notif-loading">
          <div className="notif-loading-spinner" />
          <span>Chargement des notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="notif-panel">
      {/* Header */}
      <div className="notif-panel-header">
        <div className="notif-panel-title-row">
          <h2 className="notif-panel-title">
            <HiBell className="notif-panel-title-icon" />
            Notifications
          </h2>
          {nonLues > 0 && (
            <span className="notif-panel-badge">{nonLues} nouvelle{nonLues > 1 ? 's' : ''}</span>
          )}
        </div>

        <div className="notif-panel-actions">
          <div className="notif-filters">
            <button
              className={`notif-filter-btn ${filtre === 'all' ? 'active' : ''}`}
              onClick={() => setFiltre('all')}
            >
              Toutes
            </button>
            <button
              className={`notif-filter-btn ${filtre === 'unread' ? 'active' : ''}`}
              onClick={() => setFiltre('unread')}
            >
              Non lues
            </button>
          </div>

          {nonLues > 0 && (
            <button className="notif-mark-all-btn" onClick={handleToutLu}>
              <HiCheckCircle />
              Tout marquer lu
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      {filteredNotifications.length === 0 ? (
        <div className="notif-empty">
          <div className="notif-empty-icon-wrapper">
            <HiBell className="notif-empty-icon" />
          </div>
          <h3 className="notif-empty-title">
            {filtre === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
          </h3>
          <p className="notif-empty-text">
            {filtre === 'unread'
              ? 'Toutes tes notifications ont été lues.'
              : 'Tes notifications apparaîtront ici.'}
          </p>
        </div>
      ) : (
        <div className="notif-list">
          <AnimatePresence mode="popLayout">
            {filteredNotifications.map((notif, i) => {
              const config = typeConfig[notif.type] || { icon: HiBell, color: '#7C5CFF', bg: 'rgba(124, 92, 255, 0.1)' };
              const Icon = config.icon;

              return (
                <motion.div
                  key={notif._id}
                  className={`notif-card ${!notif.lue ? 'notif-card-unread' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100, height: 0, marginBottom: 0, padding: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  layout
                >
                  {/* Contenu cliquable */}
                  <div
                    className={`notif-card-main ${notif.lien ? 'clickable' : ''}`}
                    onClick={() => handleClick(notif)}
                  >
                    <div
                      className="notif-card-icon"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      <Icon />
                    </div>

                    <div className="notif-card-content">
                      <div className="notif-card-header">
                        <span className="notif-card-title">{notif.titre}</span>
                        <span className="notif-card-time">{formatDate(notif.dateCreation)}</span>
                      </div>
                      <p className="notif-card-message">{notif.message}</p>
                    </div>

                    {!notif.lue && <span className="notif-card-dot" />}
                    {notif.lien && <HiChevronRight className="notif-card-chevron" />}
                  </div>

                  {/* Bouton supprimer séparé */}
                  <button
                    className="notif-delete-btn"
                    onClick={(e) => handleSupprimer(notif._id, e)}
                    aria-label="Supprimer la notification"
                  >
                    <HiX />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
