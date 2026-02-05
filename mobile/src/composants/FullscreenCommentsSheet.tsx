/**
 * FullscreenCommentsSheet - Bottom sheet commentaires pour fullscreen video
 * Rendu DANS VideoPlayerModal (pas un Modal séparé)
 * Style Instagram : slide-up, backdrop semi-transparent, video continue
 *
 * STRUCTURE IMPOSÉE:
 * container (absolute fill, align bottom)
 *   backdrop
 *   sheet (hauteur fixe 70%)
 *     header (fixe)
 *     body (flex: 1)
 *       FlatList (flex: 1) + contentContainerStyle paddingBottom
 *     composer (absolute bottom)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { couleurs, espacements, rayons } from '../constantes/theme';
import {
  Commentaire,
  getCommentaires,
  ajouterCommentaire,
  toggleLikeCommentaire,
} from '../services/publications';
import Avatar from './Avatar';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7; // 70% de l'écran
const HEADER_HEIGHT = 56;
const COMPOSER_HEIGHT = 60;

// Type local qui étend Commentaire avec id (normalisé depuis _id)
type CommentaireUI = Commentaire & { id: string; reponses?: CommentaireUI[] };

interface FullscreenCommentsSheetProps {
  postId: string | null;
  visible: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function FullscreenCommentsSheet({
  postId,
  visible,
  onClose,
  onCommentAdded,
}: FullscreenCommentsSheetProps) {
  const insets = useSafeAreaInsets();
  // Safe bottom : au moins 12px, sinon insets.bottom (pour Android navbar + iOS home indicator)
  const safeBottom = Math.max(insets.bottom, 12);

  const [commentaires, setCommentaires] = useState<CommentaireUI[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; auteur: string } | null>(null);

  // Keyboard height pour positionnement cross-platform
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Animation slide-up
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Keyboard listeners (cross-platform)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onKeyboardHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Fetch comments quand visible + postId
  useEffect(() => {
    if (visible && postId) {
      fetchComments(postId);
    }
  }, [visible, postId]);

  // Reset quand on ferme
  useEffect(() => {
    if (!visible) {
      setCommentaires([]);
      setErreur(null);
      setNewComment('');
      setReplyingTo(null);
    }
  }, [visible]);

  // Animation d'ouverture/fermeture
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const fetchComments = async (id: string) => {
    setChargement(true);
    setErreur(null);
    try {
      const response = await getCommentaires(id);
      // API retourne ReponseAPI<{ commentaires, pagination }>
      // Commentaire utilise _id, on normalise vers id pour l'UI
      if (response.succes && response.data?.commentaires) {
        const normalized: CommentaireUI[] = response.data.commentaires.map(c => ({
          ...c,
          id: c._id,
          reponses: c.reponses?.map(r => ({ ...r, id: r._id })) as CommentaireUI[] | undefined,
        }));
        setCommentaires(normalized);
      } else {
        setCommentaires([]);
      }
    } catch (err) {
      console.error('[COMMENTS] Fetch error:', err);
      setErreur('Impossible de charger les commentaires');
      setCommentaires([]);
    } finally {
      setChargement(false);
    }
  };

  const handleEnvoyerCommentaire = async () => {
    if (!newComment.trim() || !postId || envoi) return;

    setEnvoi(true);
    const texte = newComment.trim();
    setNewComment(''); // Clear immédiatement pour UX

    try {
      const response = await ajouterCommentaire(
        postId,
        texte,
        replyingTo?.id
      );

      // API retourne ReponseAPI<{ commentaire: Commentaire }>
      if (!response.succes || !response.data?.commentaire) {
        throw new Error('Erreur lors de l\'ajout du commentaire');
      }

      // Normaliser _id vers id (nouveau commentaire n'a pas de réponses)
      const nouveauCommentaire: CommentaireUI = {
        ...response.data.commentaire,
        id: response.data.commentaire._id,
        reponses: [], // Nouveau commentaire = pas de réponses
      };

      if (replyingTo) {
        setCommentaires(prev =>
          prev.map(c =>
            c.id === replyingTo.id
              ? { ...c, reponses: [...(c.reponses || []), nouveauCommentaire] } as CommentaireUI
              : c
          )
        );
      } else {
        setCommentaires(prev => [nouveauCommentaire, ...prev]);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }

      setReplyingTo(null);
      Keyboard.dismiss();
      onCommentAdded?.();
    } catch (err) {
      console.error('[COMMENTS] Add error:', err);
      // Restore le texte si erreur
      setNewComment(texte);
    } finally {
      setEnvoi(false);
    }
  };

  const handleLikeComment = async (commentId: string, isReply: boolean, parentId?: string) => {
    if (!postId) return;
    try {
      await toggleLikeCommentaire(postId, commentId);

      if (isReply && parentId) {
        setCommentaires(prev =>
          prev.map(c =>
            c.id === parentId
              ? {
                  ...c,
                  reponses: (c.reponses as CommentaireUI[] | undefined)?.map(r =>
                    r.id === commentId
                      ? { ...r, aLike: !r.aLike, nbLikes: r.aLike ? r.nbLikes - 1 : r.nbLikes + 1 }
                      : r
                  ),
                } as CommentaireUI
              : c
          )
        );
      } else {
        setCommentaires(prev =>
          prev.map(c =>
            c.id === commentId
              ? { ...c, aLike: !c.aLike, nbLikes: c.aLike ? c.nbLikes - 1 : c.nbLikes + 1 }
              : c
          )
        );
      }
    } catch {
      // Silent
    }
  };

  const handleReply = (commentId: string, auteurNom: string) => {
    setReplyingTo({ id: commentId, auteur: auteurNom });
    inputRef.current?.focus();
  };

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setReplyingTo(null);
    onClose();
  }, [onClose]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderCommentaire = ({ item }: { item: CommentaireUI }) => (
    <View style={styles.commentContainer}>
      <Avatar uri={item.auteur.avatar} taille={36} nom={item.auteur.nom} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{item.auteur.nom}</Text>
          <Text style={styles.commentDate}>{formatDate(item.dateCreation)}</Text>
        </View>
        <Text style={styles.commentText}>{item.contenu}</Text>
        <View style={styles.commentActions}>
          <Pressable
            style={styles.commentActionBtn}
            onPress={() => handleLikeComment(item.id, false)}
          >
            <Ionicons
              name={item.aLike ? 'heart' : 'heart-outline'}
              size={14}
              color={item.aLike ? '#FF3B5C' : '#999'}
            />
            {item.nbLikes > 0 && (
              <Text style={[styles.commentActionText, item.aLike && { color: '#FF3B5C' }]}>
                {item.nbLikes}
              </Text>
            )}
          </Pressable>
          <Pressable style={styles.commentActionBtn} onPress={() => handleReply(item.id, item.auteur.nom)}>
            <Text style={styles.commentActionText}>Répondre</Text>
          </Pressable>
        </View>

        {/* Réponses */}
        {item.reponses && item.reponses.length > 0 && (
          <View style={styles.repliesContainer}>
            {(item.reponses as CommentaireUI[]).map((reponse) => (
              <View key={reponse.id} style={styles.replyContainer}>
                <Avatar uri={reponse.auteur.avatar} taille={28} nom={reponse.auteur.nom} />
                <View style={styles.replyContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.replyAuthor}>{reponse.auteur.nom}</Text>
                    <Text style={styles.commentDate}>{formatDate(reponse.dateCreation)}</Text>
                  </View>
                  <Text style={styles.replyText}>{reponse.contenu}</Text>
                  <View style={styles.commentActions}>
                    <Pressable
                      style={styles.commentActionBtn}
                      onPress={() => handleLikeComment(reponse.id, true, item.id)}
                    >
                      <Ionicons
                        name={reponse.aLike ? 'heart' : 'heart-outline'}
                        size={12}
                        color={reponse.aLike ? '#FF3B5C' : '#999'}
                      />
                      {reponse.nbLikes > 0 && (
                        <Text style={[styles.commentActionText, { fontSize: 11 }, reponse.aLike && { color: '#FF3B5C' }]}>
                          {reponse.nbLikes}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  // Si pas visible, ne rien rendre
  if (!visible) return null;

  // Calcul du bottomOffset pour le composer
  // Si clavier ouvert : keyboardHeight, sinon safeBottom
  const bottomOffset = keyboardHeight > 0 ? keyboardHeight : safeBottom;

  // Padding bottom pour la FlatList : composer + offset + marge
  const listPaddingBottom = COMPOSER_HEIGHT + bottomOffset + 16;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Backdrop - tap pour fermer */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Header fixe */}
        <View style={styles.sheetHeader}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Commentaires</Text>
            <Pressable onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Body - contient la liste (flex: 1) */}
        <View style={styles.body}>
          {chargement ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={couleurs.primaire} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : erreur ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
              <Text style={styles.errorText}>{erreur}</Text>
              <Pressable style={styles.retryBtn} onPress={() => postId && fetchComments(postId)}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : commentaires.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubble-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>Aucun commentaire</Text>
              <Text style={styles.emptySubtext}>Soyez le premier à commenter</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={commentaires}
              renderItem={renderCommentaire}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={{
                paddingHorizontal: espacements.md,
                paddingTop: espacements.md,
                paddingBottom: listPaddingBottom,
                flexGrow: 1,
              }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            />
          )}
        </View>

        {/* Composer - position absolute au bas */}
        <View style={[styles.composer, { bottom: bottomOffset }]}>
          {replyingTo && (
            <View style={styles.replyingBanner}>
              <Text style={styles.replyingText}>
                Réponse à <Text style={styles.replyingName}>{replyingTo.auteur}</Text>
              </Text>
              <Pressable onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </Pressable>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor="#888"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              blurOnSubmit={false}
            />
            <Pressable
              style={[styles.sendButton, (!newComment.trim() || envoi) && styles.sendButtonDisabled]}
              onPress={handleEnvoyerCommentaire}
              disabled={!newComment.trim() || envoi}
            >
              {envoi ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#1A1A1A', // Fond opaque sombre
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    height: HEADER_HEIGHT,
    paddingTop: espacements.xs,
    paddingHorizontal: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#1A1A1A',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: espacements.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  list: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
  },
  loadingText: {
    marginTop: espacements.md,
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    marginTop: espacements.md,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: espacements.md,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyText: {
    marginTop: espacements.md,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptySubtext: {
    marginTop: espacements.xs,
    fontSize: 14,
    color: '#999',
  },
  commentContainer: {
    flexDirection: 'row',
    marginBottom: espacements.md,
    gap: espacements.sm,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentDate: {
    fontSize: 11,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#EEEEEE',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.md,
    marginTop: espacements.xs,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: espacements.sm,
    marginLeft: espacements.xs,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.15)',
    paddingLeft: espacements.sm,
  },
  replyContainer: {
    flexDirection: 'row',
    gap: espacements.xs,
    marginBottom: espacements.sm,
  },
  replyContent: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  replyText: {
    fontSize: 13,
    color: '#EEEEEE',
    lineHeight: 18,
  },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: espacements.md,
    paddingTop: espacements.sm,
    paddingBottom: espacements.sm,
  },
  replyingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.xs,
    paddingVertical: 4,
    paddingHorizontal: espacements.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: rayons.sm,
  },
  replyingText: {
    fontSize: 12,
    color: '#999',
  },
  replyingName: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espacements.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: espacements.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: '#FFFFFF',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.primaire,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
