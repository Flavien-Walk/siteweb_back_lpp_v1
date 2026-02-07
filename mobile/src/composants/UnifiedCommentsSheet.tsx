/**
 * UnifiedCommentsSheet - Composant unique pour les commentaires
 *
 * Remplace CommentsOverlay et FullscreenCommentsSheet pour une UX cohérente.
 *
 * Modes:
 * - modal: Utilise un Modal RN (pour usage standalone depuis feed/profil)
 * - embedded: Rendu direct dans le parent (pour VideoPlayerModal)
 *
 * Design System:
 * - Hauteur: 70% de l'écran
 * - Animation: Spring slide-up identique partout
 * - Backdrop: Semi-transparent avec tap-to-close
 * - Thème: Auto-adaptatif (dark sur vidéo, light sinon)
 * - Clavier: Layout flex robuste (pas de position:absolute sur le composer)
 *
 * Threads:
 * - Réponses repliées par défaut ("Voir X réponses")
 * - Expand on-demand
 * - Optimistic UI pour les nouvelles réponses
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
  KeyboardAvoidingView,
  Modal,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Activer LayoutAnimation sur Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
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
const SHEET_HEIGHT_READ = SCREEN_HEIGHT * 0.7; // 70% - mode READ (lecture seule)
const SHEET_HEIGHT_WRITE = SCREEN_HEIGHT * 0.95; // 95% - mode WRITE (saisie)
const HEADER_HEIGHT = 56;

// Type local pour normaliser _id vers id
type CommentaireUI = Commentaire & { id: string; reponses?: CommentaireUI[] };

type SheetMode = 'modal' | 'embedded';
type SheetTheme = 'dark' | 'light' | 'auto';

interface UnifiedCommentsSheetProps {
  /** ID du post pour charger les commentaires */
  postId: string | null;
  /** Visibilité du sheet */
  visible: boolean;
  /** Callback de fermeture */
  onClose: () => void;
  /** Callback quand un commentaire est ajouté */
  onCommentAdded?: () => void;
  /** Mode d'affichage: modal (standalone) ou embedded (dans VideoPlayerModal) */
  mode?: SheetMode;
  /** Thème: dark (vidéo), light (feed), auto (détection) */
  theme?: SheetTheme;
  /** Nombre de commentaires initial (pour affichage dans header) */
  initialCount?: number;
  /** Callback quand l'utilisateur commence à taper (mode WRITE) - pour pause vidéo */
  onBeginTyping?: () => void;
  /** Callback quand l'utilisateur arrête de taper (mode READ) - pour resume vidéo */
  onEndTyping?: () => void;
}

export default function UnifiedCommentsSheet({
  postId,
  visible,
  onClose,
  onCommentAdded,
  mode = 'modal',
  theme = 'auto',
  initialCount = 0,
  onBeginTyping,
  onEndTyping,
}: UnifiedCommentsSheetProps) {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 12);

  // États
  const [commentaires, setCommentaires] = useState<CommentaireUI[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; auteur: string } | null>(null);
  const [localCount, setLocalCount] = useState(initialCount);

  // ============================================================
  // MODE READ/WRITE - État de saisie (Instagram/TikTok-like)
  // READ: sheet 70%, vidéo visible + joue
  // WRITE: sheet 95%, vidéo masquée + pause
  // ============================================================
  const [isTyping, setIsTyping] = useState(false);

  // Hauteur dynamique selon le mode
  const currentSheetHeight = isTyping ? SHEET_HEIGHT_WRITE : SHEET_HEIGHT_READ;

  // État des threads expand/collapse - repliés par défaut
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});

  // Animations (slideAnim et backdropOpacity utilisent native driver)
  // La hauteur utilise LayoutAnimation via currentSheetHeight state
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT_READ)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Refs
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const composerRef = useRef<View>(null);
  const openedAtRef = useRef<number>(0);
  const LOCK_DURATION = 500;

  // Déterminer le thème effectif
  const effectiveTheme = theme === 'auto'
    ? (mode === 'embedded' ? 'dark' : 'light')
    : theme;

  // Couleurs basées sur le thème
  const colors = effectiveTheme === 'dark' ? {
    background: '#1A1A1A',
    surface: '#1A1A1A',
    text: '#FFFFFF',
    textSecondary: '#999999',
    border: 'rgba(255,255,255,0.1)',
    inputBg: 'rgba(255,255,255,0.1)',
    backdrop: 'rgba(0,0,0,0.6)',
  } : {
    background: couleurs.fond,
    surface: couleurs.fondCard,
    text: couleurs.texte,
    textSecondary: couleurs.texteSecondaire,
    border: couleurs.bordure,
    inputBg: couleurs.fondInput,
    backdrop: 'rgba(0,0,0,0.5)',
  };

  // Sync localCount avec initialCount
  useEffect(() => {
    setLocalCount(initialCount);
  }, [initialCount]);

  // ============================================================
  // MODE TRANSITIONS - READ <-> WRITE (avec LayoutAnimation pour la hauteur)
  // ============================================================
  const enterWriteMode = useCallback(() => {
    if (isTyping) return; // Déjà en WRITE mode

    if (__DEV__) {
      console.log('📝 [COMMENTS] Entering WRITE mode (sheet 95%)');
    }

    // Animation fluide pour le changement de hauteur
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        250,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.scaleY
      )
    );
    setIsTyping(true);

    // Notifier le parent (pour pause vidéo)
    onBeginTyping?.();
  }, [isTyping, onBeginTyping]);

  const exitWriteMode = useCallback(() => {
    if (!isTyping) return; // Déjà en READ mode

    if (__DEV__) {
      console.log('📖 [COMMENTS] Entering READ mode (sheet 70%)');
    }

    // Animation fluide pour le changement de hauteur
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        250,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.scaleY
      )
    );
    setIsTyping(false);

    // Notifier le parent (pour resume vidéo)
    onEndTyping?.();
  }, [isTyping, onEndTyping]);

  // Reset mode quand le sheet se ferme
  useEffect(() => {
    if (!visible && isTyping) {
      setIsTyping(false);
    }
  }, [visible, isTyping]);

  // ============================================================
  // KEYBOARD HANDLER - Scroll vers le bas quand le clavier apparaît
  // ============================================================
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

    const onShow = () => {
      // Scroll la liste vers le bas pour voir les derniers commentaires
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);

    return () => {
      showSub.remove();
    };
  }, []);

  // Fetch comments
  useEffect(() => {
    if (visible && postId) {
      fetchComments(postId);
    }
  }, [visible, postId]);

  // Reset on close
  useEffect(() => {
    if (!visible) {
      setCommentaires([]);
      setErreur(null);
      setNewComment('');
      setReplyingTo(null);
      setExpandedThreads({}); // Reset expand state
    }
  }, [visible]);

  // Animation open/close
  useEffect(() => {
    if (visible) {
      openedAtRef.current = Date.now();
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
          toValue: SHEET_HEIGHT_READ,
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
      if (response.succes && response.data?.commentaires) {
        const normalized: CommentaireUI[] = response.data.commentaires.map(c => ({
          ...c,
          id: c._id,
          reponses: c.reponses?.map(r => ({ ...r, id: r._id })) as CommentaireUI[] | undefined,
        }));
        setCommentaires(normalized);
        // Calculer le total = parents + toutes les réponses
        const totalCount = normalized.reduce((acc, c) => acc + 1 + (c.reponses?.length || 0), 0);
        setLocalCount(totalCount);
      } else {
        setCommentaires([]);
        setLocalCount(0);
      }
    } catch (err) {
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
    setNewComment('');
    const wasReplyingTo = replyingTo;

    try {
      const response = await ajouterCommentaire(postId, texte, replyingTo?.id);

      if (!response.succes || !response.data?.commentaire) {
        throw new Error('Erreur lors de l\'ajout du commentaire');
      }

      const nouveauCommentaire: CommentaireUI = {
        ...response.data.commentaire,
        id: response.data.commentaire._id,
        reponses: [],
      };

      if (wasReplyingTo) {
        // Ajouter la réponse au parent
        setCommentaires(prev =>
          prev.map(c =>
            c.id === wasReplyingTo.id
              ? { ...c, reponses: [...(c.reponses || []), nouveauCommentaire] } as CommentaireUI
              : c
          )
        );
        // Incrémenter le total
        setLocalCount(prev => prev + 1);
      } else {
        setCommentaires(prev => [nouveauCommentaire, ...prev]);
        setLocalCount(prev => prev + 1);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }

      setReplyingTo(null);
      Keyboard.dismiss();
      onCommentAdded?.();
    } catch (err) {
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
      // Silent fail
    }
  };

  const handleReply = (commentId: string, auteurNom: string) => {
    setReplyingTo({ id: commentId, auteur: auteurNom });
    inputRef.current?.focus();
  };

  // Toggle thread expand/collapse
  const toggleThread = useCallback((commentId: string) => {
    setExpandedThreads(prev => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }, []);

  const handleClose = useCallback(() => {
    const timeSinceOpen = Date.now() - openedAtRef.current;
    if (timeSinceOpen < LOCK_DURATION) {
      return; // Anti-fermeture accidentelle
    }
    Keyboard.dismiss();
    setReplyingTo(null);
    // Revenir en mode READ avant de fermer (pour resume vidéo)
    if (isTyping) {
      exitWriteMode();
    }
    onClose();
  }, [onClose, isTyping, exitWriteMode]);

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

  const renderCommentaire = ({ item }: { item: CommentaireUI }) => {
    const repliesCount = item.reponses?.length || 0;
    const isExpanded = expandedThreads[item.id] || false;

    return (
      <View style={styles.commentContainer}>
        <Avatar uri={item.auteur.avatar} taille={36} nom={item.auteur.nom} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={[styles.commentAuthor, { color: colors.text }]}>{item.auteur.nom}</Text>
            <Text style={[styles.commentDate, { color: colors.textSecondary }]}>
              {formatDate(item.dateCreation)}
            </Text>
          </View>
          <Text style={[styles.commentText, { color: colors.text }]}>{item.contenu}</Text>
          <View style={styles.commentActions}>
            <Pressable
              style={styles.commentActionBtn}
              onPress={() => handleLikeComment(item.id, false)}
            >
              <Ionicons
                name={item.aLike ? 'heart' : 'heart-outline'}
                size={14}
                color={item.aLike ? '#FF3B5C' : colors.textSecondary}
              />
              {item.nbLikes > 0 && (
                <Text style={[styles.commentActionText, { color: item.aLike ? '#FF3B5C' : colors.textSecondary }]}>
                  {item.nbLikes}
                </Text>
              )}
            </Pressable>
            <Pressable style={styles.commentActionBtn} onPress={() => handleReply(item.id, item.auteur.nom)}>
              <Text style={[styles.commentActionText, { color: colors.textSecondary }]}>Répondre</Text>
            </Pressable>
          </View>

          {/* Bouton "Voir X réponses" - repliées par défaut */}
          {repliesCount > 0 && !isExpanded && (
            <Pressable
              style={styles.viewRepliesBtn}
              onPress={() => toggleThread(item.id)}
            >
              <View style={[styles.replyLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.viewRepliesText, { color: colors.textSecondary }]}>
                Voir {repliesCount} réponse{repliesCount > 1 ? 's' : ''}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
            </Pressable>
          )}

          {/* Réponses - affichées uniquement si expanded */}
          {repliesCount > 0 && isExpanded && (
            <View style={[styles.repliesContainer, { borderLeftColor: colors.border }]}>
              {/* Bouton masquer */}
              <Pressable
                style={styles.hideRepliesBtn}
                onPress={() => toggleThread(item.id)}
              >
                <Text style={[styles.hideRepliesText, { color: colors.textSecondary }]}>
                  Masquer les réponses
                </Text>
                <Ionicons name="chevron-up" size={14} color={colors.textSecondary} />
              </Pressable>

              {(item.reponses as CommentaireUI[]).map((reponse) => (
                <View key={reponse.id} style={styles.replyContainer}>
                  <Avatar uri={reponse.auteur.avatar} taille={28} nom={reponse.auteur.nom} />
                  <View style={styles.replyContent}>
                    <View style={styles.commentHeader}>
                      <Text style={[styles.replyAuthor, { color: colors.text }]}>{reponse.auteur.nom}</Text>
                      <Text style={[styles.commentDate, { color: colors.textSecondary }]}>
                        {formatDate(reponse.dateCreation)}
                      </Text>
                    </View>
                    <Text style={[styles.replyText, { color: colors.text }]}>{reponse.contenu}</Text>
                    <View style={styles.commentActions}>
                      <Pressable
                        style={styles.commentActionBtn}
                        onPress={() => handleLikeComment(reponse.id, true, item.id)}
                      >
                        <Ionicons
                          name={reponse.aLike ? 'heart' : 'heart-outline'}
                          size={12}
                          color={reponse.aLike ? '#FF3B5C' : colors.textSecondary}
                        />
                        {reponse.nbLikes > 0 && (
                          <Text style={[styles.commentActionText, { fontSize: 11, color: reponse.aLike ? '#FF3B5C' : colors.textSecondary }]}>
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
  };

  // ============================================================
  // INNER CONTENT - Structure avec KeyboardAvoidingView
  // Header (hauteur fixe) + Body (flex:1) + Composer
  // KeyboardAvoidingView gère le clavier sur iOS et Android
  // ============================================================
  const sheetInnerContent = (
    <KeyboardAvoidingView
      style={styles.sheetInner}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.sheetHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={[styles.handle, { backgroundColor: effectiveTheme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.2)' }]} />
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Commentaires{localCount > 0 ? ` (${localCount})` : ''}
          </Text>
          <Pressable onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Body - flex:1, prend tout l'espace restant */}
      <View style={[styles.body, { backgroundColor: colors.background }]}>
        {chargement ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={couleurs.primaire} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
          </View>
        ) : erreur ? (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
            <Text style={[styles.errorText, { color: '#FF6B6B' }]}>{erreur}</Text>
            <Pressable style={styles.retryBtn} onPress={() => postId && fetchComments(postId)}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : commentaires.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="chatbubble-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Aucun commentaire</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Soyez le premier à commenter</Text>
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
              paddingBottom: espacements.md,
            }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}
      </View>

      {/* Composer - EN BAS dans le flux normal */}
      <View
        ref={composerRef}
        style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: safeBottom + 12 }]}
      >
        {replyingTo && (
          <View style={[styles.replyingBanner, { backgroundColor: effectiveTheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.replyingText, { color: colors.textSecondary }]}>
              Réponse à <Text style={[styles.replyingName, { color: colors.text }]}>{replyingTo.auteur}</Text>
            </Text>
            <Pressable onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }]}
            placeholder="Ajouter un commentaire..."
            placeholderTextColor={colors.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
            blurOnSubmit={false}
            // Focus → mode WRITE (sheet 95%, pause vidéo)
            onFocus={() => {
              enterWriteMode();
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 150);
            }}
            // Blur → mode READ (sheet 70%, resume vidéo)
            onBlur={() => {
              exitWriteMode();
            }}
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
    </KeyboardAvoidingView>
  );

  // ============================================================
  // CONTENU DU SHEET - wrapper avec backdrop
  // ============================================================
  const sheetContent = (
    <View style={[styles.container, mode === 'embedded' && styles.containerEmbedded]} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, backgroundColor: colors.backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet animé - hauteur dynamique READ (70%) / WRITE (95%) via LayoutAnimation */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            transform: [{ translateY: slideAnim }],
            height: currentSheetHeight, // Hauteur state-based, animée via LayoutAnimation
          },
        ]}
      >
        {/* Contenu du sheet */}
        {sheetInnerContent}
      </Animated.View>
    </View>
  );

  // ============================================================
  // RENDER FINAL
  // ============================================================
  if (mode === 'modal') {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        {sheetContent}
      </Modal>
    );
  }

  // Mode embedded: rendu direct (pour VideoPlayerModal)
  if (!visible) return null;
  return sheetContent;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'flex-end',
  },
  containerEmbedded: {
    // Pas de différence pour l'instant
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    // height est définie dynamiquement via currentSheetHeight + LayoutAnimation (70% READ, 95% WRITE)
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  // ============================================================
  // LAYOUT FLEX + translateY Android pour clavier
  // ============================================================
  sheetInner: {
    flex: 1,
    // Structure: Header + Body(flex:1) + Composer
  },
  sheetHeader: {
    height: HEADER_HEIGHT,
    paddingTop: espacements.xs,
    paddingHorizontal: espacements.md,
    borderBottomWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
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
  },
  body: {
    flex: 1, // Prend tout l'espace entre header et composer
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
  },
  errorText: {
    marginTop: espacements.md,
    fontSize: 14,
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
  },
  emptySubtext: {
    marginTop: espacements.xs,
    fontSize: 14,
  },
  // ============================================================
  // COMPOSER - EN BAS DANS LE FLUX, PAS ABSOLUTE
  // ============================================================
  composer: {
    // PAS de position: absolute !
    borderTopWidth: 1,
    paddingHorizontal: espacements.md,
    paddingTop: espacements.sm,
    // paddingBottom dynamique via safeBottom dans le style inline
  },
  replyingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.xs,
    paddingVertical: 4,
    paddingHorizontal: espacements.sm,
    borderRadius: rayons.sm,
  },
  replyingText: {
    fontSize: 12,
  },
  replyingName: {
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espacements.sm,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: espacements.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
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
  // ============================================================
  // COMMENTAIRES
  // ============================================================
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
  },
  commentDate: {
    fontSize: 11,
  },
  commentText: {
    fontSize: 14,
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
    fontWeight: '500',
  },
  // Bouton "Voir X réponses"
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: espacements.sm,
    paddingVertical: espacements.xs,
    gap: espacements.xs,
  },
  replyLine: {
    width: 24,
    height: 1,
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Bouton "Masquer les réponses"
  hideRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.xs,
    marginBottom: espacements.xs,
    gap: espacements.xs,
  },
  hideRepliesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Réponses
  repliesContainer: {
    marginTop: espacements.sm,
    marginLeft: espacements.xs,
    borderLeftWidth: 1,
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
  },
  replyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
