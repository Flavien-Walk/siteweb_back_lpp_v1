import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  Trash2,
  CornerDownRight,
  Pencil,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getPublication,
  toggleLikePublication,
  getCommentaires,
  ajouterCommentaire,
  supprimerCommentaire,
  toggleLikeCommentaire,
  modifierCommentaire,
} from '../services/publications';
import type { Publication, Commentaire } from '../services/publications';
import { couleurs } from '../styles/theme';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

/* ─── Comment Row ─── */
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
      onDeleted();
    }
    setSavingEdit(false);
  };

  const auteur = comment.auteur;
  const timeAgo = formatDistanceToNow(new Date(comment.dateCreation), { addSuffix: false, locale: fr });
  const isMine = auteur._id === currentUserId;
  const replies = comment.reponses || [];

  return (
    <div style={{ marginLeft: isReply ? 52 : 0, marginBottom: 20 }}>
      <div style={s.commentRow}>
        <button style={s.commentAvatar} onClick={() => onNavigate(auteur._id)}>
          {auteur.avatar ? (
            <img src={auteur.avatar} alt="" style={s.commentAvatarImg} />
          ) : (
            <div style={s.commentAvatarPlaceholder}>{auteur.prenom[0]}</div>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.commentBubble}>
            <button style={s.commentAuthor} onClick={() => onNavigate(auteur._id)}>
              {auteur.prenom} {auteur.nom}
            </button>
            {editing ? (
              <div>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  style={s.editInput}
                  maxLength={500}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') { setEditing(false); setEditText(comment.contenu); }
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button style={s.editCancel} onClick={() => { setEditing(false); setEditText(comment.contenu); }}>
                    Annuler
                  </button>
                  <button
                    style={{ ...s.editSave, opacity: editText.trim() && !savingEdit ? 1 : 0.5 }}
                    onClick={handleSaveEdit}
                    disabled={!editText.trim() || savingEdit}
                  >
                    Sauvegarder
                  </button>
                </div>
              </div>
            ) : (
              <p style={s.commentText}>{comment.contenu}</p>
            )}
          </div>
          <div style={s.commentMeta}>
            <span style={s.commentTime}>
              {timeAgo}
              {comment.modifie && <span style={{ color: couleurs.texteMuted, marginLeft: 4, fontStyle: 'italic' }}>(modifie)</span>}
            </span>
            <button style={s.metaBtn} onClick={handleLike}>
              <Heart size={13} color={liked ? couleurs.danger : couleurs.texteSecondaire} fill={liked ? couleurs.danger : 'none'} />
              {likes > 0 && <span style={{ color: liked ? couleurs.danger : couleurs.texteSecondaire }}>{likes}</span>}
            </button>
            <button style={s.metaBtn} onClick={() => onReply(comment._id, `${auteur.prenom} ${auteur.nom}`)}>
              Repondre
            </button>
            {isMine && !editing && (
              <>
                <button style={s.metaBtn} onClick={() => { setEditing(true); setEditText(comment.contenu); }}>
                  <Pencil size={12} color={couleurs.texteSecondaire} />
                </button>
                <button style={s.metaBtn} onClick={handleDelete}>
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
            <button style={s.showReplies} onClick={() => setShowReplies(true)}>
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

/* ─── Publication Detail Page ─── */
export default function PublicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const currentUserId = utilisateur?.id || (utilisateur as any)?._id || '';

  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [nbLikes, setNbLikes] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Comments
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nom: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chargerPublication = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await getPublication(id);
    if (res.succes && res.data) {
      setPublication(res.data.publication);
      setLiked(res.data.publication.aLike);
      setNbLikes(res.data.publication.nbLikes);
    }
    setLoading(false);
  }, [id]);

  const chargerCommentaires = useCallback(async () => {
    if (!id) return;
    setLoadingComments(true);
    const res = await getCommentaires(id, 1, 100);
    if (res.succes && res.data) {
      setCommentaires(res.data.commentaires);
    }
    setLoadingComments(false);
  }, [id]);

  useEffect(() => {
    chargerPublication();
    chargerCommentaires();
  }, [chargerPublication, chargerCommentaires]);

  const handleLike = async () => {
    if (!id) return;
    setLiked((p) => !p);
    setNbLikes((p) => (liked ? p - 1 : p + 1));
    const res = await toggleLikePublication(id);
    if (res.succes && res.data) {
      setLiked(res.data.aLike);
      setNbLikes(res.data.nbLikes);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || sending || !id) return;
    setSending(true);
    const res = await ajouterCommentaire(id, newComment.trim(), replyingTo?.id);
    if (res.succes) {
      setNewComment('');
      setReplyingTo(null);
      await chargerCommentaires();
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  };

  const naviguerVersProfil = (userId: string) => {
    if (utilisateur && (utilisateur.id === userId || (utilisateur as any)._id === userId)) {
      navigate('/profil');
    } else {
      navigate(`/utilisateur/${userId}`);
    }
  };

  const allMedias = publication?.medias?.length
    ? publication.medias
    : publication?.media
    ? [{ type: 'image' as const, url: publication.media }]
    : [];

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.backRow}>
          <button style={s.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} color={couleurs.texte} />
            Retour
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
          <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  if (!publication) {
    return (
      <div style={s.page}>
        <div style={s.backRow}>
          <button style={s.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={20} color={couleurs.texte} />
            Retour
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: couleurs.texteSecondaire, fontSize: '1rem' }}>Publication introuvable</p>
        </div>
      </div>
    );
  }

  const auteur = publication.auteur;
  const timeAgo = formatDistanceToNow(new Date(publication.dateCreation), { addSuffix: true, locale: fr });
  const currentMedia = allMedias[mediaIndex];

  return (
    <div style={s.page}>
      <div style={s.backRow}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} color={couleurs.texte} />
          Retour
        </button>
      </div>

      <div style={s.layout}>
        {/* Left: Post content */}
        <div style={s.postSection}>
          <motion.div style={s.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Author header */}
            <div style={s.authorRow}>
              <button style={s.authorAvatar} onClick={() => naviguerVersProfil(auteur._id)}>
                {auteur.avatar ? (
                  <img src={auteur.avatar} alt="" style={s.authorAvatarImg} />
                ) : (
                  <span style={s.authorInitial}>{auteur.prenom[0]}</span>
                )}
              </button>
              <div>
                <button style={s.authorName} onClick={() => naviguerVersProfil(auteur._id)}>
                  {auteur.prenom} {auteur.nom}
                </button>
                <span style={s.postTime}>{timeAgo}</span>
              </div>
            </div>

            {/* Content */}
            {publication.contenu && <p style={s.content}>{publication.contenu}</p>}

            {/* Media carousel */}
            {allMedias.length > 0 && currentMedia && (
              <div style={s.mediaContainer}>
                <div style={s.mediaViewport}>
                  {currentMedia.type === 'video' ? (
                    <video src={currentMedia.url} controls playsInline style={s.mediaEl} preload="metadata" />
                  ) : (
                    <img
                      src={currentMedia.url}
                      alt=""
                      style={s.mediaEl}
                      onClick={() => setLightboxOpen(true)}
                    />
                  )}
                </div>
                {allMedias.length > 1 && (
                  <>
                    {mediaIndex > 0 && (
                      <button style={{ ...s.mediaNav, left: 8 }} onClick={() => setMediaIndex((i) => i - 1)}>
                        <ChevronLeft size={20} color="#fff" />
                      </button>
                    )}
                    {mediaIndex < allMedias.length - 1 && (
                      <button style={{ ...s.mediaNav, right: 8 }} onClick={() => setMediaIndex((i) => i + 1)}>
                        <ChevronRight size={20} color="#fff" />
                      </button>
                    )}
                    <div style={s.mediaDots}>
                      {allMedias.map((_, i) => (
                        <button
                          key={i}
                          style={{
                            width: i === mediaIndex ? 8 : 6,
                            height: i === mediaIndex ? 8 : 6,
                            borderRadius: '50%',
                            backgroundColor: i === mediaIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          onClick={() => setMediaIndex(i)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={s.actions}>
              <motion.button style={s.actionBtn} whileTap={{ scale: 0.9 }} onClick={handleLike}>
                <Heart size={22} color={liked ? couleurs.danger : couleurs.texteSecondaire} fill={liked ? couleurs.danger : 'none'} />
                <span style={{ color: liked ? couleurs.danger : couleurs.texteSecondaire, fontWeight: '600' }}>{nbLikes}</span>
              </motion.button>
              <div style={s.actionBtn}>
                <MessageCircle size={22} color={couleurs.texteSecondaire} />
                <span style={{ color: couleurs.texteSecondaire }}>{commentaires.length}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Comments section */}
        <div style={s.commentsSection}>
          <motion.div style={s.commentsCard} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={s.commentsTitle}>
              Commentaires ({commentaires.length})
            </h3>

            <div style={s.commentsList}>
              {loadingComments ? (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, padding: '8px 0' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={{ display: 'flex', gap: 12 }}>
                      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 6, marginBottom: 8 }} />
                        <div className="skeleton" style={{ width: '80%', height: 32, borderRadius: 10 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : commentaires.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <MessageCircle size={40} color={couleurs.texteMuted} strokeWidth={1} />
                  <p style={{ color: couleurs.texteSecondaire, marginTop: 12, fontSize: '0.9375rem' }}>Aucun commentaire</p>
                  <p style={{ color: couleurs.texteMuted, fontSize: '0.8125rem' }}>Sois le premier a reagir !</p>
                </div>
              ) : (
                commentaires.map((c) => (
                  <CommentRow
                    key={c._id}
                    comment={c}
                    publicationId={id!}
                    currentUserId={currentUserId}
                    onReply={(cId, nom) => {
                      setReplyingTo({ id: cId, nom });
                      textareaRef.current?.focus();
                    }}
                    onDeleted={chargerCommentaires}
                    onNavigate={naviguerVersProfil}
                  />
                ))
              )}
            </div>

            {/* Reply banner */}
            {replyingTo && (
              <div style={s.replyBanner}>
                <CornerDownRight size={14} color={couleurs.primaire} />
                <span style={s.replyBannerText}>Reponse a {replyingTo.nom}</span>
                <button style={s.replyBannerClose} onClick={() => setReplyingTo(null)}>
                  <X size={14} color={couleurs.texteSecondaire} />
                </button>
              </div>
            )}

            {/* Comment input */}
            <div style={s.commentInputRow}>
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => { setNewComment(e.target.value); autoResize(); }}
                onKeyDown={handleKeyDown}
                placeholder="Ajouter un commentaire..."
                style={s.commentInput}
                maxLength={500}
                rows={1}
              />
              <motion.button
                style={{ ...s.sendBtn, opacity: newComment.trim() && !sending ? 1 : 0.4 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSendComment}
                disabled={!newComment.trim() || sending}
              >
                <Send size={18} color={couleurs.blanc} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && currentMedia?.type === 'image' && (
          <motion.div
            style={s.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
          >
            <button style={s.lightboxClose} onClick={() => setLightboxOpen(false)}>
              <X size={24} color="#fff" />
            </button>
            <img src={currentMedia.url} alt="" style={s.lightboxImg} onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
  },
  backRow: {
    marginBottom: 20,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: couleurs.texte,
    fontSize: '0.9375rem',
    fontWeight: '500',
    padding: '8px 0',
  },
  layout: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
  },
  postSection: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    overflow: 'hidden',
    border: `1px solid ${couleurs.bordure}`,
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    overflow: 'hidden',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  authorAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  authorInitial: {
    color: couleurs.blanc,
    fontWeight: '700',
    fontSize: '1.125rem',
  },
  authorName: {
    display: 'block',
    fontWeight: '600',
    fontSize: '1rem',
    color: couleurs.texte,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left' as const,
  },
  postTime: {
    display: 'block',
    fontSize: '0.8125rem',
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  content: {
    fontSize: '1rem',
    lineHeight: 1.6,
    color: couleurs.texte,
    margin: 0,
    padding: '0 20px 16px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  mediaContainer: {
    position: 'relative' as const,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  mediaViewport: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 520,
  },
  mediaEl: {
    width: '100%',
    maxHeight: 520,
    objectFit: 'contain' as const,
    display: 'block',
    cursor: 'pointer',
  },
  mediaNav: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mediaDots: {
    position: 'absolute' as const,
    bottom: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: 6,
    zIndex: 2,
  },
  actions: {
    display: 'flex',
    gap: 28,
    padding: '16px 20px',
    borderTop: `1px solid ${couleurs.bordure}`,
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.9375rem',
    padding: 0,
  },
  /* Comments section */
  commentsSection: {
    width: 400,
    flexShrink: 0,
    position: 'sticky' as const,
    top: 20,
    maxHeight: 'calc(100vh - 120px)',
  },
  commentsCard: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 16,
    border: `1px solid ${couleurs.bordure}`,
    display: 'flex',
    flexDirection: 'column' as const,
    maxHeight: 'calc(100vh - 120px)',
    overflow: 'hidden',
  },
  commentsTitle: {
    fontSize: '1.0625rem',
    fontWeight: '700',
    color: couleurs.texte,
    margin: 0,
    padding: '18px 20px',
    borderBottom: `1px solid ${couleurs.bordure}`,
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
  commentAvatar: {
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
  commentAuthor: {
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
  metaBtn: {
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
  editInput: {
    width: '100%',
    padding: '6px 10px',
    borderRadius: 8,
    border: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondInput,
    color: couleurs.texte,
    fontSize: '0.875rem',
    marginTop: 4,
  },
  editCancel: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    color: couleurs.texteSecondaire,
    padding: '2px 0',
  },
  editSave: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: couleurs.primaire,
    padding: '2px 0',
  },
  showReplies: {
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
  },
  commentInputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    padding: '14px 20px',
    borderTop: `1px solid ${couleurs.bordure}`,
  },
  commentInput: {
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
  sendBtn: {
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
  /* Lightbox */
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
};
