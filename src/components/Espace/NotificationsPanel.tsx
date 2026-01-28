import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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

const SWIPE_THRESHOLD = -80;

const NotificationsPanel = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<'all' | 'unread'>('all');
  const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    charger();
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    const res = await marquerLue(id);
    if (res.succes) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, lue: true } : n))
      );
      setNonLues((prev) => Math.max(0, prev - 1));
    }
  };

  const handleToutLu = async () => {
    const res = await marquerToutLu();
    if (res.succes) {
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
      setNonLues(0);
    }
  };

  const handleSupprimer = async (id: string) => {
    setSuppressionEnCours(id);
    const res = await supprimerNotification(id);
    if (res.succes) {
      const notif = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (notif && !notif.lue) {
        setNonLues((prev) => Math.max(0, prev - 1));
      }
    }
    setSuppressionEnCours(null);
  };

  const handleClick = (notif: Notification) => {
    if (!notif.lue) {
      handleMarquerLue(notif._id);
    }
    if (notif.lien) {
      // Si c'est un lien externe
      if (notif.lien.startsWith('http')) {
        window.open(notif.lien, '_blank');
      } else {
        // Lien interne
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
          {/* Filtres */}
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

      {isMobile && (
        <p className="notif-swipe-hint">Glisse vers la gauche pour supprimer</p>
      )}

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
            {filteredNotifications.map((notif, i) => (
              <NotificationCard
                key={notif._id}
                notif={notif}
                index={i}
                isMobile={isMobile}
                onClick={() => handleClick(notif)}
                onDelete={() => handleSupprimer(notif._id)}
                isDeleting={suppressionEnCours === notif._id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// Composant NotificationCard avec swipe
interface NotificationCardProps {
  notif: Notification;
  index: number;
  isMobile: boolean;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const NotificationCard = ({
  notif,
  index,
  isMobile,
  onClick,
  onDelete,
  isDeleting,
}: NotificationCardProps) => {
  const [dragX, setDragX] = useState(0);
  const config = typeConfig[notif.type] || { icon: HiBell, color: '#7C5CFF', bg: 'rgba(124, 92, 255, 0.1)' };
  const Icon = config.icon;

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

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < SWIPE_THRESHOLD) {
      onDelete();
    }
    setDragX(0);
  };

  return (
    <motion.div
      className="notif-card-wrapper"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      {/* Bouton supprimer visible en arrière-plan */}
      <div className="notif-card-delete-bg">
        <HiTrash />
        <span>Supprimer</span>
      </div>

      <motion.div
        className={`notif-card ${!notif.lue ? 'notif-card-unread' : ''} ${notif.lien ? 'notif-card-clickable' : ''}`}
        drag={isMobile ? 'x' : false}
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        onClick={onClick}
        whileTap={{ scale: isMobile ? 1 : 0.99 }}
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

        <div className="notif-card-actions">
          {!notif.lue && (
            <span className="notif-card-dot" />
          )}
          {notif.lien && (
            <HiChevronRight className="notif-card-chevron" />
          )}
          {!isMobile && (
            <button
              className="notif-card-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              aria-label="Supprimer"
            >
              <HiTrash />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NotificationsPanel;
