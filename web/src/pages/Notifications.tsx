import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, UserPlus, Heart, MessageCircle, CheckCheck,
  Trash2, Megaphone, AlertTriangle, Check, X, Rocket,
  CheckCircle,
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import {
  getNotifications, marquerToutesLues, marquerNotificationLue,
  supprimerNotification,
} from '../services/notifications';
import type { Notification } from '../services/notifications';
import { accepterDemandeAmi, refuserDemandeAmi } from '../services/utilisateurs';
import { couleurs } from '../styles/theme';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function getNotifIcon(type: string) {
  switch (type) {
    case 'demande_ami':
      return <UserPlus size={18} color={couleurs.primaire} />;
    case 'ami_accepte':
      return <CheckCircle size={18} color={couleurs.succes} />;
    case 'nouveau_like':
    case 'like_commentaire':
      return <Heart size={18} color={couleurs.danger} />;
    case 'nouveau_message':
      return <MessageCircle size={18} color={couleurs.secondaire} />;
    case 'nouveau_commentaire':
      return <MessageCircle size={18} color={couleurs.accent} />;
    case 'broadcast':
      return <Megaphone size={18} color={couleurs.accent} />;
    case 'project_follow':
    case 'projet-update':
      return <Rocket size={18} color={couleurs.primaire} />;
    case 'sanction_warn':
    case 'sanction_suspend':
    case 'sanction_ban':
      return <AlertTriangle size={18} color={couleurs.danger} />;
    case 'sanction_unban':
    case 'sanction_unsuspend':
    case 'sanction_unwarn':
      return <CheckCircle size={18} color={couleurs.succes} />;
    default:
      return <Bell size={18} color={couleurs.texteSecondaire} />;
  }
}

function NotificationCard({
  notif,
  onRead,
  onDelete,
  onFriendAction,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onFriendAction: (notifId: string, userId: string, accept: boolean) => void;
}) {
  const navigate = useNavigate();
  const timeAgo = formatDistanceToNow(new Date(notif.dateCreation), { addSuffix: true, locale: fr });

  const handleClick = () => {
    if (!notif.lue) onRead(notif._id);
    // Navigate based on notification data
    if (notif.data?.publicationId) {
      navigate('/feed');
    } else if (notif.data?.conversationId) {
      navigate(`/messagerie?conv=${notif.data.conversationId}`);
    } else if (notif.data?.projetId) {
      navigate(`/projets/${notif.data.projetId}`);
    } else if (notif.data?.userId) {
      navigate(`/utilisateur/${notif.data.userId}`);
    }
  };

  const isFriendRequest = notif.type === 'demande_ami' && notif.data?.userId;

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
      {notif.data?.userAvatar ? (
        <img src={notif.data.userAvatar} alt="" style={styles.notifAvatar} />
      ) : (
        <div style={styles.notifIcon}>
          {getNotifIcon(notif.type)}
        </div>
      )}
      <div style={styles.notifContent}>
        <span style={styles.notifTitle}>{notif.titre}</span>
        <span style={styles.notifMsg}>{notif.message}</span>
        <span style={styles.notifTime}>{timeAgo}</span>
        {isFriendRequest && (
          <div style={styles.friendActions} onClick={(e) => e.stopPropagation()}>
            <motion.button
              style={styles.acceptBtn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFriendAction(notif._id, notif.data!.userId!, true)}
            >
              <Check size={14} /> Accepter
            </motion.button>
            <motion.button
              style={styles.refuseBtn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onFriendAction(notif._id, notif.data!.userId!, false)}
            >
              <X size={14} /> Refuser
            </motion.button>
          </div>
        )}
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
  const { socket } = useSocket();
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

  // Real-time notification listener
  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = () => {
      charger();
    };
    socket.on('new_notification', handleNewNotif);
    socket.on('demande_ami', handleNewNotif);
    return () => {
      socket.off('new_notification', handleNewNotif);
      socket.off('demande_ami', handleNewNotif);
    };
  }, [socket, charger]);

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

  const handleFriendAction = async (notifId: string, userId: string, accept: boolean) => {
    if (accept) {
      await accepterDemandeAmi(userId);
    } else {
      await refuserDemandeAmi(userId);
    }
    // Remove the notification after action
    setNotifications((prev) => prev.filter((n) => n._id !== notifId));
    setNonLues((prev) => Math.max(0, prev - 1));
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
                onFriendAction={handleFriendAction}
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
    alignItems: 'flex-start',
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
  notifAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    objectFit: 'cover' as const,
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
  friendActions: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
  },
  acceptBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 14px',
    borderRadius: 8,
    backgroundColor: couleurs.succes,
    color: couleurs.blanc,
    fontSize: '0.75rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  refuseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 14px',
    borderRadius: 8,
    backgroundColor: 'transparent',
    color: couleurs.danger,
    fontSize: '0.75rem',
    fontWeight: '600',
    border: `1px solid ${couleurs.danger}`,
    cursor: 'pointer',
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
