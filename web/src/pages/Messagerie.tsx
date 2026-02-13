import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Send, ArrowLeft, PenSquare, X, MoreHorizontal,
  Reply, Pencil, Trash2, Smile, Users, Plus,
  Check, CheckCheck, Volume2, VolumeX,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import {
  getConversations, getMessages, envoyerMessage, marquerConversationLue,
  getOuCreerConversationPrivee, rechercherUtilisateurs as rechercherUtilisateursMsg,
  reagirMessage, modifierMessage, supprimerMessage, creerGroupe,
  supprimerConversation, toggleMuetConversation,
} from '../services/messagerie';
import type { Conversation, Message, UtilisateurMsg, TypeReaction, Reaction } from '../services/messagerie';
import { couleurs } from '../styles/theme';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const REACTIONS: { emoji: string; type: TypeReaction }[] = [
  { emoji: '\u2764\uFE0F', type: 'heart' },
  { emoji: '\uD83D\uDE02', type: 'laugh' },
  { emoji: '\uD83D\uDE2E', type: 'wow' },
  { emoji: '\uD83D\uDE22', type: 'sad' },
  { emoji: '\uD83D\uDE20', type: 'angry' },
  { emoji: '\uD83D\uDC4D', type: 'like' },
];

const REACTION_EMOJI_MAP: Record<TypeReaction, string> = {
  heart: '\u2764\uFE0F', laugh: '\uD83D\uDE02', wow: '\uD83D\uDE2E',
  sad: '\uD83D\uDE22', angry: '\uD83D\uDE20', like: '\uD83D\uDC4D',
};

/* ─── Conversation Item ─── */
function ConversationItem({ conv, isActive, onClick }: {
  conv: Conversation; isActive: boolean; onClick: () => void;
}) {
  const name = conv.estGroupe
    ? conv.nomGroupe || 'Groupe'
    : `${conv.participant?.prenom || ''} ${conv.participant?.nom || ''}`;
  const avatar = conv.estGroupe ? conv.imageGroupe : conv.participant?.avatar;
  const initial = conv.estGroupe ? (conv.nomGroupe?.[0] || 'G') : (conv.participant?.prenom?.[0] || '?');
  const lastMsgPreview = conv.dernierMessage
    ? conv.dernierMessage.type === 'image' ? '\uD83D\uDCF7 Photo'
      : conv.dernierMessage.type === 'video' ? '\uD83C\uDFA5 Video'
      : conv.dernierMessage.contenu
    : 'Pas de message';

  return (
    <motion.button
      style={{
        ...s.convItem,
        backgroundColor: isActive ? couleurs.primaireLight : 'transparent',
      }}
      whileHover={{ backgroundColor: isActive ? couleurs.primaireLight : couleurs.fondCard }}
      onClick={onClick}
    >
      <div style={s.convAvatar}>
        {avatar ? (
          <img src={avatar} alt="" style={s.convAvatarImg} />
        ) : (
          <span style={s.convInitial}>{initial}</span>
        )}
        {conv.messagesNonLus > 0 && (
          <div style={s.unreadBadge}>{conv.messagesNonLus > 99 ? '99+' : conv.messagesNonLus}</div>
        )}
      </div>
      <div style={s.convInfo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={s.convName}>{name}</span>
          {conv.estGroupe && <Users size={12} color={couleurs.texteMuted} />}
          {conv.estMuet && <VolumeX size={12} color={couleurs.texteMuted} />}
        </div>
        <span style={{
          ...s.convLastMsg,
          fontWeight: conv.messagesNonLus > 0 ? '600' : '400',
          color: conv.messagesNonLus > 0 ? couleurs.texte : couleurs.texteSecondaire,
        }}>
          {lastMsgPreview}
        </span>
      </div>
      {conv.dernierMessage && (
        <span style={s.convTime}>
          {formatDistanceToNow(new Date(conv.dernierMessage.dateCreation), { locale: fr })}
        </span>
      )}
    </motion.button>
  );
}

/* ─── Reaction Bar ─── */
function ReactionBar({ onReact, existingReaction }: {
  onReact: (type: TypeReaction) => void; existingReaction?: TypeReaction;
}) {
  return (
    <motion.div
      style={s.reactionBar}
      initial={{ opacity: 0, scale: 0.8, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      {REACTIONS.map((r) => (
        <motion.button
          key={r.type}
          style={{
            ...s.reactionBtn,
            backgroundColor: existingReaction === r.type ? couleurs.primaireLight : 'transparent',
          }}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onReact(r.type)}
        >
          {r.emoji}
        </motion.button>
      ))}
    </motion.div>
  );
}

/* ─── Message Reactions Display ─── */
function ReactionsDisplay({ reactions, onReact }: {
  reactions: Reaction[]; onReact: (type: TypeReaction) => void;
}) {
  if (!reactions || reactions.length === 0) return null;
  const grouped: Record<string, number> = {};
  reactions.forEach((r) => { grouped[r.type] = (grouped[r.type] || 0) + 1; });

  return (
    <div style={s.reactionsRow}>
      {Object.entries(grouped).map(([type, count]) => (
        <motion.button
          key={type}
          style={s.reactionPill}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onReact(type as TypeReaction)}
        >
          {REACTION_EMOJI_MAP[type as TypeReaction]} {count > 1 && <span style={s.reactionCount}>{count}</span>}
        </motion.button>
      ))}
    </div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ msg, isMine, currentUserId, conversationId, onReply, onEdited, onDeleted }: {
  msg: Message; isMine: boolean; currentUserId: string; conversationId: string;
  onReply: (msg: Message) => void; onEdited: () => void; onDeleted: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.contenu);
  const [saving, setSaving] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const myReaction = msg.reactions?.find((r) => r.userId === currentUserId)?.type;

  const handleReact = async (type: TypeReaction) => {
    setShowReactions(false);
    setShowActions(false);
    await reagirMessage(msg._id, myReaction === type ? null : type);
    onEdited();
  };

  const handleEdit = async () => {
    if (!editText.trim() || saving) return;
    setSaving(true);
    const res = await modifierMessage(conversationId, msg._id, editText.trim());
    if (res.succes) { setEditing(false); onEdited(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    await supprimerMessage(conversationId, msg._id);
    onDeleted();
  };

  const canEdit = isMine && msg.type === 'texte' &&
    (Date.now() - new Date(msg.dateCreation).getTime()) < 15 * 60 * 1000;

  return (
    <div
      style={{ ...s.msgRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactions(false); }}
    >
      {!isMine && (
        <div style={s.msgAvatarSmall}>
          {msg.expediteur.avatar ? (
            <img src={msg.expediteur.avatar} alt="" style={s.msgAvatarImg} />
          ) : (
            <span style={s.msgAvatarInitial}>{msg.expediteur.prenom[0]}</span>
          )}
        </div>
      )}

      <div style={{ position: 'relative', maxWidth: '65%' }} ref={actionsRef}>
        {/* Action buttons on hover */}
        <AnimatePresence>
          {showActions && !editing && (
            <motion.div
              style={{ ...s.msgActions, [isMine ? 'left' : 'right']: -80, top: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button style={s.msgActionBtn} onClick={() => setShowReactions(!showReactions)} title="Reagir">
                <Smile size={14} color={couleurs.texteSecondaire} />
              </button>
              <button style={s.msgActionBtn} onClick={() => onReply(msg)} title="Repondre">
                <Reply size={14} color={couleurs.texteSecondaire} />
              </button>
              {canEdit && (
                <button style={s.msgActionBtn} onClick={() => { setEditing(true); setEditText(msg.contenu); }} title="Modifier">
                  <Pencil size={14} color={couleurs.texteSecondaire} />
                </button>
              )}
              {isMine && (
                <button style={s.msgActionBtn} onClick={handleDelete} title="Supprimer">
                  <Trash2 size={14} color={couleurs.danger} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactions && (
            <div style={{ position: 'absolute', [isMine ? 'right' : 'left']: 0, top: -44, zIndex: 50 }}>
              <ReactionBar onReact={handleReact} existingReaction={myReaction} />
            </div>
          )}
        </AnimatePresence>

        {/* Reply quote */}
        {msg.replyTo && (
          <div style={{
            ...s.replyQuote,
            borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            backgroundColor: isMine ? 'rgba(124,92,255,0.3)' : 'rgba(42,42,54,0.6)',
          }}>
            <span style={s.replyQuoteName}>{msg.replyTo.expediteur.prenom}</span>
            <span style={s.replyQuoteText}>
              {msg.replyTo.type === 'image' ? '\uD83D\uDCF7 Photo' : msg.replyTo.contenu}
            </span>
          </div>
        )}

        {/* Bubble */}
        <div style={{
          ...s.bubble,
          backgroundColor: isMine ? couleurs.primaire : couleurs.fondCard,
          borderBottomRightRadius: isMine ? 4 : 16,
          borderBottomLeftRadius: isMine ? 16 : 4,
          borderTopLeftRadius: msg.replyTo ? (isMine ? 16 : 4) : 16,
          borderTopRightRadius: msg.replyTo ? (isMine ? 4 : 16) : 16,
        }}>
          {!isMine && (
            <span style={s.bubbleName}>{msg.expediteur.prenom}</span>
          )}

          {/* Media */}
          {(msg.type === 'image' || msg.type === 'video') && msg.contenu && (
            <div style={s.mediaBubble}>
              {msg.type === 'image' ? (
                <img src={msg.contenu} alt="" style={s.mediaImg} />
              ) : (
                <video src={msg.contenu} controls style={s.mediaImg} />
              )}
            </div>
          )}

          {/* Text content */}
          {editing ? (
            <div style={{ padding: '4px 0' }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={s.editInput}
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button style={s.editCancel} onClick={() => setEditing(false)}>Annuler</button>
                <button style={s.editSave} onClick={handleEdit} disabled={!editText.trim() || saving}>
                  {saving ? '...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ) : (
            msg.type === 'texte' && (
              <p style={{ ...s.bubbleText, color: isMine ? couleurs.blanc : couleurs.texte }}>
                {msg.contenu}
              </p>
            )
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            {msg.modifie && (
              <span style={{ fontSize: '0.5625rem', color: isMine ? 'rgba(255,255,255,0.5)' : couleurs.texteMuted, fontStyle: 'italic' }}>
                modifie
              </span>
            )}
            <span style={{ ...s.bubbleTime, color: isMine ? 'rgba(255,255,255,0.6)' : couleurs.texteMuted }}>
              {new Date(msg.dateCreation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMine && (
              msg.estLu
                ? <CheckCheck size={12} color={isMine ? 'rgba(255,255,255,0.7)' : couleurs.primaire} />
                : <Check size={12} color={isMine ? 'rgba(255,255,255,0.5)' : couleurs.texteMuted} />
            )}
          </div>
        </div>

        {/* Reactions display */}
        {msg.reactions && msg.reactions.length > 0 && (
          <ReactionsDisplay reactions={msg.reactions} onReact={handleReact} />
        )}
      </div>
    </div>
  );
}

/* ─── Typing Indicator ─── */
function TypingIndicator({ users }: { users: string[] }) {
  if (users.length === 0) return null;
  const text = users.length === 1
    ? `${users[0]} est en train d'ecrire...`
    : `${users.slice(0, 2).join(', ')} ecrivent...`;

  return (
    <motion.div
      style={s.typingIndicator}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div style={s.typingDots}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={s.typingDot}
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
          />
        ))}
      </div>
      <span style={s.typingText}>{text}</span>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function Messagerie() {
  const { utilisateur } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConv, setShowNewConv] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UtilisateurMsg[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<UtilisateurMsg[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chargerConversations = useCallback(async () => {
    setLoading(true);
    const res = await getConversations();
    if (res.succes && res.data) setConversations(res.data.conversations);
    setLoading(false);
  }, []);

  const chargerMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    const res = await getMessages(convId);
    if (res.succes && res.data) setMessages(res.data.messages.reverse());
    setLoadingMsgs(false);
    marquerConversationLue(convId);
  }, []);

  const convParamHandled = useRef(false);

  useEffect(() => { chargerConversations(); }, [chargerConversations]);

  useEffect(() => {
    if (convParamHandled.current) return;
    const convParam = searchParams.get('conv');
    if (convParam) {
      convParamHandled.current = true;
      setActiveConvId(convParam);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeConvId) return;
    chargerMessages(activeConvId);
    setReplyingTo(null);
    setTypingUsers([]);
    if (socket) {
      socket.emit('join_conversation', activeConvId);
      return () => { socket.emit('leave_conversation', activeConvId); };
    }
  }, [activeConvId, chargerMessages, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const handleNewMsg = (data: any) => {
      if (data.conversationId === activeConvId) {
        setMessages((prev) => [...prev, data.message]);
        marquerConversationLue(activeConvId!);
        setTypingUsers((prev) => prev.filter((n) => n !== data.message?.expediteur?.prenom));
      }
      chargerConversations();
    };
    const handleTyping = (data: any) => {
      if (data.conversationId === activeConvId && data.userId !== utilisateur?.id) {
        setTypingUsers((prev) => prev.includes(data.prenom) ? prev : [...prev, data.prenom]);
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== data.prenom));
        }, 3000);
      }
    };
    const handleMsgEdited = (data: any) => {
      if (data.conversationId === activeConvId) {
        setMessages((prev) => prev.map((m) => m._id === data.messageId ? { ...m, contenu: data.contenu, modifie: true } : m));
      }
    };
    const handleMsgDeleted = (data: any) => {
      if (data.conversationId === activeConvId) {
        setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
      }
    };

    socket.on('new_message', handleNewMsg);
    socket.on('typing', handleTyping);
    socket.on('messageEdited', handleMsgEdited);
    socket.on('messageDeleted', handleMsgDeleted);
    return () => {
      socket.off('new_message', handleNewMsg);
      socket.off('typing', handleTyping);
      socket.off('messageEdited', handleMsgEdited);
      socket.off('messageDeleted', handleMsgDeleted);
    };
  }, [socket, activeConvId, chargerConversations, utilisateur?.id]);

  // Typing emission
  const emitTyping = useCallback(() => {
    if (!socket || !activeConvId) return;
    socket.emit('typing', { conversationId: activeConvId });
  }, [socket, activeConvId]);

  // User search
  useEffect(() => {
    if (!userSearch.trim()) { setUserResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      const res = await rechercherUtilisateursMsg(userSearch.trim());
      if (res.succes && res.data) setUserResults(res.data.utilisateurs);
      setSearchingUsers(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const handleStartConversation = async (userId: string) => {
    const res = await getOuCreerConversationPrivee(userId);
    if (res.succes && res.data) {
      setShowNewConv(false);
      setUserSearch('');
      setUserResults([]);
      await chargerConversations();
      setActiveConvId(res.data.conversation._id);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupUsers.length < 1) return;
    const res = await creerGroupe(groupName.trim(), selectedGroupUsers.map((u) => u._id));
    if (res.succes && res.data) {
      setShowGroupModal(false);
      setGroupName('');
      setSelectedGroupUsers([]);
      setUserSearch('');
      await chargerConversations();
      setActiveConvId(res.data.conversation._id);
    }
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activeConvId) return;
    const contenu = newMsg.trim();
    setNewMsg('');
    setReplyingTo(null);
    const res = await envoyerMessage(contenu, {
      conversationId: activeConvId,
      replyTo: replyingTo?._id,
    });
    if (res.succes && res.data) {
      setMessages((prev) => [...prev, res.data!.message]);
      chargerConversations();
    }
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMsg(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    // Typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping();
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
  };

  const handleReply = (msg: Message) => {
    setReplyingTo(msg);
    inputRef.current?.focus();
  };

  const handleMute = async () => {
    if (!activeConvId) return;
    await toggleMuetConversation(activeConvId);
    chargerConversations();
    setShowConvMenu(false);
  };

  const handleDeleteConv = async () => {
    if (!activeConvId) return;
    await supprimerConversation(activeConvId);
    setActiveConvId(null);
    setMessages([]);
    chargerConversations();
    setShowConvMenu(false);
  };

  const activeConv = conversations.find((c) => c._id === activeConvId);
  const filteredConvs = conversations.filter((c) => {
    if (!searchQuery) return true;
    const name = c.estGroupe ? c.nomGroupe : `${c.participant?.prenom} ${c.participant?.nom}`;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div style={s.container}>
      {/* ─── Sidebar ─── */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <h2 style={s.sidebarTitle}>Messages</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <motion.button style={s.newConvBtn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowGroupModal(true)} title="Creer un groupe">
              <Users size={16} />
            </motion.button>
            <motion.button style={s.newConvBtn} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowNewConv(true)} title="Nouvelle conversation">
              <PenSquare size={16} />
            </motion.button>
          </div>
        </div>
        <div style={s.searchBar}>
          <Search size={16} color={couleurs.texteSecondaire} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une conversation..." style={s.searchInput} />
          {searchQuery && (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              onClick={() => setSearchQuery('')}>
              <X size={14} color={couleurs.texteMuted} />
            </button>
          )}
        </div>
        <div style={s.convList}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ ...s.skeleton, height: 68, margin: '4px 0' }} />
            ))
          ) : filteredConvs.length > 0 ? (
            filteredConvs.map((conv) => (
              <ConversationItem key={conv._id} conv={conv} isActive={conv._id === activeConvId}
                onClick={() => setActiveConvId(conv._id)} />
            ))
          ) : (
            <div style={s.emptyConvs}>
              <p style={{ color: couleurs.texteSecondaire, fontSize: '0.875rem' }}>
                {searchQuery ? 'Aucun resultat' : 'Aucune conversation'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Chat Panel ─── */}
      <div style={s.chatPanel}>
        {activeConv ? (
          <>
            {/* Header */}
            <div style={s.chatHeader}>
              <button style={s.mobileBackBtn} onClick={() => setActiveConvId(null)}>
                <ArrowLeft size={20} color={couleurs.texte} />
              </button>
              <div
                style={{ ...s.chatHeaderAvatar, cursor: !activeConv.estGroupe ? 'pointer' : 'default' }}
                onClick={() => {
                  if (!activeConv.estGroupe && activeConv.participant?._id) {
                    navigate(`/utilisateur/${activeConv.participant._id}`);
                  }
                }}
              >
                {(activeConv.estGroupe ? activeConv.imageGroupe : activeConv.participant?.avatar) ? (
                  <img src={activeConv.estGroupe ? activeConv.imageGroupe : activeConv.participant?.avatar}
                    alt="" style={s.chatHeaderAvatarImg} />
                ) : (
                  <span style={s.chatHeaderAvatarInitial}>
                    {activeConv.estGroupe ? (activeConv.nomGroupe?.[0] || 'G') : (activeConv.participant?.prenom?.[0] || '?')}
                  </span>
                )}
              </div>
              <div style={s.chatHeaderInfo}>
                <span style={s.chatHeaderName}>
                  {activeConv.estGroupe
                    ? activeConv.nomGroupe || 'Groupe'
                    : `${activeConv.participant?.prenom} ${activeConv.participant?.nom}`}
                </span>
                {activeConv.estGroupe && activeConv.participants && (
                  <span style={s.chatHeaderSub}>
                    {activeConv.participants.length} participants
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <motion.button style={s.headerMenuBtn} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowConvMenu(!showConvMenu)}>
                  <MoreHorizontal size={20} color={couleurs.texteSecondaire} />
                </motion.button>
                <AnimatePresence>
                  {showConvMenu && (
                    <motion.div style={s.convMenu} initial={{ opacity: 0, scale: 0.9, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <button style={s.convMenuItem} onClick={handleMute}>
                        {activeConv.estMuet ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        {activeConv.estMuet ? 'Reactiver les notifs' : 'Couper les notifs'}
                      </button>
                      <button style={{ ...s.convMenuItem, color: couleurs.danger }} onClick={handleDeleteConv}>
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages */}
            <div style={s.messagesArea} onClick={() => setShowConvMenu(false)}>
              {loadingMsgs ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: i % 2 ? 'flex-end' : 'flex-start' }}>
                      <div style={{ ...s.skeleton, width: 180 + Math.random() * 120, height: 44 }} />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div style={s.emptyMessages}>
                  <MessageBubbleIcon />
                  <p style={{ color: couleurs.texteSecondaire, fontSize: '0.875rem' }}>
                    Aucun message. Commence la conversation !
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    isMine={msg.estMoi || msg.expediteur._id === utilisateur?.id}
                    currentUserId={utilisateur?.id || ''}
                    conversationId={activeConvId!}
                    onReply={handleReply}
                    onEdited={() => chargerMessages(activeConvId!)}
                    onDeleted={() => chargerMessages(activeConvId!)}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            <AnimatePresence>
              {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
            </AnimatePresence>

            {/* Reply banner */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div style={s.replyBanner} initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                  <Reply size={14} color={couleurs.primaire} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={s.replyBannerName}>{replyingTo.expediteur.prenom}</span>
                    <span style={s.replyBannerText}>
                      {replyingTo.type === 'image' ? '\uD83D\uDCF7 Photo' : replyingTo.contenu}
                    </span>
                  </div>
                  <button style={s.replyBannerClose} onClick={() => setReplyingTo(null)}>
                    <X size={14} color={couleurs.texteSecondaire} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div style={s.inputBar}>
              <textarea
                ref={inputRef}
                value={newMsg}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ecris un message..."
                style={s.msgInput}
                rows={1}
              />
              <motion.button
                style={{ ...s.sendBtn, opacity: newMsg.trim() ? 1 : 0.4 }}
                whileHover={newMsg.trim() ? { scale: 1.05 } : {}}
                whileTap={newMsg.trim() ? { scale: 0.9 } : {}}
                onClick={handleSend}
                disabled={!newMsg.trim()}
              >
                <Send size={18} />
              </motion.button>
            </div>
          </>
        ) : (
          <div style={s.noChat}>
            <div style={s.noChatIconWrap}>
              <MessageBubbleIcon />
            </div>
            <h3 style={s.noChatText}>Vos messages</h3>
            <p style={s.noChatSubtext}>Selectionnez une conversation ou demarrez-en une nouvelle</p>
            <motion.button style={s.startConvBtn} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowNewConv(true)}>
              <PenSquare size={16} /> Nouvelle conversation
            </motion.button>
          </div>
        )}
      </div>

      {/* ─── New Conversation Modal ─── */}
      <AnimatePresence>
        {showNewConv && (
          <motion.div style={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} onClick={() => setShowNewConv(false)}>
            <motion.div style={s.modal} initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>Nouvelle conversation</h3>
                <button style={s.modalClose} onClick={() => setShowNewConv(false)}>
                  <X size={18} color={couleurs.texteSecondaire} />
                </button>
              </div>
              <div style={s.modalSearchBar}>
                <Search size={16} color={couleurs.texteSecondaire} />
                <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur..." style={s.modalSearchInput} autoFocus />
              </div>
              <div style={s.modalResults}>
                {searchingUsers ? (
                  <div style={{ ...s.skeleton, height: 48, margin: 8 }} />
                ) : userResults.length > 0 ? (
                  userResults.map((u) => (
                    <motion.button key={u._id} style={s.userResultItem}
                      whileHover={{ backgroundColor: couleurs.fondCard }}
                      onClick={() => handleStartConversation(u._id)}>
                      <div style={s.userResultAvatar}>
                        {u.avatar ? (
                          <img src={u.avatar} alt="" style={s.userResultAvatarImg} />
                        ) : (
                          <span style={s.userResultInitial}>{u.prenom[0]}</span>
                        )}
                      </div>
                      <span style={s.userResultName}>{u.prenom} {u.nom}</span>
                    </motion.button>
                  ))
                ) : userSearch.trim() ? (
                  <p style={s.noResults}>Aucun utilisateur trouve</p>
                ) : (
                  <p style={s.noResults}>Tape un nom pour rechercher</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Create Group Modal ─── */}
      <AnimatePresence>
        {showGroupModal && (
          <motion.div style={s.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} onClick={() => setShowGroupModal(false)}>
            <motion.div style={{ ...s.modal, maxHeight: '80vh' }}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>Creer un groupe</h3>
                <button style={s.modalClose} onClick={() => setShowGroupModal(false)}>
                  <X size={18} color={couleurs.texteSecondaire} />
                </button>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nom du groupe..." style={s.groupNameInput} />
              </div>
              {selectedGroupUsers.length > 0 && (
                <div style={s.selectedUsers}>
                  {selectedGroupUsers.map((u) => (
                    <div key={u._id} style={s.selectedUserChip}>
                      <span style={{ fontSize: '0.75rem', color: couleurs.texte }}>{u.prenom}</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => setSelectedGroupUsers((prev) => prev.filter((x) => x._id !== u._id))}>
                        <X size={12} color={couleurs.texteSecondaire} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={s.modalSearchBar}>
                <Search size={16} color={couleurs.texteSecondaire} />
                <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Ajouter des participants..." style={s.modalSearchInput} />
              </div>
              <div style={s.modalResults}>
                {userResults.filter((u) => !selectedGroupUsers.find((s) => s._id === u._id)).map((u) => (
                  <motion.button key={u._id} style={s.userResultItem}
                    whileHover={{ backgroundColor: couleurs.fondCard }}
                    onClick={() => setSelectedGroupUsers((prev) => [...prev, u])}>
                    <div style={s.userResultAvatar}>
                      {u.avatar ? (
                        <img src={u.avatar} alt="" style={s.userResultAvatarImg} />
                      ) : (
                        <span style={s.userResultInitial}>{u.prenom[0]}</span>
                      )}
                    </div>
                    <span style={s.userResultName}>{u.prenom} {u.nom}</span>
                    <Plus size={16} color={couleurs.primaire} style={{ marginLeft: 'auto' }} />
                  </motion.button>
                ))}
              </div>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${couleurs.bordure}` }}>
                <motion.button
                  style={{
                    ...s.createGroupBtn,
                    opacity: groupName.trim() && selectedGroupUsers.length > 0 ? 1 : 0.4,
                  }}
                  whileHover={groupName.trim() && selectedGroupUsers.length > 0 ? { scale: 1.02 } : {}}
                  whileTap={groupName.trim() && selectedGroupUsers.length > 0 ? { scale: 0.98 } : {}}
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || selectedGroupUsers.length === 0}
                >
                  <Users size={16} /> Creer le groupe ({selectedGroupUsers.length} membre{selectedGroupUsers.length > 1 ? 's' : ''})
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubbleIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={couleurs.texteMuted}
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/* ─── Styles ─── */
const s: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 64px)',
    marginTop: -32,
    marginLeft: -40,
    marginRight: -40,
  },
  skeleton: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 12,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  // Sidebar
  sidebar: {
    width: 360,
    borderRight: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: couleurs.fondElevated,
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: '20px 20px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarTitle: { fontSize: '1.25rem', fontWeight: '700', color: couleurs.texte },
  newConvBtn: {
    padding: 8, borderRadius: 10, backgroundColor: couleurs.primaireLight,
    border: 'none', color: couleurs.primaire, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: 8, margin: '0 16px 12px',
    padding: '10px 14px', borderRadius: 12, backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
  },
  searchInput: {
    flex: 1, background: 'none', border: 'none', color: couleurs.texte,
    fontSize: '0.875rem', outline: 'none',
  },
  convList: { flex: 1, overflowY: 'auto' as const, padding: '0 8px' },
  convItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px',
    borderRadius: 12, border: 'none', cursor: 'pointer', width: '100%',
    textAlign: 'left' as const, transition: 'background-color 150ms ease',
  },
  convAvatar: {
    width: 48, height: 48, borderRadius: '50%', backgroundColor: couleurs.primaire,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0, position: 'relative' as const,
  },
  convAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  convInitial: { color: couleurs.blanc, fontWeight: '600', fontSize: '1rem' },
  unreadBadge: {
    position: 'absolute' as const, bottom: -2, right: -2, minWidth: 18, height: 18,
    borderRadius: 9, backgroundColor: couleurs.danger, color: couleurs.blanc,
    fontSize: '0.625rem', fontWeight: '700', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '0 4px', border: `2px solid ${couleurs.fondElevated}`,
  },
  convInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  convName: {
    fontSize: '0.9375rem', fontWeight: '600', color: couleurs.texte,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  convLastMsg: {
    fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  convTime: { fontSize: '0.6875rem', color: couleurs.texteMuted, flexShrink: 0 },
  emptyConvs: { textAlign: 'center' as const, padding: 32 },

  // Chat
  chatPanel: {
    flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: couleurs.fond,
    minWidth: 0,
  },
  chatHeader: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
    borderBottom: `1px solid ${couleurs.bordure}`, backgroundColor: couleurs.fondElevated,
    flexShrink: 0,
  },
  mobileBackBtn: {
    background: 'none', border: 'none', cursor: 'pointer', display: 'none', padding: 4,
  },
  chatHeaderAvatar: {
    width: 40, height: 40, borderRadius: '50%', backgroundColor: couleurs.primaire,
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    flexShrink: 0,
  },
  chatHeaderAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  chatHeaderAvatarInitial: { color: couleurs.blanc, fontWeight: '600', fontSize: '0.875rem' },
  chatHeaderInfo: { flex: 1, minWidth: 0 },
  chatHeaderName: { fontSize: '1rem', fontWeight: '600', color: couleurs.texte, display: 'block' },
  chatHeaderSub: { fontSize: '0.75rem', color: couleurs.texteSecondaire },
  headerMenuBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8,
  },
  convMenu: {
    position: 'absolute' as const, top: '100%', right: 0, width: 220,
    backgroundColor: couleurs.fondElevated, border: `1px solid ${couleurs.bordure}`,
    borderRadius: 14, padding: 4, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 50,
  },
  convMenuItem: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
    borderRadius: 10, border: 'none', background: 'none', cursor: 'pointer',
    color: couleurs.texte, fontSize: '0.8125rem', transition: 'background 150ms',
  },

  // Messages area
  messagesArea: {
    flex: 1, overflowY: 'auto' as const, padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  emptyMessages: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12,
  },
  msgRow: { display: 'flex', gap: 8, alignItems: 'flex-end', position: 'relative' as const },
  msgAvatarSmall: {
    width: 30, height: 30, borderRadius: '50%', backgroundColor: couleurs.primaire,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  msgAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  msgAvatarInitial: { color: couleurs.blanc, fontSize: '0.6875rem', fontWeight: '600' },

  // Bubble
  bubble: {
    padding: '10px 14px', borderRadius: 16, position: 'relative' as const,
  },
  bubbleName: {
    display: 'block', fontSize: '0.6875rem', fontWeight: '600',
    color: couleurs.primaire, marginBottom: 2,
  },
  bubbleText: {
    fontSize: '0.9375rem', lineHeight: 1.5, margin: 0,
    whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const,
  },
  bubbleTime: { fontSize: '0.625rem', marginTop: 2 },

  // Media in bubble
  mediaBubble: {
    marginBottom: 6, borderRadius: 10, overflow: 'hidden', maxWidth: 300,
  },
  mediaImg: { width: '100%', maxHeight: 300, objectFit: 'cover' as const, display: 'block' },

  // Reply quote
  replyQuote: {
    padding: '6px 12px', marginBottom: 2, borderLeft: `3px solid ${couleurs.primaire}`,
  },
  replyQuoteName: {
    display: 'block', fontSize: '0.6875rem', fontWeight: '600', color: couleurs.primaire,
  },
  replyQuoteText: {
    display: 'block', fontSize: '0.75rem', color: couleurs.texteSecondaire,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200,
  },

  // Reactions
  reactionBar: {
    display: 'flex', gap: 2, padding: '4px 8px', borderRadius: 20,
    backgroundColor: couleurs.fondElevated, border: `1px solid ${couleurs.bordure}`,
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  reactionBtn: {
    padding: '4px 6px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontSize: '1.125rem', background: 'none',
  },
  reactionsRow: {
    display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' as const,
  },
  reactionPill: {
    display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px',
    borderRadius: 12, backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`, cursor: 'pointer',
    fontSize: '0.8125rem',
  },
  reactionCount: { fontSize: '0.6875rem', color: couleurs.texteSecondaire },

  // Message actions
  msgActions: {
    position: 'absolute' as const, display: 'flex', gap: 2,
    padding: '2px 4px', borderRadius: 8, backgroundColor: couleurs.fondElevated,
    border: `1px solid ${couleurs.bordure}`, boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: 10,
  },
  msgActionBtn: {
    padding: 5, borderRadius: 6, border: 'none', cursor: 'pointer',
    background: 'none', display: 'flex', alignItems: 'center',
  },

  // Edit
  editInput: {
    width: '100%', padding: '6px 10px', borderRadius: 8,
    border: `1px solid ${couleurs.bordure}`, backgroundColor: couleurs.fondInput,
    color: couleurs.texte, fontSize: '0.875rem', resize: 'none' as const, outline: 'none',
  },
  editCancel: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '0.75rem', color: couleurs.texteSecondaire, padding: '2px 0',
  },
  editSave: {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '0.75rem', fontWeight: '600', color: couleurs.primaire, padding: '2px 0',
  },

  // Typing
  typingIndicator: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 24px',
    backgroundColor: couleurs.fondElevated, borderTop: `1px solid ${couleurs.bordure}`,
  },
  typingDots: { display: 'flex', gap: 3 },
  typingDot: {
    width: 6, height: 6, borderRadius: '50%', backgroundColor: couleurs.texteSecondaire,
  },
  typingText: { fontSize: '0.75rem', color: couleurs.texteSecondaire, fontStyle: 'italic' },

  // Reply banner
  replyBanner: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px',
    backgroundColor: couleurs.fondElevated, borderTop: `1px solid ${couleurs.bordure}`,
    overflow: 'hidden',
  },
  replyBannerName: {
    display: 'block', fontSize: '0.75rem', fontWeight: '600', color: couleurs.primaire,
  },
  replyBannerText: {
    display: 'block', fontSize: '0.75rem', color: couleurs.texteSecondaire,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  replyBannerClose: {
    background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0,
  },

  // Input
  inputBar: {
    display: 'flex', alignItems: 'flex-end', gap: 10, padding: '14px 24px',
    borderTop: `1px solid ${couleurs.bordure}`, backgroundColor: couleurs.fondElevated,
    flexShrink: 0,
  },
  msgInput: {
    flex: 1, padding: '12px 16px', borderRadius: 16,
    backgroundColor: couleurs.fondInput, border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte, fontSize: '0.9375rem', resize: 'none' as const,
    minHeight: 48, maxHeight: 160, lineHeight: 1.5, outline: 'none',
    transition: 'border-color 200ms',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 16,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    border: 'none', color: couleurs.blanc, display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
    transition: 'opacity 200ms',
  },

  // No chat
  noChat: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12,
  },
  noChatIconWrap: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: couleurs.fondCard,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  noChatText: { fontSize: '1.25rem', fontWeight: '700', color: couleurs.texte, margin: 0 },
  noChatSubtext: { fontSize: '0.9375rem', color: couleurs.texteSecondaire, margin: 0 },
  startConvBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
    borderRadius: 14, background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc, fontSize: '0.9375rem', fontWeight: '600',
    border: 'none', cursor: 'pointer', marginTop: 12,
  },

  // Modals
  overlay: {
    position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: 440, maxHeight: '70vh', backgroundColor: couleurs.fondElevated,
    borderRadius: 20, border: `1px solid ${couleurs.bordure}`,
    display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: `1px solid ${couleurs.bordure}`,
  },
  modalTitle: { fontSize: '1rem', fontWeight: '600', color: couleurs.texte, margin: 0 },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
  modalSearchBar: {
    display: 'flex', alignItems: 'center', gap: 8, margin: '12px 16px',
    padding: '10px 14px', borderRadius: 12, backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
  },
  modalSearchInput: {
    flex: 1, background: 'none', border: 'none', color: couleurs.texte,
    fontSize: '0.9375rem', outline: 'none',
  },
  modalResults: { flex: 1, overflowY: 'auto' as const, padding: '0 8px 12px', maxHeight: 360 },
  userResultItem: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
    borderRadius: 12, border: 'none', cursor: 'pointer', width: '100%',
    textAlign: 'left' as const, backgroundColor: 'transparent',
    transition: 'background-color 150ms ease',
  },
  userResultAvatar: {
    width: 40, height: 40, borderRadius: '50%', backgroundColor: couleurs.primaire,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  userResultAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  userResultInitial: { color: couleurs.blanc, fontWeight: '600', fontSize: '0.875rem' },
  userResultName: { fontSize: '0.9375rem', fontWeight: '500', color: couleurs.texte },
  noResults: { textAlign: 'center' as const, padding: 24, color: couleurs.texteSecondaire, fontSize: '0.875rem' },

  // Group creation
  groupNameInput: {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    backgroundColor: couleurs.fondInput, border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte, fontSize: '0.9375rem', outline: 'none',
  },
  selectedUsers: {
    display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '0 16px 8px',
  },
  selectedUserChip: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
    borderRadius: 16, backgroundColor: couleurs.primaireLight,
    border: `1px solid ${couleurs.primaire}`,
  },
  createGroupBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', padding: '12px', borderRadius: 12,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc, fontSize: '0.875rem', fontWeight: '600',
    border: 'none', cursor: 'pointer',
  },
};
