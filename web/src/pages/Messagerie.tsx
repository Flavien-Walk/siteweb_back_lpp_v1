import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  getConversations, getMessages, envoyerMessage, marquerConversationLue,
} from '../services/messagerie';
import type { Conversation, Message } from '../services/messagerie';
import { couleurs } from '../styles/theme';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const name = conv.estGroupe
    ? conv.nomGroupe || 'Groupe'
    : `${conv.participant?.prenom || ''} ${conv.participant?.nom || ''}`;
  const avatar = conv.estGroupe ? conv.imageGroupe : conv.participant?.avatar;
  const initial = conv.estGroupe ? (conv.nomGroupe?.[0] || 'G') : (conv.participant?.prenom?.[0] || '?');

  return (
    <motion.button
      style={{
        ...styles.convItem,
        backgroundColor: isActive ? couleurs.primaireLight : 'transparent',
      }}
      whileHover={{ backgroundColor: isActive ? couleurs.primaireLight : couleurs.fondCard }}
      onClick={onClick}
    >
      <div style={styles.convAvatar}>
        {avatar ? (
          <img src={avatar} alt="" style={styles.convAvatarImg} />
        ) : (
          <span style={styles.convInitial}>{initial}</span>
        )}
        {conv.messagesNonLus > 0 && (
          <div style={styles.unreadBadge}>{conv.messagesNonLus}</div>
        )}
      </div>
      <div style={styles.convInfo}>
        <span style={styles.convName}>{name}</span>
        <span style={styles.convLastMsg}>
          {conv.dernierMessage?.contenu || 'Pas de message'}
        </span>
      </div>
      {conv.dernierMessage && (
        <span style={styles.convTime}>
          {formatDistanceToNow(new Date(conv.dernierMessage.dateCreation), { locale: fr })}
        </span>
      )}
    </motion.button>
  );
}

function MessageBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...styles.msgRow,
        justifyContent: isMine ? 'flex-end' : 'flex-start',
      }}
    >
      {!isMine && (
        <div style={styles.msgAvatarSmall}>
          {msg.expediteur.avatar ? (
            <img src={msg.expediteur.avatar} alt="" style={styles.msgAvatarImg} />
          ) : (
            <span style={styles.msgAvatarInitial}>{msg.expediteur.prenom[0]}</span>
          )}
        </div>
      )}
      <div
        style={{
          ...styles.bubble,
          backgroundColor: isMine ? couleurs.primaire : couleurs.fondCard,
          borderBottomRightRadius: isMine ? 4 : 16,
          borderBottomLeftRadius: isMine ? 16 : 4,
        }}
      >
        {!isMine && (
          <span style={styles.bubbleName}>
            {msg.expediteur.prenom}
          </span>
        )}
        <p style={{
          ...styles.bubbleText,
          color: isMine ? couleurs.blanc : couleurs.texte,
        }}>
          {msg.contenu}
        </p>
        <span style={{
          ...styles.bubbleTime,
          color: isMine ? 'rgba(255,255,255,0.6)' : couleurs.texteMuted,
        }}>
          {new Date(msg.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

export default function Messagerie() {
  const { utilisateur } = useAuth();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chargerConversations = useCallback(async () => {
    setLoading(true);
    const res = await getConversations();
    if (res.succes && res.data) {
      setConversations(res.data.conversations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    chargerConversations();
  }, [chargerConversations]);

  useEffect(() => {
    if (!activeConvId) return;
    (async () => {
      setLoadingMsgs(true);
      const res = await getMessages(activeConvId);
      if (res.succes && res.data) {
        setMessages(res.data.messages.reverse());
      }
      setLoadingMsgs(false);
      marquerConversationLue(activeConvId);
    })();
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMsg = (data: any) => {
      if (data.conversationId === activeConvId && activeConvId) {
        setMessages((prev) => [...prev, data.message]);
        marquerConversationLue(activeConvId);
      }
      chargerConversations();
    };
    socket.on('new_message', handleNewMsg);
    return () => { socket.off('new_message', handleNewMsg); };
  }, [socket, activeConvId, chargerConversations]);

  const handleSend = async () => {
    if (!newMsg.trim() || !activeConvId) return;
    const contenu = newMsg.trim();
    setNewMsg('');
    const res = await envoyerMessage(contenu, { conversationId: activeConvId });
    if (res.succes && res.data) {
      setMessages((prev) => [...prev, res.data!.message]);
      chargerConversations();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeConv = conversations.find((c) => c._id === activeConvId);
  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery) return true;
    const name = c.estGroupe ? c.nomGroupe : `${c.participant?.prenom} ${c.participant?.nom}`;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Messages</h2>
        </div>
        <div style={styles.searchBar}>
          <Search size={16} color={couleurs.texteSecondaire} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            style={styles.searchInput}
          />
        </div>
        <div style={styles.convList}>
          {loading ? (
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12, margin: '4px 0' }} />
            ))
          ) : (
            filteredConvs.map((conv) => (
              <ConversationItem
                key={conv._id}
                conv={conv}
                isActive={conv._id === activeConvId}
                onClick={() => setActiveConvId(conv._id)}
              />
            ))
          )}
          {!loading && filteredConvs.length === 0 && (
            <p style={styles.emptyConvs}>Aucune conversation</p>
          )}
        </div>
      </div>

      <div style={styles.chatPanel}>
        {activeConv ? (
          <>
            <div style={styles.chatHeader}>
              <button style={styles.mobileBackBtn} onClick={() => setActiveConvId(null)}>
                <ArrowLeft size={20} color={couleurs.texte} />
              </button>
              <div style={styles.chatHeaderInfo}>
                <span style={styles.chatHeaderName}>
                  {activeConv.estGroupe
                    ? activeConv.nomGroupe || 'Groupe'
                    : `${activeConv.participant?.prenom} ${activeConv.participant?.nom}`}
                </span>
              </div>
            </div>
            <div style={styles.messagesArea}>
              {loadingMsgs ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <div className="skeleton" style={{ height: 40, width: 200, margin: '0 auto', borderRadius: 12 }} />
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    isMine={msg.estMoi || msg.expediteur._id === utilisateur?.id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={styles.inputBar}>
              <textarea
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écris un message..."
                style={styles.msgInput}
                rows={1}
              />
              <motion.button
                style={{
                  ...styles.sendBtn,
                  opacity: newMsg.trim() ? 1 : 0.5,
                }}
                whileTap={newMsg.trim() ? { scale: 0.95 } : {}}
                onClick={handleSend}
                disabled={!newMsg.trim()}
              >
                <Send size={18} />
              </motion.button>
            </div>
          </>
        ) : (
          <div style={styles.noChat}>
            <div style={styles.noChatIcon}>💬</div>
            <p style={styles.noChatText}>Sélectionne une conversation</p>
            <p style={styles.noChatSubtext}>Choisis un contact pour démarrer</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 64px)',
    marginTop: -32,
    marginLeft: -40,
    marginRight: -40,
  },
  sidebar: {
    width: 360,
    borderRight: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: couleurs.fondElevated,
  },
  sidebarHeader: {
    padding: '20px 20px 12px',
  },
  sidebarTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: couleurs.texte,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 16px 12px',
    padding: '8px 12px',
    borderRadius: 10,
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: couleurs.texte,
    fontSize: '0.875rem',
  },
  convList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0 8px',
  },
  convItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'background-color 150ms ease',
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative' as const,
  },
  convAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  convInitial: { color: couleurs.blanc, fontWeight: '600', fontSize: '0.875rem' },
  unreadBadge: {
    position: 'absolute' as const,
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    color: couleurs.blanc,
    fontSize: '0.625rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${couleurs.fondElevated}`,
  },
  convInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  convName: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  convLastMsg: {
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  convTime: {
    fontSize: '0.6875rem',
    color: couleurs.texteMuted,
    flexShrink: 0,
  },
  emptyConvs: {
    textAlign: 'center' as const,
    padding: 32,
    color: couleurs.texteSecondaire,
    fontSize: '0.875rem',
  },
  chatPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: couleurs.fond,
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    borderBottom: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondElevated,
  },
  mobileBackBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'none',
    padding: 4,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  msgRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
  },
  msgAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  msgAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  msgAvatarInitial: { color: couleurs.blanc, fontSize: '0.6875rem', fontWeight: '600' },
  bubble: {
    maxWidth: '65%',
    padding: '10px 14px',
    borderRadius: 16,
  },
  bubbleName: {
    display: 'block',
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: couleurs.primaire,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: '0.9375rem',
    lineHeight: 1.5,
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  bubbleTime: {
    display: 'block',
    fontSize: '0.625rem',
    marginTop: 4,
    textAlign: 'right' as const,
  },
  inputBar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    padding: '12px 20px',
    borderTop: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondElevated,
  },
  msgInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 12,
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    resize: 'none' as const,
    maxHeight: 120,
    lineHeight: 1.4,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    border: 'none',
    color: couleurs.blanc,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  noChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  noChatIcon: {
    fontSize: '3rem',
    marginBottom: 8,
  },
  noChatText: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: couleurs.texte,
  },
  noChatSubtext: {
    fontSize: '0.875rem',
    color: couleurs.texteSecondaire,
  },
};