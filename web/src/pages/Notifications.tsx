import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, UserPlus, Heart, MessageCircle, CheckCheck,
  Trash2, Megaphone, AlertTriangle,
} from 'lucide-react';
import {
  getNotifications, marquerToutesLues, marquerNotificationLue,
  supprimerNotification, Notification,
} from '../services/notifications';
import { couleurs } from '../styles/theme';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function getNotifIcon(type: string) {
  switch (type) {
    case 'demande_ami':
    case 'ami_accepte':
      return <UserPlus size={18} color={couleurs.primaire} />;
    case 'nouveau_like':
    case 'like_commentaire':
      return <Heart size={18} color={couleurs.danger} />;
    case 'nouveau_message':
      return <MessageCircle size={18} color={couleurs.secondaire} />;
    case 'nouveau_commentaire':
      return <MessageCircle size={18} color={couleurs.accent} />;
    case 'broadcast':
      return <Megaphone size={18} color={couleurs.accent} />;
    case 'sanction_warn':
    case 'sanction_suspend':
    case 'sanction_ban':
      return <AlertTriangle size={18} color={couleurs.danger} />;
    default:
      return <Bell size={18} color={couleurs.texteSecondaire} />;
  }
}

function NotificationCard({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const timeAgo = formatDistanceToNow(new Date(notif.dateCreation), { addSuffix: true, locale: fr });

  const handleClick = () => {
    if (!notif.lue) onRead(notif._id);
    if (notif.data?.conversationId) navigate(`/messagerie`);
    else if (notif.data?.projetId) navigate(`/projets/${notif.data.projetId}`);
    else if (notif.data?.userId) navigate(`/utilisateur/${notif.data.userId}`);
  };

  return (
    <motion.div
      style={{
        ...styles.notifCard,
        backgroundColor: notif.lue ? couleurs.fondCard : couleurs.primaireLight,
        borderColor: notif.lue ? couleurs.bordure : 'rgba(124,92,255,0.2)',
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      whileHover={{ x: 4 }}
      onClick={handleClick}
    >
      <div style={styles.notifIcon}>
        {getNotifIcon(notif.type)}
      </div>
      <div style={styles.notifContent}>
        <span style={styles.notifTitle}>{notif.titre}</span>
        <span style={styles.notifMsg}>{notif.message}</span>
        <span style={styles.notifTime}>{timeAgo}</span>
      </div>
      <motion.button
        style={styles.deleteBtn}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif._id);
        }}
      >
        <Trash2 size={14} color={couleurs.texteMuted} />
      </motion.button>
    </motion.div>
  );
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonLues, setNonLues] = useState(0);

  const charger = useCallback(async () => {
    setLoading(true);
    const res = await getNotifications(1, 50);
    if (res.succes && res.data) {
      setNotifications(res.data.notifications);
      setNonLues(res.data.nonLues);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const handleReadAll = async () => {
    await marquerToutesLues();
    setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    setNonLues(0);
  };

  const handleRead = async (id: string) => {
    await marquerNotificationLue(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, lue: true } : n))
    );
    setNonLues((prev) => Math.max(0, prev - 1));
  };

  const handleDelete = async (id: string) => {
    await supprimerNotification(id);
    const notif = notifications.find((n) => n._id === id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (notif && !notif.lue) setNonLues((prev) => Math.max(0, prev - 1));
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Notifications</h1>
          {nonLues > 0 && (
            <p style={styles.pageSubtitle}>
              {nonLues} non lue{nonLues > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {nonLues > 0 && (
          <motion.button
            style={styles.readAllBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReadAll}
          >
            <CheckCheck size={16} /> Tout marquer comme lu
          </motion.button>
        )}
      </div>

      {loading ? (
        <div style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14, marginBottom: 8 }} />
          ))}
        </div>
      ) : (
        <div style={styles.list}>
          <AnimatePresence>
            {notifications.map((notif) => (
              <NotificationCard
                key={notif._id}
                notif={notif}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
          {notifications.length === 0 && (
            <div style={styles.empty}>
              <Bell size={48} color={couleurs.texteMuted} />
              <p style={styles.emptyText}>Aucune notification</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 680,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  pageSubtitle: {
    fontSize: '0.875rem',
    color: couleurs.primaire,
    marginTop: 4,
  },
  readAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 10,
    backgroundColor: couleurs.primaireLight,
    border: 'none',
    color: couleurs.primaire,
    fontSize: '0.8125rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  notifCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: couleurs.fondElevated,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  notifTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  notifMsg: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  notifTime: {
    fontSize: '0.6875rem',
    color: couleurs.texteMuted,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 12,
    padding: 64,
  },
  emptyText: {
    fontSize: '0.9375rem',
    color: couleurs.texteSecondaire,
  },
};