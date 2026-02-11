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
  Trash2,
  CornerDownRight,
  Search,
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
} from '../services/publications';
import type { Publication, Commentaire } from '../services/publications';
import { getStoriesActives } from '../services/stories';
import type { StoriesGroupees } from '../services/stories';
import { rechercherUtilisateurs } from '../services/utilisateurs';
import type { ProfilUtilisateur } from '../services/utilisateurs';
import { couleurs } from '../styles/theme';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

  const auteur = comment.auteur;
  const timeAgo = formatDistanceToNow(new Date(comment.dateCreation), { addSuffix: false, locale: fr });
  const isMine = auteur._id === currentUserId;
  const replies = comment.reponses || [];

  return (
    <div style={{ marginLeft: isReply ? 40 : 0, marginBottom: 12 }}>
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
            <p style={styles.commentText}>{comment.contenu}</p>
          </div>
          <div style={styles.commentMeta}>
            <span style={styles.commentTime}>{timeAgo}</span>
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
              Répondre
            </button>
            {isMine && (
              <button style={styles.commentMetaBtn} onClick={handleDelete}>
                <Trash2 size={12} color={couleurs.texteSecondaire} />
              </button>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && !isReply && (
        <>
          {!showReplies ? (
            <button style={styles.showRepliesBtn} onClick={() => setShowReplies(true)}>
              <ChevronDown size={14} />
              Voir {replies.length} réponse{replies.length > 1 ? 's' : ''}
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
  const inputRef = useRef<HTMLInputElement>(null);

  const charger = useCallback(async () => {
    setLoading(true);
    const res = await getCommentaires(publicationId, 1, 50);
    if (res.succes && res.data) {
      setCommentaires(res.data.commentaires);
      onCountUpdate(res.data.pagination?.total ?? res.data.commentaires.length);
    }
    setLoading(false);
  }, [publicationId, onCountUpdate]);

  useEffect(() => {
    charger();
  }, [charger]);

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

  const handleReply = (id: string, nom: string) => {
    setReplyingTo({ id, nom });
    inputRef.current?.focus();
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
          <span style={styles.sheetTitle}>Commentaires</span>
          <button style={styles.sheetClose} onClick={onClose}>
            <X size={20} color={couleurs.texte} />
          </button>
        </div>

        {/* Comments list */}
        <div style={styles.commentsList}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <span style={{ color: couleurs.texteSecondaire, fontSize: '0.875rem' }}>
                Chargement...
              </span>
            </div>
          ) : commentaires.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <span style={{ color: couleurs.texteSecondaire, fontSize: '0.875rem' }}>
                Aucun commentaire. Sois le premier !
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
            <span style={styles.replyBannerText}>Réponse à {replyingTo.nom}</span>
            <button style={styles.replyBannerClose} onClick={() => setReplyingTo(null)}>
              <X size={14} color={couleurs.texteSecondaire} />
            </button>
          </div>
        )}

        {/* Input */}
        <div style={styles.commentInput}>
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ajouter un commentaire..."
            style={styles.commentInputField}
            maxLength={500}
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
            <Send size={16} color={couleurs.blanc} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Publication card ─── */
function PublicationCard({
  pub,
  currentUserId,
  onLike,
  onNavigate,
}: {
  pub: Publication;
  currentUserId: string;
  onLike: (id: string) => void;
  onNavigate: (userId: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [nbCommentaires, setNbCommentaires] = useState(pub.nbCommentaires);
  const timeAgo = formatDistanceToNow(new Date(pub.dateCreation), { addSuffix: true, locale: fr });
  const auteur = pub.auteur;

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
          <div style={{ position: 'relative' }}>
            <button style={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>
              <MoreHorizontal size={18} color={couleurs.texteSecondaire} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={styles.menu}
                >
                  <button style={styles.menuItem} onClick={() => setShowMenu(false)}>
                    <Flag size={14} /> Signaler
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {pub.contenu && <p style={styles.content}>{pub.contenu}</p>}

        {pub.medias && pub.medias.length > 0 && (
          <div style={styles.mediaContainer}>
            {pub.medias.map((m, i) => (
              <img key={i} src={m.url} alt="" style={styles.mediaImg} />
            ))}
          </div>
        )}
        {!pub.medias?.length && pub.media && (
          <div style={styles.mediaContainer}>
            <img src={pub.media} alt="" style={styles.mediaImg} />
          </div>
        )}

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
  const [publications, setPublications] = useState<Publication[]>([]);
  const [stories, setStories] = useState<StoriesGroupees[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfilUtilisateur[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);

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

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    const res = await creerPublication(newPost.trim());
    if (res.succes && res.data) {
      setPublications((prev) => [res.data!.publication, ...prev]);
      setNewPost('');
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
        Fil d'actualité
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
                        {u.statut === 'entrepreneur' ? 'Entrepreneur' : 'Visiteur'}
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

      {stories.length > 0 && (
        <div style={styles.storiesRow}>
          {stories.map((group) => (
            <StoryRing key={group.utilisateur._id} group={group} onClick={() => {}} />
          ))}
        </div>
      )}

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
        <div style={styles.composerBottom}>
          <button style={styles.composerMediaBtn}>
            <Image size={18} color={couleurs.primaire} />
            <span>Photo</span>
          </button>
          <motion.button
            style={{
              ...styles.composerPostBtn,
              opacity: newPost.trim() && !posting ? 1 : 0.5,
            }}
            whileHover={newPost.trim() ? { scale: 1.02 } : {}}
            whileTap={newPost.trim() ? { scale: 0.98 } : {}}
            onClick={handlePost}
            disabled={!newPost.trim() || posting}
          >
            <Send size={16} />
            Publier
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
                currentUserId={utilisateur?.id || (utilisateur as any)?._id || ''}
                onLike={handleLike}
                onNavigate={naviguerVersProfil}
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
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: '100%',
    backgroundColor: couleurs.fondElevated,
    border: `1px solid ${couleurs.bordure}`,
    borderRadius: 12,
    padding: 4,
    minWidth: 140,
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
    maxWidth: 560,
    maxHeight: '70vh',
    backgroundColor: couleurs.fondElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  sheetHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 16px 8px',
    position: 'relative' as const,
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
    fontSize: '1rem',
    fontWeight: '600',
    color: couleurs.texte,
    marginTop: 8,
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
    padding: '12px 16px',
  },
  /* Comment row */
  commentRow: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  commentAvatarBtn: {
    width: 32,
    height: 32,
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
    fontSize: '0.6875rem',
  },
  commentBubble: {
    backgroundColor: couleurs.fondInput,
    borderRadius: 12,
    padding: '8px 12px',
  },
  commentAuthorBtn: {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: couleurs.texte,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    marginBottom: 2,
    textAlign: 'left' as const,
  },
  commentText: {
    fontSize: '0.8125rem',
    color: couleurs.texte,
    lineHeight: 1.4,
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    paddingLeft: 4,
  },
  commentTime: {
    fontSize: '0.6875rem',
    color: couleurs.texteMuted,
  },
  commentMetaBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontSize: '0.6875rem',
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  showRepliesBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginLeft: 42,
    marginTop: 4,
    marginBottom: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: couleurs.primaire,
    padding: 0,
  },
  /* Reply banner */
  replyBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderTop: `1px solid ${couleurs.bordure}`,
    backgroundColor: couleurs.fondInput,
  },
  replyBannerText: {
    flex: 1,
    fontSize: '0.75rem',
    color: couleurs.primaire,
    fontWeight: '500',
  },
  replyBannerClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    display: 'flex',
  },
  /* Comment input */
  commentInput: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderTop: `1px solid ${couleurs.bordure}`,
  },
  commentInputField: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 20,
    backgroundColor: couleurs.fondInput,
    border: `1px solid ${couleurs.bordure}`,
    color: couleurs.texte,
    fontSize: '0.8125rem',
  },
  commentSendBtn: {
    width: 36,
    height: 36,
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
