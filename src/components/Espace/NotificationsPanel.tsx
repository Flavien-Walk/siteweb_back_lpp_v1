import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiBell, HiCheck } from 'react-icons/hi';
import { getNotifications, marquerLue, marquerToutLu, type Notification } from '../../services/notifications';

const iconType: Record<string, string> = {
  'projet-update': '📊',
  annonce: '📢',
  'live-rappel': '🔴',
  interaction: '💬',
};

const NotificationsPanel = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    charger();
  }, []);

  const charger = async () => {
    setChargement(true);
    const res = await getNotifications();
    if (res.succes && res.data) {
      setNotifications(res.data.notifications);
      setNonLues(res.data.nonLues);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const heures = Math.floor(diff / (1000 * 60 * 60));
    if (heures < 1) return 'À l\'instant';
    if (heures < 24) return `Il y a ${heures}h`;
    const jours = Math.floor(heures / 24);
    if (jours < 7) return `Il y a ${jours}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (chargement) {
    return <div className="espace-loading">Chargement des notifications...</div>;
  }

  return (
    <div className="notif-panel">
      <div className="notif-panel-header">
        <h2 className="espace-titre">
          Notifications
          {nonLues > 0 && <span className="notif-badge-titre">{nonLues}</span>}
        </h2>
        {nonLues > 0 && (
          <button className="notif-tout-lu" onClick={handleToutLu}>
            <HiCheck /> Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="espace-vide-container">
          <HiBell className="espace-vide-icon" />
          <h3>Aucune notification</h3>
          <p>Tes notifications apparaîtront ici.</p>
        </div>
      ) : (
        <div className="notif-liste">
          {notifications.map((notif, i) => (
            <motion.div
              key={notif._id}
              className={`notif-item ${!notif.lue ? 'notif-item-nonlue' : ''}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => !notif.lue && handleMarquerLue(notif._id)}
            >
              <span className="notif-icon">{iconType[notif.type] || '🔔'}</span>
              <div className="notif-contenu">
                <strong className="notif-titre">{notif.titre}</strong>
                <p className="notif-message">{notif.message}</p>
                <span className="notif-date">{formatDate(notif.dateCreation)}</span>
              </div>
              {!notif.lue && <span className="notif-dot" />}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPanel;
