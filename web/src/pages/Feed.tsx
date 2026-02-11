import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Send, Image, MoreHorizontal, Trash2, Flag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPublications, creerPublication, toggleLikePublication, Publication } from '../services/publications';
import { getStoriesActives, StoriesGroupees } from '../services/stories';
import { couleurs } from '../styles/theme';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

function PublicationCard({ pub, onLike }: { pub: Publication; onLike: (id: string) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const timeAgo = formatDistanceToNow(new Date(pub.dateCreation), { addSuffix: true, locale: fr });
  const auteur = pub.auteur;

  return (
    <motion.article
      style={styles.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={styles.cardHeader}>
        <div style={styles.authorInfo}>
          <div style={styles.authorAvatar}>
            {auteur.avatar ? (
              <img src={auteur.avatar} alt="" style={styles.authorAvatarImg} />
            ) : (
              <span style={styles.authorInitial}>{auteur.prenom[0]}</span>
            )}
          </div>
          <div>
            <span style={styles.authorName}>{auteur.prenom} {auteur.nom}</span>
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
        <button style={styles.actionBtn}>
          <MessageCircle size={20} color={couleurs.texteSecondaire} />
          <span style={{ color: couleurs.texteSecondaire }}>{pub.nbCommentaires}</span>
        </button>
      </div>
    </motion.article>
  );
}

export default function Feed() {
  const { utilisateur } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [stories, setStories] = useState<StoriesGroupees[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

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
    const res = await toggleLikePublication(id);
    if (res.succes && res.data) {
      setPublications((prev) =>
        prev.map((p) =>
          p._id === id ? { ...p, aLike: res.data!.aLike, nbLikes: res.data!.nbLikes } : p
        )
      );
    }
  };

  return (
    <div style={styles.page}>
      <motion.h1
        style={styles.pageTitle}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Fil d'actualité
      </motion.h1>

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
              <PublicationCard key={pub._id} pub={pub} onLike={handleLike} />
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
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
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
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    backgroundColor: couleurs.primaire,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  authorName: {
    display: 'block',
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: couleurs.texte,
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