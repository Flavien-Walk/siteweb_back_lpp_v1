/**
 * CommentsOverlay - Overlay commentaires style Instagram
 * S'affiche par-dessus le player vidéo fullscreen sans l'interrompre
 * Bottom sheet animé avec liste commentaires et champ de saisie
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
  Keyboard,
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
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.65; // 65% de l'écran

interface CommentsOverlayProps {
  /** ID du post pour charger les commentaires */
  postId: string | null;
  /** Overlay visible */
  visible: boolean;
  /** Callback pour fermer l'overlay */
  onClose: () => void;
  /** Callback quand un commentaire est ajouté (pour mettre à jour le count) */
  onCommentAdded?: () => void;
}

export default function CommentsOverlay({
  postId,
  visible,
  onClose,
  onCommentAdded,
}: CommentsOverlayProps) {
  const insets = useSafeAreaInsets();
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [chargement, setChargement] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; auteur: string } | null>(null);

  // Animation slide-up
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const inputRef = useRef<TextInput>(null);

  // State lock pour éviter fermeture accidentelle lors de la fermeture du fullscreen
  const openedAtRef = useRef<number>(0);
  const LOCK_DURATION = 500; // ms - empêche fermeture pendant ce délai après ouverture

  // Charger les commentaires quand visible et postId change
  useEffect(() => {
    if (visible && postId) {
      console.log('[COMMENTS_OVERLAY] Loading comments for postId=', postId);
      chargerCommentaires();
    }
  }, [visible, postId]);

  // Animation d'ouverture/fermeture + state lock
  useEffect(() => {
    if (visible) {
      openedAtRef.current = Date.now();
      console.log('[COMMENTS_OVERLAY] visible=true, lock engaged');
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
  }, [visible]);

  const chargerCommentaires = async () => {
    if (!postId) return;

    try {
      setChargement(true);
      const reponse = await getCommentaires(postId);
      if (reponse.succes && reponse.data) {
        setCommentaires(reponse.data.commentaires);
      }
    } catch (error) {
      console.error('[COMMENTS_OVERLAY] Error loading comments:', error);
    } finally {
      setChargement(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !postId || envoi) return;

    try {
      setEnvoi(true);
      const reponse = await ajouterCommentaire(postId, newComment.trim(), replyingTo?.id);
      if (reponse.succes && reponse.data) {
        // Ajouter le nouveau commentaire à la liste
        if (replyingTo) {
          // Ajouter comme réponse
          setCommentaires(prev => prev.map(c => {
            if (c._id === replyingTo.id) {
              return {
                ...c,
                reponses: [...(c.reponses || []), reponse.data!.commentaire],
              };
            }
            return c;
          }));
        } else {
          // Ajouter en tête de liste
          setCommentaires(prev => [reponse.data!.commentaire, ...prev]);
        }
        setNewComment('');
        setReplyingTo(null);
        Keyboard.dismiss();
        onCommentAdded?.();
      }
    } catch (error) {
      console.error('[COMMENTS_OVERLAY] Error adding comment:', error);
    } finally {
      setEnvoi(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!postId) return;

    try {
      const reponse = await toggleLikeCommentaire(postId, commentId);
      if (reponse.succes) {
        setCommentaires(prev => prev.map(c => {
          if (c._id === commentId) {
            return {
              ...c,
              aLike: !c.aLike,
              nbLikes: c.aLike ? c.nbLikes - 1 : c.nbLikes + 1,
            };
          }
          // Vérifier dans les réponses
          if (c.reponses) {
            return {
              ...c,
              reponses: c.reponses.map(r => {
                if (r._id === commentId) {
                  return {
                    ...r,
                    aLike: !r.aLike,
                    nbLikes: r.aLike ? r.nbLikes - 1 : r.nbLikes + 1,
                  };
                }
                return r;
              }),
            };
          }
          return c;
        }));
      }
    } catch (error) {
      console.error('[COMMENTS_OVERLAY] Error liking comment:', error);
    }
  };

  const handleReply = (commentId: string, auteurNom: string) => {
    setReplyingTo({ id: commentId, auteur: auteurNom });
    inputRef.current?.focus();
  };

  const handleClose = useCallback(() => {
    // State lock : empêcher fermeture accidentelle pendant LOCK_DURATION après ouverture
    const timeSinceOpen = Date.now() - openedAtRef.current;
    if (timeSinceOpen < LOCK_DURATION) {
      console.log('[COMMENTS_OVERLAY] Close blocked (lock active, wait', LOCK_DURATION - timeSinceOpen, 'ms)');
      return;
    }
    console.log('[COMMENTS_OVERLAY] closing');
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

    if (diffMins < 1) return 'maintenant';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderCommentaire = ({ item }: { item: Commentaire }) => {
    const auteurNom = `${item.auteur.prenom} ${item.auteur.nom}`;

    return (
      <View style={styles.commentItem}>
        <Avatar
          uri={item.auteur.avatar}
          nom={auteurNom}
          taille={36}
        />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>{auteurNom}</Text>
            <Text style={styles.commentDate}>{formatDate(item.dateCreation)}</Text>
          </View>
          <Text style={styles.commentText}>{item.contenu}</Text>
          <View style={styles.commentActions}>
            <Pressable
              style={styles.commentActionBtn}
              onPress={() => handleLikeComment(item._id)}
            >
              <Ionicons
                name={item.aLike ? 'heart' : 'heart-outline'}
                size={16}
                color={item.aLike ? '#FF3B5C' : '#888'}
              />
              {item.nbLikes > 0 && (
                <Text style={[styles.commentActionText, item.aLike && { color: '#FF3B5C' }]}>
                  {item.nbLikes}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={styles.commentActionBtn}
              onPress={() => handleReply(item._id, auteurNom)}
            >
              <Text style={styles.commentReplyText}>Répondre</Text>
            </Pressable>
          </View>

          {/* Réponses */}
          {item.reponses && item.reponses.length > 0 && (
            <View style={styles.repliesContainer}>
              {item.reponses.map(reponse => {
                const reponseAuteur = `${reponse.auteur.prenom} ${reponse.auteur.nom}`;
                return (
                  <View key={reponse._id} style={styles.replyItem}>
                    <Avatar
                      uri={reponse.auteur.avatar}
                      nom={reponseAuteur}
                      taille={28}
                    />
                    <View style={styles.replyContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.replyAuthor}>{reponseAuteur}</Text>
                        <Text style={styles.commentDate}>{formatDate(reponse.dateCreation)}</Text>
                      </View>
                      <Text style={styles.replyText}>{reponse.contenu}</Text>
                      <Pressable
                        style={styles.commentActionBtn}
                        onPress={() => handleLikeComment(reponse._id)}
                      >
                        <Ionicons
                          name={reponse.aLike ? 'heart' : 'heart-outline'}
                          size={14}
                          color={reponse.aLike ? '#FF3B5C' : '#888'}
                        />
                        {reponse.nbLikes > 0 && (
                          <Text style={[styles.commentActionText, { fontSize: 11 }, reponse.aLike && { color: '#FF3B5C' }]}>
                            {reponse.nbLikes}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Note: Pas de early return - le Modal gère lui-même visible
  // Cela évite les problèmes de multi-Modal RN

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop - tap pour fermer */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* Handle + Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Commentaires</Text>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={24} color={couleurs.texte} />
            </Pressable>
          </View>

          {/* Liste des commentaires */}
          {chargement ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={couleurs.primaire} />
            </View>
          ) : commentaires.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={48} color="#888" />
              <Text style={styles.emptyText}>Aucun commentaire</Text>
              <Text style={styles.emptySubtext}>Soyez le premier à commenter</Text>
            </View>
          ) : (
            <FlatList
              data={commentaires}
              renderItem={renderCommentaire}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Zone de saisie */}
          <View style={styles.inputContainer}>
            {replyingTo && (
              <View style={styles.replyingBanner}>
                <Text style={styles.replyingText}>
                  Réponse à <Text style={styles.replyingName}>{replyingTo.auteur}</Text>
                </Text>
                <Pressable onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close-circle" size={18} color="#888" />
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
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  (!newComment.trim() || envoi) && styles.sendBtnDisabled,
                ]}
                onPress={handleAddComment}
                disabled={!newComment.trim() || envoi}
              >
                {envoi ? (
                  <ActivityIndicator size="small" color={couleurs.blanc} />
                ) : (
                  <Ionicons name="send" size={20} color={couleurs.blanc} />
                )}
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: couleurs.fond,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  handle: {
    position: 'absolute',
    top: 8,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  closeBtn: {
    position: 'absolute',
    right: espacements.md,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: couleurs.texte,
    marginTop: espacements.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: espacements.xs,
  },
  listContent: {
    padding: espacements.md,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: espacements.md,
  },
  commentContent: {
    flex: 1,
    marginLeft: espacements.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
  },
  commentDate: {
    fontSize: 12,
    color: '#888',
  },
  commentText: {
    fontSize: 14,
    color: couleurs.texte,
    marginTop: 2,
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
  },
  commentActionText: {
    fontSize: 12,
    color: '#888',
  },
  commentReplyText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: espacements.sm,
    marginLeft: espacements.xs,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 0, 0, 0.1)',
    paddingLeft: espacements.sm,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: espacements.sm,
  },
  replyContent: {
    flex: 1,
    marginLeft: espacements.xs,
  },
  replyAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
  },
  replyText: {
    fontSize: 13,
    color: couleurs.texte,
    marginTop: 2,
    lineHeight: 18,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: couleurs.fond,
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  replyingText: {
    fontSize: 13,
    color: '#888',
  },
  replyingName: {
    fontWeight: '600',
    color: couleurs.texte,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: espacements.md,
    gap: espacements.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: rayons.lg,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    fontSize: 14,
    color: couleurs.texte,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
