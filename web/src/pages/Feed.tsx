import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Send,
  Image,
  MoreHorizontal,
  Flag,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CornerDownRight,
  Search,
  Pencil,
  EyeOff,
  AlertTriangle,
  Clock,
  Ban,
  Shield,
  Play,
  Plus,
  Film,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getPublications,
  creerPublication,
  toggleLikePublication,
  getCommentaires,
  ajouterCommentaire,
  supprimerCommentaire,
  toggleLikeCommentaire,
  supprimerPublication,
  modifierPublication,
  modifierCommentaire,
  signalerPublication,
} from '../services/publications';
import type { Publication, Commentaire, RaisonSignalement } from '../services/publications';
import { getStoriesActives, markStorySeen } from '../services/stories';
import type { StoriesGroupees, Story } from '../services/stories';
import { hidePublication, deletePublicationModo, warnUser, suspendUser, banUser } from '../services/moderation';
import StoryCreator from '../components/StoryCreator';
import { rechercherUtilisateurs } from '../services/utilisateurs';
import type { ProfilUtilisateur } from '../services/utilisateurs';
import { useToast } from '../components/Toast';
import { couleurs } from '../styles/theme';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const STAFF_ROLES = ['modo', 'modo_test', 'admin_modo', 'admin', 'super_admin'];

/* ─── Story Viewer (fullscreen overlay) ─── */
function StoryViewer({
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onAllSeen,
}: {
  groups: StoriesGroupees[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
  onAllSeen: (groupIndex: number) => void;
}) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const group = groups[groupIdx];
  const story: Story | undefined = group?.stories[storyIdx];
  const DURATION = 7000; // 7 seconds per story
  const TICK = 50;

  // Mark current story as seen
  useEffect(() => {
    if (!story) return;
    if (story.estVue) return;
    if (group.utilisateur._id === currentUserId) return;
    if (seenRef.current.has(story._id)) return;
    seenRef.current.add(story._id);
    markStorySeen(story._id).catch(() => {});
  }, [story, group, currentUserId]);

  // Progress timer
  useEffect(() => {
    setProgress(0);
    if (!story) return;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + TICK / DURATION;
        if (next >= 1) {
          // Auto advance
          goNext();
          return 0;
        }
        return next;
      });
    }, TICK);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx]);

  const goNext = useCallback(() => {
    const currentGroup = groups[groupIdx];
    if (storyIdx < currentGroup.stories.length - 1) {
      setStoryIdx((s) => s + 1);
      setProgress(0);
    } else {
      // All stories in group viewed
      onAllSeen(groupIdx);
      if (groupIdx < groups.length - 1) {
        setGroupIdx((g) => g + 1);
        setStoryIdx(0);
        setProgress(0);
      } else {
        onClose();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, storyIdx, groups, onClose, onAllSeen]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((s) => s - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1];
      setGroupIdx((g) => g - 1);
      setStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [groupIdx, storyIdx, groups]);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!group || !story) return null;

  const user = group.utilisateur;

  return (
    <motion.div
      style={storyViewerStyles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Progress bars */}
      <div style={storyViewerStyles.progressContainer}>
        {group.stories.map((_, i) => (
          <div key={i} style={storyViewerStyles.progressTrack}>
            <div
              style={{
                ...storyViewerStyles.progressFill,
                width:
                  i < storyIdx
                    ? '100%'
                    : i === storyIdx
                    ? `${progress * 100}%`
                    : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={storyViewerStyles.header}>
        <div style={storyViewerStyles.headerUser}>
          {user.avatar ? (
            <img src={user.avatar} alt="" style={storyViewerStyles.headerAvatar} />
          ) : (
            <div style={storyViewerStyles.headerAvatarPlaceholder}>
              {user.prenom[0]}
            </div>
          )}
          <span style={storyViewerStyles.headerName}>
            {user.prenom} {user.nom}
          </span>
        </div>
        <button style={storyViewerStyles.closeBtn} onClick={onClose}>
          <X size={24} color={couleurs.blanc} />
        </button>
      </div>

      {/* Media */}
      <div style={storyViewerStyles.mediaContainer}>
        {story.type === 'video' ? (
          <video
            key={story._id}
            src={story.mediaUrl}
            autoPlay
            playsInline
            muted={false}
            style={storyViewerStyles.media}
          />
        ) : (
          <img
            key={story._id}
            src={story.mediaUrl}
            alt=""
            style={storyViewerStyles.media}
          />
        )}
      </div>

      {/* Click zones */}
      <div
        style={storyViewerStyles.clickZoneLeft}
        onClick={(e) => {
          e.stopPropagation();
          goPrev();
        }}
      />
      <div
        style={storyViewerStyles.clickZoneRight}
        onClick={(e) => {
          e.stopPropagation();
          goNext();
        }}
      />
    </motion.div>
  );
}

const storyViewerStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    display: 'flex',
    gap: 4,
    zIndex: 2010,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: couleurs.blanc,
    borderRadius: 2,
    transition: 'width 50ms linear',
  },
  header: {
    position: 'absolute',
    top: 24,
    left: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2010,
  },
  headerUser: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    objectFit: 'cover' as const,
    border: '2px solid rgba(255,255,255,0.6)',
  },
  headerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: couleurs.blanc,
    fontWeight: '600',
    fontSize: '0.875rem',
    border: '2px solid rgba(255,255,255,0.6)',
  },
  headerName: {
    color: couleurs.blanc,
    fontWeight: '600',
    fontSize: '0.9375rem',
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  mediaContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  media: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain' as const,
  },
  clickZoneLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    cursor: 'pointer',
    zIndex: 2005,
  },
  clickZoneRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '50%',
    height: '100%',
    cursor: 'pointer',
    zIndex: 2005,
  },
};

/* ─── Stories row ─── */
function StoryRing({ group, onClick }: { group: StoriesGroupees; onClick: () => void }) {
  const u = group.utilisateur;
  const allSeen = group.toutesVues;
  return (
    <motion.button
      style={styles.storyBtn}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div style={{ ...styles.storyRing, borderColor: allSeen ? couleurs.bordure : couleurs.primaire }}>
        {u.avatar ? (
          <img src={u.avatar} alt="" style={styles.storyAvatar} />
        ) : (
          <div style={styles.storyAvatarPlaceholder}>{u.prenom[0]}</div>
        )}
      </div>
      <span style={styles.storyName}>{u.prenom}</span>
    </motion.button>
  );
}

/* ─── Single comment row ─── */
function CommentRow({
  comment,
  publicationId,
  currentUserId,
  onReply,
  onDeleted,
  onNavigate,
  isReply,
}: {
  comment: Commentaire;
  publicationId: string;
  currentUserId: string;
  onReply: (id: string, nom: string) => void;
  onDeleted: () => void;
  onNavigate: (id: string) => void;
  isReply?: boolean;
}) {
  const [liked, setLiked] = useState(comment.aLike);
  const [likes, setLikes] = useState(comment.nbLikes);
  const [showReplies, setShowReplies] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.contenu);
  const [savingEdit, setSavingEdit] = useState(false);

  const handleLike = async () => {
    setLiked((p) => !p);
    setLikes((p) => (liked ? p - 1 : p + 1));
    const res = await toggleLikeCommentaire(publicationId, comment._id);
    if (res.succes && res.data) {
      setLiked(res.data.aLike);
      setLikes(res.data.nbLikes);
    }
  };

  const handleDelete = async () => {
    await supprimerCommentaire(publicationId, comment._id);
    onDeleted();
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || savingEdit) return;
    setSavingEdit(true);
    const res = await modifierCommentaire(publicationId, comment._id, editText.trim());
    if (res.succes) {
      setEditing(false);
      onDeleted(); // triggers charger() to refresh
    }
    setSavingEdit(false);
  };

  const auteur = comment.auteur;
  const timeAgo = formatDistanceToNow(new Date(comment.dateCreation), { addSuffix: false, locale: fr });
  const isMine = auteur._id === currentUserId;
  const replies = comment.reponses || [];

  return (
    <div style={{ marginLeft: isReply ? 52 : 0, marginBottom: 20 }}>
      <div style={styles.commentRow}>
        <button style={styles.commentAvatarBtn} onClick={() => onNavigate(auteur._id)}>
          {auteur.avatar ? (
            <img src={auteur.avatar} alt="" style={styles.commentAvatarImg} />
          ) : (
            <div style={styles.commentAvatarPlaceholder}>{auteur.prenom[0]}</div>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.commentBubble}>
            <button
              style={styles.commentAuthorBtn}
              onClick={() => onNavigate(auteur._id)}
            >
              {auteur.prenom} {auteur.nom}
            </button>
            {editing ? (
              <div>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: `1px solid ${couleurs.bordure}`,
                    backgroundColor: couleurs.fondInput,
                    color: couleurs.texte,
                    fontSize: '0.875rem',
                    marginTop: 4,
                  }}
                  maxLength={500}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') { setEditing(false); setEditText(comment.contenu); }
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: couleurs.texteSecondaire,
                      padding: '2px 0',
                    }}
                    onClick={() => { setEditing(false); setEditText(comment.contenu); }}
                  >
                    Annuler
                  </button>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: couleurs.primaire,
                      padding: '2px 0',
                      opacity: editText.trim() && !savingEdit ? 1 : 0.5,
                    }}
                    onClick={handleSaveEdit}
                    disabled={!editText.trim() || savingEdit}
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            ) : (
              <p style={styles.commentText}>{comment.contenu}</p>
            )}
          </div>
          <div style={styles.commentMeta}>
            <span style={styles.commentTime}>
              {timeAgo}
              {comment.modifie && (
                <span style={{ color: couleurs.texteMuted, marginLeft: 4, fontStyle: 'italic' }}>
                  (modifie)
                </span>
              )}
            </span>
            <button style={styles.commentMetaBtn} onClick={handleLike}>
              <Heart
                size={12}
                color={liked ? couleurs.danger : couleurs.texteSecondaire}
                fill={liked ? couleurs.danger : 'none'}
              />
              {likes > 0 && (
                <span style={{ color: liked ? couleurs.danger : couleurs.texteSecondaire }}>
                  {likes}
                </span>
              )}
            </button>
            <button
              style={styles.commentMetaBtn}
              onClick={() => onReply(comment._id, `${auteur.prenom} ${auteur.nom}`)}
            >
              Repondre
            </button>
            {isMine && !editing && (
              <>
                <button
                  style={styles.commentMetaBtn}
                  onClick={() => { setEditing(true); setEditText(comment.contenu); }}
                >
                  <Pencil size={12} color={couleurs.texteSecondaire} />
                </button>
                <button style={styles.commentMetaBtn} onClick={handleDelete}>
                  <Trash2 size={12} color={couleurs.texteSecondaire} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && !isReply && (
        <>
          {!showReplies ? (
            <button style={styles.showRepliesBtn} onClick={() => setShowReplies(true)}>
              <ChevronDown size={14} />
              Voir {replies.length} reponse{replies.length > 1 ? 's' : ''}
            </button>
          ) : (
            replies.map((r) => (
              <CommentRow
                key={r._id}
                comment={r}
                publicationId={publicationId}
                currentUserId={currentUserId}
                onReply={onReply}
                onDeleted={onDeleted}
                onNavigate={onNavigate}
                isReply
              />
            ))
          )}
        </>
      )}
    </div>
  );
}

/* ─── Comments panel (sheet-style overlay) ─── */
function CommentsPanel({
  publicationId,
  currentUserId,
  onClose,
  onNavigate,
  onCountUpdate,
}: {
  publicationId: string;
  currentUserId: string;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onCountUpdate: (count: number) => void;
}) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nom: string } | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charger = useCallback(async () => {
    setLoading(true);
    const res = await getCommentaires(publicationId, 1, 50);
    if (res.succes && res.data) {
      setCommentaires(res.data.commentaires);
      const count = res.data.pagination?.total ?? res.data.commentaires.length;
      setTotalCount(count);
      onCountUpdate(count);
    }
    setLoading(false);
  }, [publicationId, onCountUpdate]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Silent auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getCommentaires(publicationId, 1, 50);
      if (res.succes && res.data) {
        setCommentaires(res.data.commentaires);
        const count = res.data.pagination?.total ?? res.data.commentaires.length;
        setTotalCount(count);
        onCountUpdate(count);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [publicationId, onCountUpdate]);

  const handleSend = async () => {
    if (!newComment.trim() || sending) return;
    setSending(true);
    const res = await ajouterCommentaire(publicationId, newComment.trim(), replyingTo?.id);
    if (res.succes) {
      setNewComment('');
      setReplyingTo(null);
      await charger();
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  const handleReply = (id: string, nom: string) => {
    setReplyingTo({ id, nom });
    textareaRef.current?.focus();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <motion.div
        style={styles.commentsSheet}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.sheetHeader}>
          <div style={styles.sheetHandle} />
          <span style={styles.sheetTitle}>
            Commentaires{totalCount > 0 ? ` (${totalCount})` : ''}
          </span>
          <button style={styles.sheetClose} onClick={onClose}>
            <X size={20} color={couleurs.texte} />
          </button>
        </div>

        {/* Comments list */}
        <div style={styles.commentsList}>
          {loading ? (
            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column' as const, gap: 20 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: couleurs.fondInput, flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: 100, height: 12, borderRadius: 6, backgroundColor: couleurs.fondInput, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    <div style={{ width: '80%', height: 36, borderRadius: 12, backgroundColor: couleurs.fondInput, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : commentaires.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12 }}>
              <MessageCircle size={48} color={couleurs.texteMuted} strokeWidth={1} />
              <span style={{ color: couleurs.texteSecondaire, fontSize: '1rem', fontWeight: '500' }}>
                Aucun commentaire
              </span>
              <span style={{ color: couleurs.texteMuted, fontSize: '0.875rem' }}>
                Sois le premier a reagir !
              </span>
            </div>
          ) : (
            commentaires.map((c) => (
              <CommentRow
                key={c._id}
                comment={c}
                publicationId={publicationId}
                currentUserId={currentUserId}
                onReply={handleReply}
                onDeleted={charger}
                onNavigate={(id) => { onClose(); onNavigate(id); }}
              />
            ))
          )}
        </div>

        {/* Reply banner */}
        {replyingTo && (
          <div style={styles.replyBanner}>
            <CornerDownRight size={14} color={couleurs.primaire} />
            <span style={styles.replyBannerText}>Reponse a {replyingTo.nom}</span>
            <button style={styles.replyBannerClose} onClick={() => setReplyingTo(null)}>
              <X size={14} color={couleurs.texteSecondaire} />
            </button>
          </div>
        )}

        {/* Input */}
        <div style={styles.commentInput}>
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => { setNewComment(e.target.value); autoResize(); }}
            onKeyDown={handleKeyDown}
            placeholder="Ajouter un commentaire..."
            style={styles.commentInputField}
            maxLength={500}
            rows={1}
          />
          <motion.button
            style={{
              ...styles.commentSendBtn,
              opacity: newComment.trim() && !sending ? 1 : 0.4,
            }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!newComment.trim() || sending}
          >
            <Send size={18} color={couleurs.blanc} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Post Menu (context menu for publications) ─── */
function PostMenu({
  pub,
  currentUserId,
  currentUserRole,
  onClose,
  onEdit,
  onDeleted,
}: {
  pub: Publication;
  currentUserId: string;
  currentUserRole: string;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [subMenu, setSubMenu] = useState<'none' | 'signaler' | 'masquer' | 'avertir' | 'suspendre' | 'bannir' | 'supprimer_modo' | 'supprimer_own'>('none');
  const [reason, setReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(24);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  const isMine = pub.auteur._id === currentUserId;
  const isStaff = STAFF_ROLES.includes(currentUserRole);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => { setFeedback(''); onClose(); }, 1500);
  };

  const handleSignaler = async (raison: RaisonSignalement) => {
    setProcessing(true);
    const res = await signalerPublication(pub._id, raison);
    setProcessing(false);
    if (res.succes) {
      showFeedback('Signalement envoye');
    }
  };

  const handleDeleteOwn = async () => {
    setProcessing(true);
    const res = await supprimerPublication(pub._id);
    setProcessing(false);
    if (res.succes) {
      onDeleted();
      onClose();
    }
  };

  const handleMasquer = async () => {
    if (!reason.trim()) return;
    setProcessing(true);
    const res = await hidePublication(pub._id, reason.trim());
    setProcessing(false);
    if (res.succes) {
      showFeedback('Contenu masque');
    }
  };

  const handleDeleteModo = async () => {
    setProcessing(true);
    const res = await deletePublicationModo(pub._id);
    setProcessing(false);
    if (res.succes) {
      onDeleted();
      onClose();
    }
  };

  const handleAvertir = async () => {
    if (!reason.trim()) return;
    setProcessing(true);
    const res = await warnUser(pub.auteur._id, reason.trim(), pub._id);
    setProcessing(false);
    if (res.succes) {
      showFeedback('Avertissement envoye');
    }
  };

  const handleSuspendre = async () => {
    if (!reason.trim()) return;
    setProcessing(true);
    const res = await suspendUser(pub.auteur._id, reason.trim(), suspendDuration, pub._id);
    setProcessing(false);
    if (res.succes) {
      showFeedback('Utilisateur suspendu');
    }
  };

  const handleBannir = async () => {
    if (!reason.trim()) return;
    setProcessing(true);
    const res = await banUser(pub.auteur._id, reason.trim(), pub._id);
    setProcessing(false);
    if (res.succes) {
      showFeedback('Utilisateur banni');
    }
  };

  // Feedback display
  if (feedback) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{ ...menuStyles.menuContainer, padding: '16px 20px', textAlign: 'center' }}
      >
        <span style={{ color: couleurs.succes, fontSize: '0.875rem', fontWeight: '600' }}>
          {feedback}
        </span>
      </motion.div>
    );
  }

  // Reason prompt sub-menus
  if (subMenu === 'masquer' || subMenu === 'avertir' || subMenu === 'bannir') {
    const label = subMenu === 'masquer' ? 'Raison du masquage' : subMenu === 'avertir' ? 'Raison de l\'avertissement' : 'Raison du bannissement';
    const action = subMenu === 'masquer' ? handleMasquer : subMenu === 'avertir' ? handleAvertir : handleBannir;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={menuStyles.menuContainer}
      >
        <div style={menuStyles.promptHeader}>{label}</div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Saisissez la raison..."
          style={menuStyles.promptTextarea}
          rows={3}
          autoFocus
        />
        <div style={menuStyles.promptActions}>
          <button style={menuStyles.promptCancel} onClick={() => { setSubMenu('none'); setReason(''); }}>
            Annuler
          </button>
          <button
            style={{ ...menuStyles.promptConfirm, opacity: reason.trim() && !processing ? 1 : 0.5 }}
            onClick={action}
            disabled={!reason.trim() || processing}
          >
            Confirmer
          </button>
        </div>
      </motion.div>
    );
  }

  if (subMenu === 'suspendre') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={menuStyles.menuContainer}
      >
        <div style={menuStyles.promptHeader}>Suspendre l'auteur</div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Raison de la suspension..."
          style={menuStyles.promptTextarea}
          rows={3}
          autoFocus
        />
        <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6 }}>
          {[
            { label: '24h', hours: 24 },
            { label: '7j', hours: 168 },
            { label: '30j', hours: 720 },
          ].map((opt) => (
            <button
              key={opt.hours}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: 8,
                border: `1px solid ${suspendDuration === opt.hours ? couleurs.primaire : couleurs.bordure}`,
                backgroundColor: suspendDuration === opt.hours ? couleurs.primaireLight : 'transparent',
                color: suspendDuration === opt.hours ? couleurs.primaire : couleurs.texteSecondaire,
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onClick={() => setSuspendDuration(opt.hours)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={menuStyles.promptActions}>
          <button style={menuStyles.promptCancel} onClick={() => { setSubMenu('none'); setReason(''); }}>
            Annuler
          </button>
          <button
            style={{ ...menuStyles.promptConfirm, opacity: reason.trim() && !processing ? 1 : 0.5 }}
            onClick={handleSuspendre}
            disabled={!reason.trim() || processing}
          >
            Suspendre
          </button>
        </div>
      </motion.div>
    );
  }

  if (subMenu === 'supprimer_own') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={menuStyles.menuContainer}
      >
        <div style={{ ...menuStyles.promptHeader, color: couleurs.danger }}>
          Supprimer cette publication ?
        </div>
        <p style={{ padding: '0 12px 12px', fontSize: '0.8125rem', color: couleurs.texteSecondaire, margin: 0 }}>
          Cette action est irreversible.
        </p>
        <div style={menuStyles.promptActions}>
          <button style={menuStyles.promptCancel} onClick={() => setSubMenu('none')}>
            Annuler
          </button>
          <button
            style={{ ...menuStyles.promptConfirm, backgroundColor: couleurs.danger, opacity: processing ? 0.5 : 1 }}
            onClick={handleDeleteOwn}
            disabled={processing}
          >
            Supprimer
          </button>
        </div>
      </motion.div>
    );
  }

  if (subMenu === 'supprimer_modo') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={menuStyles.menuContainer}
      >
        <div style={{ ...menuStyles.promptHeader, color: couleurs.danger }}>
          Supprimer definitivement ?
        </div>
        <p style={{ padding: '0 12px 12px', fontSize: '0.8125rem', color: couleurs.texteSecondaire, margin: 0 }}>
          Action de moderation irreversible.
        </p>
        <div style={menuStyles.promptActions}>
          <button style={menuStyles.promptCancel} onClick={() => setSubMenu('none')}>
            Annuler
          </button>
          <button
            style={{ ...menuStyles.promptConfirm, backgroundColor: couleurs.danger, opacity: processing ? 0.5 : 1 }}
            onClick={handleDeleteModo}
            disabled={processing}
          >
            Supprimer
          </button>
        </div>
      </motion.div>
    );
  }

  if (subMenu === 'signaler') {
    const reasons: { label: string; value: RaisonSignalement }[] = [
      { label: 'Spam', value: 'spam' },
      { label: 'Harcelement', value: 'harcelement' },
      { label: 'Contenu inapproprie', value: 'contenu_inapproprie' },
      { label: 'Fausse information', value: 'fausse_info' },
      { label: 'Autre', value: 'autre' },
    ];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={menuStyles.menuContainer}
      >
        <div style={menuStyles.promptHeader}>Signaler pour...</div>
        {reasons.map((r) => (
          <button
            key={r.value}
            style={menuStyles.menuItem}
            onClick={() => handleSignaler(r.value)}
            disabled={processing}
          >
            {r.label}
          </button>
        ))}
        <button
          style={{ ...menuStyles.menuItem, color: couleurs.texteSecondaire }}
          onClick={() => setSubMenu('none')}
        >
          Retour
        </button>
      </motion.div>
    );
  }

  // Main menu
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      style={menuStyles.menuContainer}
    >
      {/* Staff moderation section */}
      {isStaff && !isMine && (
        <>
          <div style={menuStyles.modBadge}>
            <Shield size={12} color={couleurs.primaire} />
            <span>MODERATION</span>
          </div>
          <button style={menuStyles.menuItem} onClick={() => setSubMenu('masquer')}>
            <EyeOff size={14} /> Masquer le contenu
          </button>
          <button style={{ ...menuStyles.menuItem, color: couleurs.danger }} onClick={() => setSubMenu('supprimer_modo')}>
            <Trash2 size={14} /> Supprimer definitivement
          </button>
          <button style={menuStyles.menuItem} onClick={() => setSubMenu('avertir')}>
            <AlertTriangle size={14} /> Avertir l'auteur
          </button>
          <button style={menuStyles.menuItem} onClick={() => setSubMenu('suspendre')}>
            <Clock size={14} /> Suspendre l'auteur
          </button>
          <button style={{ ...menuStyles.menuItem, color: couleurs.danger }} onClick={() => setSubMenu('bannir')}>
            <Ban size={14} /> Bannir l'auteur
          </button>
          <div style={{ height: 1, backgroundColor: couleurs.bordure, margin: '4px 8px' }} />
        </>
      )}

      {/* Own post options */}
      {isMine && (
        <>
          <button style={menuStyles.menuItem} onClick={() => { onClose(); onEdit(); }}>
            <Pencil size={14} /> Modifier
          </button>
          <button style={{ ...menuStyles.menuItem, color: couleurs.danger }} onClick={() => setSubMenu('supprimer_own')}>
            <Trash2 size={14} /> Supprimer
          </button>
        </>
      )}

      {/* Other's post options */}
      {!isMine && (
        <button style={menuStyles.menuItem} onClick={() => setSubMenu('signaler')}>
          <Flag size={14} /> Signaler
        </button>
      )}
    </motion.div>
  );
}

const menuStyles: Record<string, React.CSSProperties> = {
  menuContainer: {
    position: 'absolute',
    right: 0,
    top: '100%',
    backgroundColor: couleurs.fondElevated,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 12,
    padding: 4,
    minWidth: 220,
    zIndex: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'none',
    border: 'none',
    color: couleurs.texte,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
  },
  modBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: '0.6875rem',
    fontWeight: '700',
    color: couleurs.primaire,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  promptHeader: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: couleurs.texte,
    padding: '10px 12px 8px',
  },
  promptTextarea: {
    width: 'calc(100% - 24px)',
    margin: '0 12px 8px',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondInput,
    color: couleurs.texte,
    fontSize: '0.8125rem',
    resize: 'none' as const,
    fontFamily: 'inherit',
  },
  promptActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '4px 12px 10px',
  },
  promptCancel: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    padding: '6px 12px',
    borderRadius: 8,
  },
  promptConfirm: {
    padding: '6px 16px',
    borderRadius: 8,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '0.8125rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
};

/* ─── Media Carousel ─── */
function MediaCarousel({ medias }: { medias: { type: 'image' | 'video'; url: string }[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (medias.length === 0) return null;

  const goTo = (idx: number) => setCurrentIndex(Math.max(0, Math.min(idx, medias.length - 1)));
  const current = medias[currentIndex];

  return (
    <>
      <div style={carouselStyles.container}>
        <div style={carouselStyles.viewport}>
          {current.type === 'video' ? (
            <video
              src={current.url}
              controls
              style={carouselStyles.media}
              playsInline
              preload="metadata"
            />
          ) : (
            <img
              src={current.url}
              alt=""
              style={carouselStyles.media}
              onClick={() => setLightboxOpen(true)}
            />
          )}
        </div>

        {medias.length > 1 && (
          <>
            {currentIndex > 0 && (
              <button
                style={{ ...carouselStyles.navBtn, left: 8 }}
                onClick={() => goTo(currentIndex - 1)}
              >
                <ChevronLeft size={20} color="#fff" />
              </button>
            )}
            {currentIndex < medias.length - 1 && (
              <button
                style={{ ...carouselStyles.navBtn, right: 8 }}
                onClick={() => goTo(currentIndex + 1)}
              >
                <ChevronRight size={20} color="#fff" />
              </button>
            )}
            <div style={carouselStyles.dots}>
              {medias.map((_, i) => (
                <button
                  key={i}
                  style={{
                    ...carouselStyles.dot,
                    backgroundColor: i === currentIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                    width: i === currentIndex ? 8 : 6,
                    height: i === currentIndex ? 8 : 6,
                  }}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <div style={carouselStyles.counter}>
              {currentIndex + 1}/{medias.length}
            </div>
          </>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && current.type === 'image' && (
          <motion.div
            style={carouselStyles.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
          >
            <button
              style={carouselStyles.lightboxClose}
              onClick={() => setLightboxOpen(false)}
            >
              <X size={24} color="#fff" />
            </button>
            <img
              src={current.url}
              alt=""
              style={carouselStyles.lightboxImg}
              onClick={(e) => e.stopPropagation()}
            />
            {medias.length > 1 && (
              <>
                {currentIndex > 0 && (
                  <button
                    style={{ ...carouselStyles.lightboxNav, left: 20 }}
                    onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1); }}
                  >
                    <ChevronLeft size={28} color="#fff" />
                  </button>
                )}
                {currentIndex < medias.length - 1 && (
                  <button
                    style={{ ...carouselStyles.lightboxNav, right: 20 }}
                    onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1); }}
                  >
                    <ChevronRight size={28} color="#fff" />
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const carouselStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    margin: '0 16px 12px',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  viewport: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    maxHeight: 460,
  },
  media: {
    width: '100%',
    maxHeight: 460,
    objectFit: 'contain' as const,
    cursor: 'pointer',
    display: 'block',
  },
  navBtn: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backdropFilter: 'blur(4px)',
  },
  dots: {
    position: 'absolute' as const,
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 6,
    zIndex: 2,
  },
  dot: {
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s',
  },
  counter: {
    position: 'absolute' as const,
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: 12,
    zIndex: 2,
  },
  lightbox: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    cursor: 'pointer',
  },
  lightboxClose: {
    position: 'absolute' as const,
    top: 20,
    right: 20,
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    cursor: 'pointer',
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  lightboxImg: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    objectFit: 'contain' as const,
    borderRadius: 8,
    cursor: 'default',
  },
  lightboxNav: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 48,
    height: 48,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
};

/* ─── Publication card ─── */
function PublicationCard({
  pub,
  currentUserId,
  currentUserRole,
  onLike,
  onNavigate,
  onUpdated,
  onDeleted,
}: {
  pub: Publication;
  currentUserId: string;
  currentUserRole: string;
  onLike: (id: string) => void;
  onNavigate: (userId: string) => void;
  onUpdated: (id: string, newContenu: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [nbCommentaires, setNbCommentaires] = useState(pub.nbCommentaires);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(pub.contenu);
  const [savingEdit, setSavingEdit] = useState(false);
  const timeAgo = formatDistanceToNow(new Date(pub.dateCreation), { addSuffix: true, locale: fr });
  const auteur = pub.auteur;
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleSaveEdit = async () => {
    if (!editText.trim() || savingEdit) return;
    setSavingEdit(true);
    const res = await modifierPublication(pub._id, editText.trim());
    if (res.succes) {
      onUpdated(pub._id, editText.trim());
      setEditMode(false);
    }
    setSavingEdit(false);
  };

  return (
    <>
      <motion.article
        style={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div style={styles.cardHeader}>
          <div style={styles.authorInfo}>
            <button
              style={styles.authorAvatarBtn}
              onClick={() => onNavigate(auteur._id)}
            >
              {auteur.avatar ? (
                <img src={auteur.avatar} alt="" style={styles.authorAvatarImg} />
              ) : (
                <span style={styles.authorInitial}>{auteur.prenom[0]}</span>
              )}
            </button>
            <div>
              <button
                style={styles.authorNameBtn}
                onClick={() => onNavigate(auteur._id)}
              >
                {auteur.prenom} {auteur.nom}
              </button>
              <span style={styles.postTime}>{timeAgo}</span>
            </div>
          </div>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button style={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
              <MoreHorizontal size={18} color={couleurs.texteSecondaire} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <PostMenu
                  pub={pub}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onClose={() => setShowMenu(false)}
                  onEdit={() => { setEditMode(true); setEditText(pub.contenu); }}
                  onDeleted={() => onDeleted(pub._id)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        {editMode ? (
          <div style={{ padding: '12px 16px' }}>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                border: `1px solid ${couleurs.bordure}`,
                backgroundColor: couleurs.fondInput,
                color: couleurs.texte,
                fontSize: '0.9375rem',
                resize: 'vertical' as const,
                lineHeight: 1.6,
                fontFamily: 'inherit',
                minHeight: 80,
              }}
              rows={3}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  background: 'none',
                  border: `1px solid ${couleurs.bordure}`,
                  color: couleurs.texteSecondaire,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
                onClick={() => { setEditMode(false); setEditText(pub.contenu); }}
              >
                Annuler
              </button>
              <button
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
                  color: couleurs.blanc,
                  fontSize: '0.8125rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: editText.trim() && !savingEdit ? 1 : 0.5,
                }}
                onClick={handleSaveEdit}
                disabled={!editText.trim() || savingEdit}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        ) : (
          pub.contenu && <p style={styles.content}>{pub.contenu}</p>
        )}

        {pub.medias && pub.medias.length > 0 ? (
          <MediaCarousel medias={pub.medias} />
        ) : pub.media ? (
          <MediaCarousel medias={[{ type: 'image', url: pub.media }]} />
        ) : null}

        <div style={styles.actions}>
          <motion.button
            style={styles.actionBtn}
            whileTap={{ scale: 0.9 }}
            onClick={() => onLike(pub._id)}
          >
            <Heart
              size={20}
              color={pub.aLike ? couleurs.danger : couleurs.texteSecondaire}
              fill={pub.aLike ? couleurs.danger : 'none'}
            />
            <span style={{ color: pub.aLike ? couleurs.danger : couleurs.texteSecondaire }}>
              {pub.nbLikes}
            </span>
          </motion.button>
          <button style={styles.actionBtn} onClick={() => setShowComments(true)}>
            <MessageCircle size={20} color={couleurs.texteSecondaire} />
            <span style={{ color: couleurs.texteSecondaire }}>{nbCommentaires}</span>
          </button>
        </div>
      </motion.article>

      <AnimatePresence>
        {showComments && (
          <CommentsPanel
            publicationId={pub._id}
            currentUserId={currentUserId}
            onClose={() => setShowComments(false)}
            onNavigate={onNavigate}
            onCountUpdate={(c) => setNbCommentaires(c)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── Feed page ─── */
export default function Feed() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [stories, setStories] = useState<StoriesGroupees[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview: string; type: 'image' | 'video' }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfilUtilisateur[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
  const [showStoryCreator, setShowStoryCreator] = useState(false);

  const currentUserId = utilisateur?.id || (utilisateur as any)?._id || '';
  const currentUserRole = utilisateur?.role || '';

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      const res = await rechercherUtilisateurs(searchQuery.trim());
      if (res.succes && res.data) {
        setSearchResults(res.data.utilisateurs);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (userId: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    naviguerVersProfil(userId);
  };

  const chargerDonnees = useCallback(async () => {
    setLoading(true);
    const [pubRes, storyRes] = await Promise.all([
      getPublications(1, 30),
      getStoriesActives(),
    ]);
    if (pubRes.succes && pubRes.data) {
      setPublications(pubRes.data.publications);
    }
    if (storyRes.succes && storyRes.data) {
      setStories(storyRes.data.storiesParUtilisateur);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  // Silent background polling every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getPublications(1, 30);
      if (res.succes && res.data) {
        setPublications((prev) => {
          const prevIds = new Set(prev.map((p) => p._id));
          const nouvelles = res.data!.publications.filter((p) => !prevIds.has(p._id));
          const mises = prev.map((p) => {
            const fresh = res.data!.publications.find((f) => f._id === p._id);
            return fresh ? { ...p, nbLikes: fresh.nbLikes, aLike: fresh.aLike, nbCommentaires: fresh.nbCommentaires } : p;
          });
          return nouvelles.length > 0 ? [...nouvelles, ...mises] : mises;
        });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 10 - selectedFiles.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: (file.type.startsWith('video/') ? 'video' : 'image') as 'image' | 'video',
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePost = async () => {
    if (!newPost.trim() && selectedFiles.length === 0) return;
    setPosting(true);
    let mediaUrls: string[] | undefined;
    if (selectedFiles.length > 0) {
      mediaUrls = await Promise.all(selectedFiles.map((f) => fileToBase64(f.file)));
    }
    const res = await creerPublication(newPost.trim() || ' ', mediaUrls);
    if (res.succes && res.data) {
      setPublications((prev) => [res.data!.publication, ...prev]);
      setNewPost('');
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setSelectedFiles([]);
      toast('Publication partagee !', 'success');
    } else {
      toast(res.message || 'Erreur lors de la publication', 'error');
    }
    setPosting(false);
  };

  const handleLike = async (id: string) => {
    // Optimistic update
    setPublications((prev) =>
      prev.map((p) =>
        p._id === id
          ? { ...p, aLike: !p.aLike, nbLikes: p.aLike ? p.nbLikes - 1 : p.nbLikes + 1 }
          : p
      )
    );
    const res = await toggleLikePublication(id);
    if (res.succes && res.data) {
      setPublications((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, aLike: res.data!.aLike, nbLikes: res.data!.nbLikes } : p
        )
      );
    }
  };

  const handlePublicationUpdated = (id: string, newContenu: string) => {
    setPublications((prev) =>
      prev.map((p) => (p._id === id ? { ...p, contenu: newContenu } : p))
    );
  };

  const handlePublicationDeleted = (id: string) => {
    setPublications((prev) => prev.filter((p) => p._id !== id));
  };

  const handleStoryAllSeen = useCallback((groupIndex: number) => {
    setStories((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, toutesVues: true } : g))
    );
  }, []);

  const naviguerVersProfil = useCallback(
    (userId: string) => {
      if (utilisateur && (utilisateur.id === userId || (utilisateur as any)._id === userId)) {
        navigate('/profil');
      } else {
        navigate(`/utilisateur/${userId}`);
      }
    },
    [utilisateur, navigate]
  );

  return (
    <div style={styles.page}>
      <motion.h1
        style={styles.pageTitle}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Fil d'actualite
      </motion.h1>

      {/* Search bar */}
      <div style={styles.searchSection}>
        <div style={styles.searchBar}>
          <Search size={16} color={couleurs.texteSecondaire} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!searchOpen && e.target.value) setSearchOpen(true);
            }}
            onFocus={() => { if (searchQuery) setSearchOpen(true); }}
            placeholder="Rechercher un utilisateur..."
            style={styles.searchInput}
          />
          {searchQuery && (
            <button
              style={styles.searchClear}
              onClick={() => { setSearchQuery(''); setSearchOpen(false); setSearchResults([]); }}
            >
              <X size={14} color={couleurs.texteSecondaire} />
            </button>
          )}
        </div>
        <AnimatePresence>
          {searchOpen && searchQuery.trim() && (
            <motion.div
              style={styles.searchResultsDropdown}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
            >
              {searching ? (
                <div className="skeleton" style={{ height: 40, borderRadius: 8, margin: 8 }} />
              ) : searchResults.length > 0 ? (
                searchResults.slice(0, 8).map((u) => (
                  <button
                    key={u._id}
                    style={styles.searchResultItem}
                    onClick={() => handleSelectUser(u._id)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = couleurs.fondCard; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    <div style={styles.searchResultAvatar}>
                      {u.avatar ? (
                        <img src={u.avatar} alt="" style={styles.searchResultAvatarImg} />
                      ) : (
                        <span style={styles.searchResultInitial}>{u.prenom[0]}</span>
                      )}
                    </div>
                    <div style={styles.searchResultInfo}>
                      <span style={styles.searchResultName}>{u.prenom} {u.nom}</span>
                      <span style={styles.searchResultStatut}>
                        {u.role === 'super_admin' ? 'Fondateur'
                          : u.role === 'admin' || u.role === 'admin_modo' ? 'Admin'
                          : u.role === 'modo' ? 'Moderateur'
                          : u.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p style={styles.searchNoResults}>Aucun resultat</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={styles.storiesRow}>
        {/* Create story button */}
        <button style={styles.createStoryBtn} onClick={() => setShowStoryCreator(true)}>
          <div style={styles.createStoryPlus}>
            <Plus size={22} color={couleurs.blanc} />
          </div>
          <span style={styles.createStoryLabel}>Creer</span>
        </button>
        {stories.map((group, idx) => (
          <StoryRing
            key={group.utilisateur._id}
            group={group}
            onClick={() => setStoryViewerIndex(idx)}
          />
        ))}
      </div>

      {/* Story Creator */}
      <AnimatePresence>
        {showStoryCreator && (
          <StoryCreator
            onClose={() => setShowStoryCreator(false)}
            onCreated={chargerDonnees}
          />
        )}
      </AnimatePresence>

      {/* Story Viewer */}
      <AnimatePresence>
        {storyViewerIndex !== null && (
          <StoryViewer
            groups={stories}
            initialGroupIndex={storyViewerIndex}
            currentUserId={currentUserId}
            onClose={() => setStoryViewerIndex(null)}
            onAllSeen={handleStoryAllSeen}
          />
        )}
      </AnimatePresence>

      <div style={styles.composer}>
        <div style={styles.composerTop}>
          <div style={styles.composerAvatar}>
            {utilisateur?.avatar ? (
              <img src={utilisateur.avatar} alt="" style={styles.composerAvatarImg} />
            ) : (
              <span style={styles.composerInitial}>{utilisateur?.prenom?.[0] || '?'}</span>
            )}
          </div>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Quoi de neuf ?"
            style={styles.composerInput}
            rows={2}
          />
        </div>

        {/* Media preview */}
        {selectedFiles.length > 0 && (
          <div style={styles.mediaPreviews}>
            {selectedFiles.map((f, i) => (
              <div key={i} style={styles.mediaPreviewItem}>
                {f.type === 'video' ? (
                  <div style={styles.mediaPreviewVideo}>
                    <video src={f.preview} style={styles.mediaPreviewImg} muted />
                    <div style={styles.mediaPreviewVideoIcon}>
                      <Film size={20} color="#fff" />
                    </div>
                  </div>
                ) : (
                  <img src={f.preview} alt="" style={styles.mediaPreviewImg} />
                )}
                <button style={styles.mediaPreviewRemove} onClick={() => removeFile(i)}>
                  <X size={14} color="#fff" />
                </button>
              </div>
            ))}
            {selectedFiles.length < 10 && (
              <button
                style={styles.mediaPreviewAdd}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={24} color={couleurs.texteSecondaire} />
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFilesSelected}
        />

        <div style={styles.composerBottom}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              style={styles.composerMediaBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <Image size={18} color={couleurs.primaire} />
              <span>Photo</span>
            </button>
            <button
              style={styles.composerMediaBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <Film size={18} color={couleurs.secondaire} />
              <span>Video</span>
            </button>
          </div>
          <motion.button
            style={{
              ...styles.composerPostBtn,
              opacity: (newPost.trim() || selectedFiles.length > 0) && !posting ? 1 : 0.5,
            }}
            whileHover={(newPost.trim() || selectedFiles.length > 0) ? { scale: 1.02 } : {}}
            whileTap={(newPost.trim() || selectedFiles.length > 0) ? { scale: 0.98 } : {}}
            onClick={handlePost}
            disabled={(!newPost.trim() && selectedFiles.length === 0) || posting}
          >
            <Send size={16} />
            {posting ? 'Publication...' : 'Publier'}
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div style={styles.skeletons}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 16 }} />
          ))}
        </div>
      ) : (
        <div style={styles.feed}>
          <AnimatePresence>
            {publications.map((pub) => (
              <PublicationCard
                key={pub._id}
                pub={pub}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onLike={handleLike}
                onNavigate={naviguerVersProfil}
                onUpdated={handlePublicationUpdated}
                onDeleted={handlePublicationDeleted}
              />
            ))}
          </AnimatePresence>
          {publications.length === 0 && (
            <div style={styles.empty}>
              <p style={styles.emptyText}>Aucune publication pour le moment</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 680,
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: 24,
  },
  /* Search */
  searchSection: {
    position: 'relative' as const,
    marginBottom: 20,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 12,
    backgroundColor: couleurs.fondCard,
    border: `1px solid ${couleurs.bordure}`,
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: couleurs.texte,
    fontSize: '0.875rem',
    minWidth: 0,
  },
  searchClear: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
  },
  searchResultsDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: couleurs.fondElevated,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 12,
    padding: 4,
    maxHeight: 360,
    overflowY: 'auto' as const,
    zIndex: 50,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  searchResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
    backgroundColor: 'transparent',
    transition: 'background-color 150ms ease',
  },
  searchResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  searchResultAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  searchResultInitial: { color: couleurs.blanc, fontWeight: '600', fontSize: '0.8125rem' },
  searchResultInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  searchResultName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: couleurs.texte,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  searchResultStatut: {
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
  },
  searchNoResults: {
    textAlign: 'center' as const,
    padding: 16,
    color: couleurs.texteSecondaire,
    fontSize: '0.8125rem',
  },
  /* Stories */
  storiesRow: {
    display: 'flex',
    gap: 16,
    overflowX: 'auto',
    paddingBottom: 16,
    marginBottom: 24,
    scrollbarWidth: 'none' as any,
  },
  createStoryBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    minWidth: 72,
  },
  createStoryPlus: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createStoryLabel: {
    fontSize: '0.6875rem',
    color: couleurs.texte,
    fontWeight: '500',
    maxWidth: 72,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  storyBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    minWidth: 72,
  },
  storyRing: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: '2px solid',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover' as const,
  },
  storyAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: couleurs.blanc,
    fontWeight: '600',
    fontSize: '1rem',
  },
  storyName: {
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 72,
  },
  /* Composer */
  composer: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    border: `1px solid ${couleurs.bordure}`,
    marginBottom: 24,
    overflow: 'hidden',
  },
  composerTop: {
    display: 'flex',
    gap: 12,
    padding: '16px 16px 8px',
  },
  composerAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  composerAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  composerInitial: {
    color: couleurs.blanc,
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  composerInput: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: couleurs.texte,
    fontSize: '0.9375rem',
    resize: 'none' as const,
    lineHeight: 1.5,
    padding: '8px 0',
  },
  composerBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px 12px',
    borderTop: `1px solid ${couleurs.bordure}`,
  },
  composerMediaBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 8,
    backgroundColor: 'transparent',
    border: 'none',
    color: couleurs.primaire,
    fontSize: '0.8125rem',
    cursor: 'pointer',
  },
  composerPostBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    color: couleurs.blanc,
    fontSize: '0.8125rem',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  /* Media previews in composer */
  mediaPreviews: {
    display: 'flex',
    gap: 8,
    padding: '8px 16px',
    overflowX: 'auto' as const,
    flexWrap: 'wrap' as const,
  },
  mediaPreviewItem: {
    position: 'relative' as const,
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  mediaPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
  },
  mediaPreviewVideo: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
  },
  mediaPreviewVideoIcon: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  mediaPreviewRemove: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  mediaPreviewAdd: {
    width: 80,
    height: 80,
    borderRadius: 10,
    border: `2px dashed ${couleurs.bordure}`,
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  /* Feed */
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  /* Card */
  card: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    border: `1px solid ${couleurs.bordure}`,
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 0',
  },
  authorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  authorAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  authorAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  authorInitial: {
    color: couleurs.blanc,
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  authorNameBtn: {
    display: 'block',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  postTime: {
    display: 'block',
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  content: {
    padding: '12px 16px',
    fontSize: '0.9375rem',
    color: couleurs.texte,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },
  mediaContainer: {
    padding: '0 16px 12px',
  },
  mediaImg: {
    width: '100%',
    borderRadius: 12,
    maxHeight: 400,
    objectFit: 'cover' as const,
  },
  actions: {
    display: 'flex',
    gap: 24,
    padding: '12px 16px',
    borderTop: `1px solid ${couleurs.bordure}`,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    padding: '4px 0',
  },
  /* Comments overlay */
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
  },
  commentsSheet: {
    width: '100%',
    maxWidth: 640,
    minHeight: '60vh',
    maxHeight: '90vh',
    backgroundColor: couleurs.fondElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
  },
  sheetHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 20px 12px',
    position: 'relative' as const,
    borderBottom: `1px solid ${couleurs.bordure}`,
  },
  sheetHandle: {
    position: 'absolute' as const,
    top: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: couleurs.bordure,
  },
  sheetTitle: {
    fontSize: '1.0625rem',
    fontWeight: '700',
    color: couleurs.texte,
    marginTop: 8,
    letterSpacing: '-0.01em',
  },
  sheetClose: {
    position: 'absolute' as const,
    right: 16,
    top: 16,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
  },
  commentsList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px 20px',
  },
  /* Comment row */
  commentRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  commentAvatarBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    overflow: 'hidden',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  commentAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: couleurs.blanc,
    fontWeight: '600',
    fontSize: '0.875rem',
  },
  commentBubble: {
    backgroundColor: couleurs.fondInput,
    borderRadius: 14,
    padding: '10px 14px',
  },
  commentAuthorBtn: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: couleurs.texte,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    marginBottom: 3,
    textAlign: 'left' as const,
  },
  commentText: {
    fontSize: '0.9375rem',
    color: couleurs.texte,
    lineHeight: 1.5,
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
    paddingLeft: 4,
  },
  commentTime: {
    fontSize: '0.75rem',
    color: couleurs.texteMuted,
  },
  commentMetaBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 0',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  showRepliesBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginLeft: 52,
    marginTop: 6,
    marginBottom: 10,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.primaire,
    padding: 0,
  },
  /* Reply banner */
  replyBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    borderTop: `1px solid ${couleurs.bordure}`,
    backgroundColor: `${couleurs.primaire}10`,
  },
  replyBannerText: {
    flex: 1,
    fontSize: '0.8125rem',
    color: couleurs.primaire,
    fontWeight: '500',
  },
  replyBannerClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    borderRadius: '50%',
  },
  /* Comment input */
  commentInput: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    padding: '14px 20px',
    borderTop: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondElevated,
  },
  commentInputField: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 20,
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '0.9375rem',
    lineHeight: 1.5,
    resize: 'none' as const,
    fontFamily: 'inherit',
    minHeight: 44,
    maxHeight: 120,
    outline: 'none',
  },
  commentSendBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${couleurs.primaire}, ${couleurs.primaireDark})`,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  /* Skeletons & empty */
  skeletons: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  empty: {
    textAlign: 'center',
    padding: 48,
  },
  emptyText: {
    color: couleurs.texteSecondaire,
    fontSize: '0.9375rem',
  },
};
