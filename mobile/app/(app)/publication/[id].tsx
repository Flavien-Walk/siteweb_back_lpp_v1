/**
 * Page Detail Publication - Vue detaillee avec commentaires
 * Style Instagram : media en grand, likes, commentaires
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { espacements, rayons, typographie } from '../../../src/constantes/theme';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useUser } from '../../../src/contexts/UserContext';
import {
  Publication,
  Commentaire,
  getPublication,
  toggleLikePublication,
  getCommentaires,
  ajouterCommentaire,
  toggleLikeCommentaire,
  supprimerCommentaire,
  modifierCommentaire,
} from '../../../src/services/publications';
import Avatar from '../../../src/composants/Avatar';
import LikeButton, { LikeButtonCompact } from '../../../src/composants/LikeButton';
import AnimatedPressable from '../../../src/composants/AnimatedPressable';
import VideoPlayerModal from '../../../src/composants/VideoPlayerModal';
import PostMediaCarousel from '../../../src/composants/PostMediaCarousel';
import { sharePublication } from '../../../src/services/activity';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PublicationDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();

  // Etats
  const [publication, setPublication] = useState<Publication | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rafraichissement, setRafraichissement] = useState(false);

  // Etats like
  const [liked, setLiked] = useState(false);
  const [nbLikes, setNbLikes] = useState(0);

  // Etats commentaires
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [chargementCommentaires, setChargementCommentaires] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; auteur: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Etat modal video
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  // Etat composer commentaire (visible seulement quand ouvert)
  const [isCommentComposerOpen, setIsCommentComposerOpen] = useState(false);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);

  // Charger la publication
  const chargerPublication = useCallback(async (refresh = false) => {
    if (!id) return;

    if (refresh) {
      setRafraichissement(true);
    } else {
      setChargement(true);
    }
    setErreur(null);

    try {
      const reponse = await getPublication(id);
      if (reponse.succes && reponse.data) {
        setPublication(reponse.data.publication);
        setLiked(reponse.data.publication.aLike);
        setNbLikes(reponse.data.publication.nbLikes);
      } else {
        setErreur(reponse.message || 'Publication introuvable');
      }
    } catch (error) {
      setErreur('Erreur de connexion');
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [id]);

  // Charger les commentaires
  const chargerCommentaires = useCallback(async () => {
    if (!id) return;

    setChargementCommentaires(true);
    try {
      const reponse = await getCommentaires(id);
      if (reponse.succes && reponse.data) {
        setCommentaires(reponse.data.commentaires);
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    } finally {
      setChargementCommentaires(false);
    }
  }, [id]);

  useEffect(() => {
    chargerPublication();
    chargerCommentaires();
  }, [chargerPublication, chargerCommentaires]);

  // Formater la date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "A l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  // Gestion du like
  const handleLike = async () => {
    if (!publication) return;

    try {
      const newLiked = !liked;
      setLiked(newLiked);
      setNbLikes((prev) => (newLiked ? prev + 1 : prev - 1));

      const reponse = await toggleLikePublication(publication._id);
      if (reponse.succes && reponse.data) {
        setLiked(reponse.data.aLike);
        setNbLikes(reponse.data.nbLikes);
      }
    } catch (error) {
      setLiked(!liked);
      setNbLikes(publication.nbLikes);
    }
  };

  // Ouvrir le composer de commentaire
  const openCommentComposer = useCallback(() => {
    setIsCommentComposerOpen(true);
    // Scroll vers les commentaires + focus input après un court délai
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
      commentInputRef.current?.focus();
    }, 150);
  }, []);

  // Fermer le composer de commentaire
  const closeCommentComposer = useCallback(() => {
    Keyboard.dismiss();
    setIsCommentComposerOpen(false);
    setNewComment('');
    setReplyingTo(null);
  }, []);

  // Partager la publication (utilise le service centralisé avec gestion iOS/Android)
  const handleShare = async () => {
    if (!publication) return;

    const auteurNom = `${publication.auteur.prenom} ${publication.auteur.nom}`;
    const result = await sharePublication(publication._id, auteurNom, publication.contenu);

    if (result.error) {
      Alert.alert('Erreur', 'Impossible de partager ce contenu');
    }
  };

  // Ajouter un commentaire
  const handleAddComment = async () => {
    if (!newComment.trim() || !publication) return;

    try {
      const reponse = await ajouterCommentaire(publication._id, newComment.trim(), replyingTo?.id);
      if (reponse.succes && reponse.data) {
        if (replyingTo) {
          setCommentaires((prev) =>
            prev.map((c) => {
              if (c._id === replyingTo.id) {
                return { ...c, reponses: [...(c.reponses || []), reponse.data!.commentaire] };
              }
              return c;
            })
          );
          setExpandedReplies((prev) => ({ ...prev, [replyingTo.id]: true }));
        } else {
          setCommentaires((prev) => [reponse.data!.commentaire, ...prev]);
        }
        setNewComment('');
        setReplyingTo(null);
        // Fermer le composer après envoi
        Keyboard.dismiss();
        setIsCommentComposerOpen(false);
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'ajouter le commentaire");
    }
  };

  // Like un commentaire
  const handleLikeComment = async (commentId: string) => {
    if (!publication) return;

    try {
      const reponse = await toggleLikeCommentaire(publication._id, commentId);
      if (reponse.succes && reponse.data) {
        setCommentaires((prev) =>
          prev.map((c) => {
            if (c._id === commentId) {
              return { ...c, aLike: reponse.data!.aLike, nbLikes: reponse.data!.nbLikes };
            }
            if (c.reponses) {
              return {
                ...c,
                reponses: c.reponses.map((r) =>
                  r._id === commentId ? { ...r, aLike: reponse.data!.aLike, nbLikes: reponse.data!.nbLikes } : r
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (error) {
      console.error('Erreur like commentaire:', error);
    }
  };

  // Modifier un commentaire
  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim() || !publication) return;

    try {
      const reponse = await modifierCommentaire(publication._id, commentId, editingContent.trim());
      if (reponse.succes && reponse.data) {
        setCommentaires((prev) =>
          prev.map((c) => {
            if (c._id === commentId) {
              return { ...c, contenu: reponse.data!.commentaire.contenu, modifie: true };
            }
            if (c.reponses) {
              return {
                ...c,
                reponses: c.reponses.map((r) =>
                  r._id === commentId ? { ...r, contenu: reponse.data!.commentaire.contenu, modifie: true } : r
                ),
              };
            }
            return c;
          })
        );
        setEditingComment(null);
        setEditingContent('');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le commentaire');
    }
  };

  // Supprimer un commentaire
  const handleDeleteComment = async (commentId: string, isReply = false, parentId?: string) => {
    if (!publication) return;

    Alert.alert('Supprimer le commentaire', 'Voulez-vous vraiment supprimer ce commentaire ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const reponse = await supprimerCommentaire(publication._id, commentId);
            if (reponse.succes) {
              if (isReply && parentId) {
                setCommentaires((prev) =>
                  prev.map((c) => {
                    if (c._id === parentId) {
                      return { ...c, reponses: c.reponses?.filter((r) => r._id !== commentId) };
                    }
                    return c;
                  })
                );
              } else {
                setCommentaires((prev) => prev.filter((c) => c._id !== commentId));
              }
            }
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer le commentaire');
          }
        },
      },
    ]);
  };

  const isMyComment = (auteurId: string) => utilisateur && utilisateur.id === auteurId;
  const isAdmin = () => utilisateur && utilisateur.role === 'admin';

  // Navigation vers profil utilisateur (mon profil ou profil public)
  const naviguerVersProfil = useCallback((userId?: string) => {
    if (!userId) {
      console.warn('naviguerVersProfil: userId manquant');
      return;
    }
    // Si c'est mon profil, aller sur /profil
    if (utilisateur && utilisateur.id === userId) {
      router.push('/(app)/profil');
    } else {
      // Sinon, aller sur le profil public
      router.push({
        pathname: '/(app)/utilisateur/[id]',
        params: { id: userId },
      });
    }
  }, [utilisateur, router]);

  // Navigation vers profil auteur de la publication
  const naviguerVersProfilAuteur = () => {
    if (publication) {
      naviguerVersProfil(publication.auteur._id);
    }
  };

  // Determiner si le media est une video
  const isVideo = (url?: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '/video/'];
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  // Generer une thumbnail Cloudinary pour les videos
  const getVideoThumbnail = (videoUrl: string): string => {
    if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/upload/')) {
      return videoUrl
        .replace('/video/upload/', '/video/upload/so_0,w_600,h_600,c_limit,f_jpg/')
        .replace(/\.(mp4|mov|webm|avi)$/i, '.jpg');
    }
    return videoUrl;
  };

  // Styles dynamiques
  const styles = createStyles(couleurs);

  // Loading
  if (chargement) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={styles.headerTitle}>Publication</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      </View>
    );
  }

  // Erreur
  if (erreur || !publication) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={styles.headerTitle}>Publication</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={couleurs.texteSecondaire} />
          <Text style={styles.errorText}>{erreur || 'Publication introuvable'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => chargerPublication()}>
            <Text style={styles.retryBtnText}>Reessayer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const auteurNom = `${publication.auteur.prenom} ${publication.auteur.nom}`;
  const hasMedia = (publication.medias && publication.medias.length > 0) || !!publication.media;
  const mediaIsVideo = publication.medias?.length ? publication.medias[0].type === 'video' : isVideo(publication.media);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={styles.headerTitle}>Publication</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshControl={
          <RefreshControl
            refreshing={rafraichissement}
            onRefresh={() => {
              chargerPublication(true);
              chargerCommentaires();
            }}
            tintColor={couleurs.primaire}
            colors={[couleurs.primaire]}
          />
        }
      >
        {/* Auteur */}
        <Pressable style={styles.authorSection} onPress={naviguerVersProfilAuteur}>
          <Avatar
            uri={publication.auteur.avatar}
            prenom={publication.auteur.prenom}
            nom={publication.auteur.nom}
            taille={44}
          />
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{auteurNom}</Text>
              {publication.auteur.role === 'admin' && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                </View>
              )}
            </View>
            <Text style={styles.postDate}>{formatDate(publication.dateCreation)}</Text>
          </View>
        </Pressable>

        {/* Contenu texte */}
        {publication.contenu && <Text style={styles.postContent}>{publication.contenu}</Text>}

        {/* Media - avec support carrousel multi-média */}
        {hasMedia && (
          <View style={styles.mediaContainer}>
            {publication.medias && publication.medias.length > 0 ? (
              <PostMediaCarousel
                medias={publication.medias}
                width={SCREEN_WIDTH}
                height={SCREEN_WIDTH}
                onMediaPress={(index) => {
                  const media = publication.medias[index];
                  if (media.type === 'video') {
                    setSelectedVideoUrl(media.url);
                    setVideoModalVisible(true);
                  }
                }}
              />
            ) : mediaIsVideo ? (
              <Pressable
                style={({ pressed }) => [
                  styles.videoThumbnailContainer,
                  pressed && { opacity: 0.9 }
                ]}
                onPress={() => {
                  setSelectedVideoUrl(publication.media || null);
                  setVideoModalVisible(true);
                }}
              >
                <Image
                  source={{ uri: getVideoThumbnail(publication.media!) }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
                <View style={styles.videoPlayOverlay}>
                  <View style={styles.videoPlayButton}>
                    <Ionicons name="play" size={40} color="#fff" style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </Pressable>
            ) : (
              <Image source={{ uri: publication.media }} style={styles.mediaImage} resizeMode="contain" />
            )}
          </View>
        )}

        {/* Stats et actions */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {nbLikes} J'aime{nbLikes > 1 ? 's' : ''} · {commentaires.length} commentaire
            {commentaires.length > 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <AnimatedPressable style={styles.actionBtn} onPress={handleLike}>
            <LikeButton isLiked={liked} count={nbLikes} onPress={handleLike} size={24} showCount={false} />
            <Text style={[styles.actionText, liked && { color: couleurs.danger }]}>J'aime</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.actionBtn} onPress={openCommentComposer}>
            <Ionicons name="chatbubble-outline" size={24} color={couleurs.texteSecondaire} />
            <Text style={styles.actionText}>Commenter</Text>
          </AnimatedPressable>
          <AnimatedPressable style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={couleurs.texteSecondaire} />
            <Text style={styles.actionText}>Partager</Text>
          </AnimatedPressable>
        </View>

        {/* Section commentaires - visible seulement quand le composer est ouvert */}
        {(isCommentComposerOpen || replyingTo) && (
        <View style={styles.commentsSection}>
          <Text style={styles.commentsSectionTitle}>Commentaires</Text>

          {/* Liste des commentaires */}
          {chargementCommentaires ? (
            <View style={styles.noComments}>
              <ActivityIndicator size="small" color={couleurs.primaire} />
              <Text style={styles.noCommentsText}>Chargement...</Text>
            </View>
          ) : commentaires.length === 0 ? (
            <View style={styles.noComments}>
              <Ionicons name="chatbubbles-outline" size={32} color={couleurs.texteSecondaire} />
              <Text style={styles.noCommentsText}>Soyez le premier a commenter !</Text>
            </View>
          ) : (
            commentaires.map((comment) => {
              const commentAuteur = `${comment.auteur.prenom} ${comment.auteur.nom}`;
              const canEditDelete = isMyComment(comment.auteur._id) || isAdmin();
              const isEditing = editingComment === comment._id;

              return (
                <View key={comment._id}>
                  <View style={styles.commentItem}>
                    <Avatar
                      uri={comment.auteur.avatar}
                      prenom={comment.auteur.prenom}
                      nom={comment.auteur.nom}
                      taille={36}
                      onPress={() => naviguerVersProfil(comment.auteur._id)}
                    />
                    <View style={styles.commentContent}>
                      {isEditing ? (
                        <View style={styles.editCommentContainer}>
                          <TextInput
                            style={styles.editCommentInput}
                            value={editingContent}
                            onChangeText={setEditingContent}
                            multiline
                            maxLength={1000}
                            autoFocus
                          />
                          <View style={styles.editCommentActions}>
                            <Pressable
                              style={styles.editCancelBtn}
                              onPress={() => {
                                setEditingComment(null);
                                setEditingContent('');
                              }}
                            >
                              <Text style={styles.editCancelText}>Annuler</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.editSaveBtn, !editingContent.trim() && styles.editSaveBtnDisabled]}
                              onPress={() => handleEditComment(comment._id)}
                              disabled={!editingContent.trim()}
                            >
                              <Text style={styles.editSaveText}>Enregistrer</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <>
                          <View style={styles.commentBubble}>
                            <View style={styles.commentBubbleHeader}>
                              <Text style={styles.commentAuteur}>{commentAuteur}</Text>
                              {canEditDelete && (
                                <View style={styles.commentActionsMenu}>
                                  <Pressable
                                    style={styles.commentActionBtn}
                                    onPress={() => {
                                      setEditingComment(comment._id);
                                      setEditingContent(comment.contenu);
                                    }}
                                  >
                                    <Ionicons name="pencil" size={14} color={couleurs.texteSecondaire} />
                                  </Pressable>
                                  <Pressable
                                    style={styles.commentActionBtn}
                                    onPress={() => handleDeleteComment(comment._id)}
                                  >
                                    <Ionicons name="trash-outline" size={14} color={couleurs.erreur} />
                                  </Pressable>
                                </View>
                              )}
                            </View>
                            <Text style={styles.commentTexte}>{comment.contenu}</Text>
                          </View>
                          <View style={styles.commentMeta}>
                            <Text style={styles.commentTime}>{formatDate(comment.dateCreation)}</Text>
                            {comment.modifie && <Text style={styles.commentModified}>(modifie)</Text>}
                            <LikeButtonCompact
                              isLiked={comment.aLike}
                              count={comment.nbLikes}
                              onPress={() => handleLikeComment(comment._id)}
                              size={14}
                            />
                            <Pressable
                              style={styles.commentReplyBtn}
                              onPress={() => {
                                setReplyingTo({ id: comment._id, auteur: commentAuteur });
                                openCommentComposer();
                              }}
                            >
                              <Text style={styles.commentReplyText}>Repondre</Text>
                            </Pressable>
                          </View>
                        </>
                      )}

                      {/* Reponses */}
                      {comment.reponses && comment.reponses.length > 0 && (
                        <>
                          <Pressable
                            style={styles.viewRepliesBtn}
                            onPress={() =>
                              setExpandedReplies((prev) => ({ ...prev, [comment._id]: !prev[comment._id] }))
                            }
                          >
                            <Ionicons
                              name={expandedReplies[comment._id] ? 'chevron-up' : 'chevron-down'}
                              size={14}
                              color={couleurs.primaire}
                            />
                            <Text style={styles.viewRepliesText}>
                              {expandedReplies[comment._id]
                                ? 'Masquer'
                                : `Voir ${comment.reponses.length} reponse${comment.reponses.length > 1 ? 's' : ''}`}
                            </Text>
                          </Pressable>

                          {expandedReplies[comment._id] &&
                            comment.reponses.map((reponse) => {
                              const repAuteur = `${reponse.auteur.prenom} ${reponse.auteur.nom}`;
                              const canEditDeleteReply = isMyComment(reponse.auteur._id) || isAdmin();
                              const isEditingReply = editingComment === reponse._id;

                              return (
                                <View key={reponse._id} style={styles.replyItem}>
                                  <View style={styles.replyLine} />
                                  <Avatar
                                    uri={reponse.auteur.avatar}
                                    prenom={reponse.auteur.prenom}
                                    nom={reponse.auteur.nom}
                                    taille={28}
                                    onPress={() => naviguerVersProfil(reponse.auteur._id)}
                                  />
                                  <View style={styles.commentContent}>
                                    {isEditingReply ? (
                                      <View style={styles.editCommentContainer}>
                                        <TextInput
                                          style={styles.editCommentInput}
                                          value={editingContent}
                                          onChangeText={setEditingContent}
                                          multiline
                                          maxLength={1000}
                                          autoFocus
                                        />
                                        <View style={styles.editCommentActions}>
                                          <Pressable
                                            style={styles.editCancelBtn}
                                            onPress={() => {
                                              setEditingComment(null);
                                              setEditingContent('');
                                            }}
                                          >
                                            <Text style={styles.editCancelText}>Annuler</Text>
                                          </Pressable>
                                          <Pressable
                                            style={[
                                              styles.editSaveBtn,
                                              !editingContent.trim() && styles.editSaveBtnDisabled,
                                            ]}
                                            onPress={() => handleEditComment(reponse._id)}
                                            disabled={!editingContent.trim()}
                                          >
                                            <Text style={styles.editSaveText}>Enregistrer</Text>
                                          </Pressable>
                                        </View>
                                      </View>
                                    ) : (
                                      <>
                                        <View style={styles.replyBubble}>
                                          <View style={styles.commentBubbleHeader}>
                                            <Text style={styles.commentAuteur}>{repAuteur}</Text>
                                            {canEditDeleteReply && (
                                              <View style={styles.commentActionsMenu}>
                                                <Pressable
                                                  style={styles.commentActionBtn}
                                                  onPress={() => {
                                                    setEditingComment(reponse._id);
                                                    setEditingContent(reponse.contenu);
                                                  }}
                                                >
                                                  <Ionicons name="pencil" size={12} color={couleurs.texteSecondaire} />
                                                </Pressable>
                                                <Pressable
                                                  style={styles.commentActionBtn}
                                                  onPress={() => handleDeleteComment(reponse._id, true, comment._id)}
                                                >
                                                  <Ionicons name="trash-outline" size={12} color={couleurs.erreur} />
                                                </Pressable>
                                              </View>
                                            )}
                                          </View>
                                          <Text style={styles.commentTexte}>{reponse.contenu}</Text>
                                        </View>
                                        <View style={styles.commentMeta}>
                                          <Text style={styles.commentTime}>{formatDate(reponse.dateCreation)}</Text>
                                          {reponse.modifie && <Text style={styles.commentModified}>(modifie)</Text>}
                                          <LikeButtonCompact
                                            isLiked={reponse.aLike}
                                            count={reponse.nbLikes}
                                            onPress={() => handleLikeComment(reponse._id)}
                                            size={12}
                                          />
                                        </View>
                                      </>
                                    )}
                                  </View>
                                </View>
                              );
                            })}
                        </>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
        )}
      </ScrollView>

      {/* Barre de saisie commentaire fixe en bas - visible seulement quand ouvert */}
      {(isCommentComposerOpen || replyingTo) && (
        <View style={[styles.bottomInputWrapper, { paddingBottom: insets.bottom || espacements.sm }]}>
          {/* Barre de reponse ou header du composer */}
          <View style={styles.composerHeader}>
            {replyingTo ? (
              <View style={styles.replyingToContent}>
                <Ionicons name="arrow-undo" size={14} color={couleurs.primaire} />
                <Text style={styles.replyingToText}>
                  Reponse a <Text style={styles.replyingToName}>{replyingTo.auteur}</Text>
                </Text>
              </View>
            ) : (
              <Text style={styles.composerTitle}>Nouveau commentaire</Text>
            )}
            <Pressable onPress={closeCommentComposer} style={styles.closeComposerBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={couleurs.texteSecondaire} />
            </Pressable>
          </View>

          {/* Input commentaire */}
          <View style={styles.commentInputContainer}>
            <Avatar
              uri={utilisateur?.avatar}
              prenom={utilisateur?.prenom}
              nom={utilisateur?.nom}
              taille={36}
              onPress={() => naviguerVersProfil(utilisateur?.id)}
            />
            <TextInput
              ref={commentInputRef}
              style={styles.commentInput}
              placeholder={replyingTo ? `Repondre a ${replyingTo.auteur}...` : 'Ecrire un commentaire...'}
              placeholderTextColor={couleurs.texteSecondaire}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.commentSendBtn, !newComment.trim() && styles.commentSendBtnDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Ionicons name="send" size={20} color={newComment.trim() ? couleurs.primaire : couleurs.texteSecondaire} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Modal lecteur video - Style Instagram */}
      <VideoPlayerModal
        visible={videoModalVisible}
        videoUrl={selectedVideoUrl || publication?.media || null}
        onClose={() => {
          setVideoModalVisible(false);
          setSelectedVideoUrl(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (couleurs: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    headerBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: typographie.tailles.base,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: espacements.xxl,
    },
    errorText: {
      fontSize: typographie.tailles.base,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      marginTop: espacements.md,
    },
    retryBtn: {
      marginTop: espacements.lg,
      paddingHorizontal: espacements.xl,
      paddingVertical: espacements.md,
      backgroundColor: couleurs.primaire,
      borderRadius: rayons.md,
    },
    retryBtnText: {
      color: couleurs.blanc,
      fontWeight: typographie.poids.semibold,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: espacements.xxl,
    },

    // Auteur
    authorSection: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: espacements.md,
      gap: espacements.md,
    },
    authorInfo: {
      flex: 1,
    },
    authorNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
    },
    authorName: {
      fontSize: typographie.tailles.base,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
    },
    adminBadge: {
      backgroundColor: '#dc2626',
      borderRadius: 4,
      padding: 2,
    },
    postDate: {
      fontSize: typographie.tailles.xs,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },

    // Media
    mediaContainer: {
      width: SCREEN_WIDTH,
      backgroundColor: couleurs.fondCard,
    },
    mediaImage: {
      width: SCREEN_WIDTH,
      height: SCREEN_WIDTH,
    },
    videoThumbnailContainer: {
      width: SCREEN_WIDTH,
      height: SCREEN_WIDTH,
      position: 'relative',
    },
    videoPlayOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    videoPlayButton: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
    },

    // Contenu
    postContent: {
      fontSize: typographie.tailles.base,
      color: couleurs.texte,
      lineHeight: 22,
      padding: espacements.md,
    },

    // Stats et actions
    statsRow: {
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    statsText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
    },
    actionsRow: {
      flexDirection: 'row',
      paddingVertical: espacements.sm,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.xs,
      paddingVertical: espacements.sm,
    },
    actionText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
      fontWeight: typographie.poids.medium,
    },

    // Commentaires
    commentsSection: {
      padding: espacements.md,
    },
    commentsSectionTitle: {
      fontSize: typographie.tailles.base,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
      marginBottom: espacements.md,
    },
    composerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: espacements.sm,
    },
    composerTitle: {
      fontSize: typographie.tailles.sm,
      fontWeight: typographie.poids.medium,
      color: couleurs.texteSecondaire,
    },
    closeComposerBtn: {
      padding: espacements.xs,
    },
    replyingToContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
      flex: 1,
    },
    replyingToText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texte,
    },
    replyingToName: {
      fontWeight: typographie.poids.semibold,
      color: couleurs.primaire,
    },
    bottomInputWrapper: {
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
      backgroundColor: couleurs.fond,
      paddingHorizontal: espacements.md,
      paddingTop: espacements.sm,
    },
    commentInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
    },
    commentInput: {
      flex: 1,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      fontSize: typographie.tailles.sm,
      color: couleurs.texte,
      maxHeight: 100,
    },
    commentSendBtn: {
      padding: espacements.sm,
    },
    commentSendBtnDisabled: {
      opacity: 0.5,
    },
    noComments: {
      alignItems: 'center',
      paddingVertical: espacements.xl,
      gap: espacements.sm,
    },
    noCommentsText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
    },

    // Comment item
    commentItem: {
      flexDirection: 'row',
      gap: espacements.sm,
      marginBottom: espacements.md,
    },
    commentContent: {
      flex: 1,
    },
    commentBubble: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      padding: espacements.sm,
    },
    commentBubbleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    commentAuteur: {
      fontSize: typographie.tailles.sm,
      fontWeight: typographie.poids.semibold,
      color: couleurs.texte,
    },
    commentActionsMenu: {
      flexDirection: 'row',
      gap: espacements.xs,
    },
    commentActionBtn: {
      padding: 4,
    },
    commentTexte: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texte,
      lineHeight: 18,
    },
    commentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
      marginTop: espacements.xs,
      paddingLeft: espacements.sm,
    },
    commentTime: {
      fontSize: typographie.tailles.xs,
      color: couleurs.texteSecondaire,
    },
    commentModified: {
      fontSize: typographie.tailles.xs,
      color: couleurs.texteSecondaire,
      fontStyle: 'italic',
    },
    commentReplyBtn: {
      paddingVertical: 2,
    },
    commentReplyText: {
      fontSize: typographie.tailles.xs,
      color: couleurs.primaire,
      fontWeight: typographie.poids.medium,
    },
    viewRepliesBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
      marginTop: espacements.sm,
    },
    viewRepliesText: {
      fontSize: typographie.tailles.xs,
      color: couleurs.primaire,
    },

    // Replies
    replyItem: {
      flexDirection: 'row',
      gap: espacements.sm,
      marginTop: espacements.sm,
      marginLeft: espacements.md,
    },
    replyLine: {
      width: 2,
      backgroundColor: couleurs.bordure,
      marginRight: espacements.sm,
    },
    replyBubble: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      padding: espacements.sm,
    },

    // Edit comment
    editCommentContainer: {
      gap: espacements.sm,
    },
    editCommentInput: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      padding: espacements.sm,
      fontSize: typographie.tailles.sm,
      color: couleurs.texte,
      borderWidth: 1,
      borderColor: couleurs.primaire,
    },
    editCommentActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: espacements.sm,
    },
    editCancelBtn: {
      paddingVertical: espacements.xs,
      paddingHorizontal: espacements.md,
    },
    editCancelText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.texteSecondaire,
    },
    editSaveBtn: {
      backgroundColor: couleurs.primaire,
      borderRadius: rayons.sm,
      paddingVertical: espacements.xs,
      paddingHorizontal: espacements.md,
    },
    editSaveBtnDisabled: {
      opacity: 0.5,
    },
    editSaveText: {
      fontSize: typographie.tailles.sm,
      color: couleurs.blanc,
      fontWeight: typographie.poids.medium,
    },
  });
