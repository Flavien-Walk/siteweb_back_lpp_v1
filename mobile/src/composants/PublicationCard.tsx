/**
 * PublicationCard - Carte de publication du feed
 * Extrait de accueil.tsx pour optimisation des re-renders
 *
 * IMPORTANT: Ce composant est memoizé via React.memo
 * Les callbacks passés en props doivent être stables (useCallback)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useStaff } from '../hooks/useStaff';
import {
  Publication,
  Commentaire,
  toggleLikePublication,
  getCommentaires,
  ajouterCommentaire,
  toggleLikeCommentaire,
  supprimerCommentaire,
  modifierCommentaire,
  supprimerPublication,
  modifierPublication,
  signalerPublication,
  RaisonSignalement,
} from '../services/publications';
import { sharePublication } from '../services/activity';
import { formatRelativeDate } from '../utils/dateUtils';
import { getVideoThumbnail, isVideoUrl } from '../utils/mediaUtils';
import { getUserBadgeConfig } from '../utils/userDisplay';
import Avatar from './Avatar';
import LikeButton, { LikeButtonCompact } from './LikeButton';
import AnimatedPressable from './AnimatedPressable';
import { StaffActions, PostMediaCarousel } from './index';

// ============ TYPES ============

export interface VideoOpenParams {
  videoUrl: string;
  positionMillis: number;
  isPlaying: boolean;
}

export interface PublicationCardProps {
  publication: Publication;
  onUpdate: (pub: Publication) => void;
  onDelete: (id: string) => void;
  // Callbacks externes (doivent être stables via useCallback)
  onOpenCommentsSheet: (postId: string, count: number) => void;
  onNavigateToProfile: (userId: string) => void;
  onOpenImage: (url: string) => void;
  onOpenVideo: (params: VideoOpenParams, publication: Publication, liked: boolean, nbLikes: number, nbComments: number, handlers: {
    onLike: () => void;
    onComments: () => void;
    onShare: () => void;
  }) => void;
  onResetControlsTimeout?: () => void;
  // Styles passés du parent (pour éviter la duplication)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
  // Dimensions
  mediaWidth: number;
  mediaHeight: number;
}

// ============ COMPOSANT ============

const PublicationCardComponent: React.FC<PublicationCardProps> = ({
  publication,
  onUpdate,
  onDelete,
  onOpenCommentsSheet,
  onNavigateToProfile,
  onOpenImage,
  onOpenVideo,
  onResetControlsTimeout,
  styles,
  mediaWidth,
  mediaHeight,
}) => {
  const { couleurs } = useTheme();
  const { utilisateur } = useUser();
  const staff = useStaff();

  // ============ ÉTATS LOCAUX ============
  const [liked, setLiked] = useState(publication.aLike);
  const [nbLikes, setNbLikes] = useState(publication.nbLikes);
  const [nbComments, setNbComments] = useState(publication.nbCommentaires);
  const [showComments, setShowComments] = useState(false);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [chargementCommentaires, setChargementCommentaires] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; auteur: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingPost, setEditingPost] = useState(false);
  const [editingPostContent, setEditingPostContent] = useState(publication.contenu);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showStaffActions, setShowStaffActions] = useState(false);
  const [staffActionTarget, setStaffActionTarget] = useState<'publication' | 'user'>('publication');
  const [notification, setNotification] = useState<{ type: 'succes' | 'erreur'; message: string } | null>(null);

  // Synchroniser les états locaux avec les props
  useEffect(() => {
    setLiked(publication.aLike);
    setNbLikes(publication.nbLikes);
    setNbComments(publication.nbCommentaires);
  }, [publication.aLike, publication.nbLikes, publication.nbCommentaires, publication._id]);

  const auteurNom = `${publication.auteur.prenom} ${publication.auteur.nom}`;

  // ============ HELPERS ============
  const isMyComment = useCallback((auteurId: string) => {
    return utilisateur && utilisateur.id === auteurId;
  }, [utilisateur]);

  const isMyPost = useCallback(() => {
    return utilisateur && utilisateur.id === publication.auteur._id;
  }, [utilisateur, publication.auteur._id]);

  const isAdmin = useCallback(() => {
    return utilisateur && utilisateur.role === 'admin';
  }, [utilisateur]);

  const showNotification = useCallback((type: 'succes' | 'erreur', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // ============ HANDLERS MEMOIZÉS ============
  const handleLike = useCallback(async () => {
    try {
      const newLiked = !liked;
      setLiked(newLiked);
      setNbLikes(prev => newLiked ? prev + 1 : prev - 1);

      const reponse = await toggleLikePublication(publication._id);
      if (reponse.succes && reponse.data) {
        setLiked(reponse.data.aLike);
        setNbLikes(reponse.data.nbLikes);
        onUpdate({ ...publication, aLike: reponse.data.aLike, nbLikes: reponse.data.nbLikes, nbCommentaires: nbComments });
      }
    } catch (error) {
      setLiked(!liked);
      setNbLikes(publication.nbLikes);
    }
  }, [liked, publication, nbComments, onUpdate]);

  const handleToggleComments = useCallback(() => {
    onOpenCommentsSheet(publication._id, nbComments);
  }, [publication._id, nbComments, onOpenCommentsSheet]);

  const handleShare = useCallback(async () => {
    const result = await sharePublication(publication._id, auteurNom, publication.contenu);
    if (result.error) {
      showNotification('erreur', 'Impossible de partager ce contenu');
    }
  }, [publication._id, auteurNom, publication.contenu, showNotification]);

  const chargerCommentaires = useCallback(async () => {
    try {
      setChargementCommentaires(true);
      const reponse = await getCommentaires(publication._id);
      if (reponse.succes && reponse.data) {
        setCommentaires(reponse.data.commentaires);
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    } finally {
      setChargementCommentaires(false);
    }
  }, [publication._id]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;

    try {
      const reponse = await ajouterCommentaire(publication._id, newComment.trim(), replyingTo?.id);
      if (reponse.succes && reponse.data) {
        if (replyingTo) {
          setCommentaires(prev => prev.map(c => {
            if (c._id === replyingTo.id) {
              return { ...c, reponses: [...(c.reponses || []), reponse.data!.commentaire] };
            }
            return c;
          }));
          setExpandedReplies(prev => ({ ...prev, [replyingTo.id]: true }));
        } else {
          setCommentaires(prev => [reponse.data!.commentaire, ...prev]);
        }
        setNewComment('');
        setReplyingTo(null);
        setNbComments(prev => prev + 1);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le commentaire');
    }
  }, [publication._id, newComment, replyingTo]);

  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      const reponse = await toggleLikeCommentaire(publication._id, commentId);
      if (reponse.succes && reponse.data) {
        setCommentaires(prev => prev.map(c => {
          if (c._id === commentId) {
            return { ...c, aLike: reponse.data!.aLike, nbLikes: reponse.data!.nbLikes };
          }
          if (c.reponses) {
            return {
              ...c,
              reponses: c.reponses.map(r => r._id === commentId ? { ...r, aLike: reponse.data!.aLike, nbLikes: reponse.data!.nbLikes } : r),
            };
          }
          return c;
        }));
      }
    } catch (error) {
      console.error('Erreur like commentaire:', error);
    }
  }, [publication._id]);

  const handleEditComment = useCallback(async (commentId: string) => {
    if (!editingContent.trim()) return;
    try {
      const reponse = await modifierCommentaire(publication._id, commentId, editingContent.trim());
      if (reponse.succes && reponse.data) {
        setCommentaires(prev => prev.map(c => {
          if (c._id === commentId) {
            return { ...c, contenu: reponse.data!.commentaire.contenu, modifie: true };
          }
          if (c.reponses) {
            return {
              ...c,
              reponses: c.reponses.map(r => r._id === commentId ? { ...r, contenu: reponse.data!.commentaire.contenu, modifie: true } : r),
            };
          }
          return c;
        }));
        setEditingComment(null);
        setEditingContent('');
      } else {
        Alert.alert('Erreur', reponse.message || 'Impossible de modifier le commentaire');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le commentaire');
    }
  }, [publication._id, editingContent]);

  const handleDeleteComment = useCallback(async (commentId: string, isReply = false, parentId?: string) => {
    Alert.alert(
      'Supprimer le commentaire',
      'Voulez-vous vraiment supprimer ce commentaire ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const reponse = await supprimerCommentaire(publication._id, commentId);
              if (reponse.succes) {
                if (isReply && parentId) {
                  setCommentaires(prev => prev.map(c => {
                    if (c._id === parentId) {
                      return { ...c, reponses: c.reponses?.filter(r => r._id !== commentId) };
                    }
                    return c;
                  }));
                } else {
                  setCommentaires(prev => prev.filter(c => c._id !== commentId));
                }
                setNbComments(prev => Math.max(0, prev - 1));
                onUpdate({ ...publication, aLike: liked, nbLikes, nbCommentaires: Math.max(0, nbComments - 1) });
              } else {
                Alert.alert('Erreur', reponse.message || 'Impossible de supprimer le commentaire');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le commentaire');
            }
          },
        },
      ]
    );
  }, [publication, liked, nbLikes, nbComments, onUpdate]);

  const startEditComment = useCallback((comment: Commentaire) => {
    setEditingComment(comment._id);
    setEditingContent(comment.contenu);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingComment(null);
    setEditingContent('');
  }, []);

  const naviguerVersProfilAuteur = useCallback(() => {
    onNavigateToProfile(publication.auteur._id);
  }, [publication.auteur._id, onNavigateToProfile]);

  const handleEditPost = useCallback(async () => {
    if (!editingPostContent.trim()) return;
    try {
      const reponse = await modifierPublication(publication._id, editingPostContent.trim());
      if (reponse.succes && reponse.data) {
        onUpdate(reponse.data.publication);
        setEditingPost(false);
        showNotification('succes', 'Publication modifiee avec succes');
      } else {
        showNotification('erreur', reponse.message || 'Erreur lors de la modification');
      }
    } catch (error) {
      showNotification('erreur', 'Impossible de modifier la publication');
    }
  }, [publication._id, editingPostContent, onUpdate, showNotification]);

  const handleDeletePost = useCallback(() => {
    setShowPostMenu(false);
    Alert.alert(
      'Supprimer la publication',
      'Voulez-vous vraiment supprimer cette publication ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const reponse = await supprimerPublication(publication._id);
              if (reponse.succes) {
                onDelete(publication._id);
                showNotification('succes', 'Publication supprimee');
              } else {
                showNotification('erreur', reponse.message || 'Erreur lors de la suppression');
              }
            } catch (error) {
              showNotification('erreur', 'Impossible de supprimer la publication');
            }
          },
        },
      ]
    );
  }, [publication._id, onDelete, showNotification]);

  const handleReportPost = useCallback(async (raison: RaisonSignalement) => {
    setShowPostMenu(false);
    try {
      const reponse = await signalerPublication(publication._id, raison);
      if (reponse.succes) {
        showNotification('succes', 'Merci, signalement envoyé');
      } else {
        showNotification('erreur', reponse.message || 'Erreur lors du signalement');
      }
    } catch (error) {
      showNotification('erreur', 'Impossible de signaler ce contenu');
    }
  }, [publication._id, showNotification]);

  // Handler pour ouvrir une vidéo en fullscreen
  const handleVideoPress = useCallback((params: { videoUrl: string; positionMillis: number; isPlaying: boolean }) => {
    onOpenVideo(params, publication, liked, nbLikes, nbComments, {
      onLike: handleLike,
      onComments: handleToggleComments,
      onShare: handleShare,
    });
  }, [publication, liked, nbLikes, nbComments, onOpenVideo, handleLike, handleToggleComments, handleShare]);

  // Handler pour ouvrir une image
  const handleMediaPress = useCallback((index: number) => {
    const media = publication.medias[index];
    if (media.type !== 'video') {
      onOpenImage(media.url);
    }
  }, [publication.medias, onOpenImage]);

  // Handler pour le legacy media (anciennes publications)
  const handleLegacyMediaPress = useCallback(() => {
    if (!publication.media) return;

    const isVideo = isVideoUrl(publication.media);
    if (isVideo) {
      onOpenVideo(
        { videoUrl: publication.media, positionMillis: 0, isPlaying: true },
        publication,
        liked,
        nbLikes,
        nbComments,
        {
          onLike: handleLike,
          onComments: handleToggleComments,
          onShare: handleShare,
        }
      );
      onResetControlsTimeout?.();
    } else {
      onOpenImage(publication.media);
    }
  }, [publication, liked, nbLikes, nbComments, onOpenVideo, onOpenImage, onResetControlsTimeout, handleLike, handleToggleComments, handleShare]);

  // ============ CONSTANTES ============
  const raisonsSignalement: { value: RaisonSignalement; label: string; icon: string }[] = [
    { value: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
    { value: 'harcelement', label: 'Harcèlement', icon: 'warning-outline' },
    { value: 'contenu_inapproprie', label: 'Contenu inapproprié', icon: 'eye-off-outline' },
    { value: 'fausse_info', label: 'Fausse information', icon: 'information-circle-outline' },
    { value: 'autre', label: 'Autre', icon: 'flag-outline' },
  ];

  // ============ RENDER ============
  return (
    <View style={styles.postCard}>
      {/* Notification banner */}
      {notification && (
        <View style={[styles.notificationBanner, notification.type === 'succes' ? styles.notificationSucces : styles.notificationErreur]}>
          <Ionicons
            name={notification.type === 'succes' ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={notification.type === 'succes' ? '#10b981' : '#ef4444'}
          />
          <Text style={[styles.notificationText, notification.type === 'succes' ? styles.notificationTextSucces : styles.notificationTextErreur]}>
            {notification.message}
          </Text>
        </View>
      )}

      <View style={styles.postHeader}>
        <Pressable onPress={naviguerVersProfilAuteur}>
          <Avatar
            uri={publication.auteur.avatar}
            prenom={publication.auteur.prenom}
            nom={publication.auteur.nom}
            taille={44}
          />
        </Pressable>
        <View style={styles.postAuteurContainer}>
          <View style={styles.postAuteurRow}>
            <Pressable onPress={naviguerVersProfilAuteur}>
              <Text style={styles.postAuteur}>{auteurNom}</Text>
            </Pressable>
            {(() => {
              const badgeConfig = getUserBadgeConfig(publication.auteur.role, publication.auteur.statut);
              return (
                <View style={[
                  styles.statutBadge,
                  { backgroundColor: badgeConfig.isStaff ? badgeConfig.color : (badgeConfig.label === 'Entrepreneur' ? '#F59E0B' : '#10B981') }
                ]}>
                  <Ionicons name={badgeConfig.icon} size={10} color="#fff" />
                  <Text style={styles.statutBadgeText}>{badgeConfig.label}</Text>
                </View>
              );
            })()}
            {publication.auteurType === 'Projet' && (
              <View style={styles.startupBadge}>
                <Text style={styles.startupBadgeText}>Startup</Text>
              </View>
            )}
          </View>
          <Text style={styles.postTimestamp}>{formatRelativeDate(publication.dateCreation)}</Text>
        </View>
        <Pressable style={styles.postMore} onPress={() => setShowPostMenu(!showPostMenu)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={couleurs.texteSecondaire} />
        </Pressable>
      </View>

      {/* Bottom Sheet Menu */}
      <Modal
        visible={showPostMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPostMenu(false)}
      >
        <Pressable
          style={styles.bottomSheetOverlay}
          onPress={() => setShowPostMenu(false)}
        >
          <Pressable
            style={styles.bottomSheetContainer}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Poignée */}
            <View style={styles.bottomSheetHandle} />

            <ScrollView
              style={styles.bottomSheetScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Titre selon contexte */}
              <Text style={styles.bottomSheetTitle}>
                {isMyPost() ? 'Options du post' : staff.isStaff ? 'Actions disponibles' : 'Signaler ce post'}
              </Text>

              {/* Options propriétaire */}
              {isMyPost() && (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.bottomSheetItem,
                      pressed && styles.bottomSheetItemPressed,
                    ]}
                    onPress={() => {
                      setShowPostMenu(false);
                      setEditingPost(true);
                    }}
                  >
                    <View style={[styles.bottomSheetIconContainer, { backgroundColor: couleurs.primaireLight }]}>
                      <Ionicons name="pencil" size={20} color={couleurs.primaire} />
                    </View>
                    <View style={styles.bottomSheetTextContainer}>
                      <Text style={styles.bottomSheetItemText}>Modifier</Text>
                      <Text style={styles.bottomSheetItemSubtext}>Éditer le contenu de votre publication</Text>
                    </View>
                  </Pressable>

                  <View style={styles.bottomSheetSeparator} />

                  <Pressable
                    style={({ pressed }) => [
                      styles.bottomSheetItem,
                      pressed && styles.bottomSheetItemPressed,
                    ]}
                    onPress={handleDeletePost}
                  >
                    <View style={[styles.bottomSheetIconContainer, { backgroundColor: 'rgba(255, 77, 109, 0.15)' }]}>
                      <Ionicons name="trash-outline" size={20} color={couleurs.danger} />
                    </View>
                    <View style={styles.bottomSheetTextContainer}>
                      <Text style={[styles.bottomSheetItemText, { color: couleurs.danger }]}>Supprimer</Text>
                      <Text style={styles.bottomSheetItemSubtext}>Cette action est irréversible</Text>
                    </View>
                  </Pressable>
                </>
              )}

              {/* Options STAFF (modération) - affichées si staff et pas son propre post */}
              {staff.isStaff && !isMyPost() && (
                <>
                  {/* Badge staff */}
                  <View style={styles.staffBadge}>
                    <Ionicons name="shield" size={14} color="#6366f1" />
                    <Text style={styles.staffBadgeText}>MODÉRATION</Text>
                  </View>

                  {/* Actions sur le contenu */}
                  {(staff.canHideContent || staff.canDeleteContent) && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.bottomSheetItem,
                        pressed && styles.bottomSheetItemPressed,
                      ]}
                      onPress={() => {
                        setShowPostMenu(false);
                        setStaffActionTarget('publication');
                        setShowStaffActions(true);
                      }}
                    >
                      <View style={[styles.bottomSheetIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                        <Ionicons name="document-text-outline" size={20} color="#6366f1" />
                      </View>
                      <View style={styles.bottomSheetTextContainer}>
                        <Text style={styles.bottomSheetItemText}>Modérer ce contenu</Text>
                        <Text style={styles.bottomSheetItemSubtext}>Masquer ou supprimer la publication</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
                    </Pressable>
                  )}

                  {/* Actions sur l'utilisateur */}
                  {(staff.canWarnUsers || staff.canSuspendUsers || staff.canBanUsers) && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.bottomSheetItem,
                        pressed && styles.bottomSheetItemPressed,
                      ]}
                      onPress={() => {
                        setShowPostMenu(false);
                        setStaffActionTarget('user');
                        setShowStaffActions(true);
                      }}
                    >
                      <View style={[styles.bottomSheetIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <Ionicons name="person-outline" size={20} color="#ef4444" />
                      </View>
                      <View style={styles.bottomSheetTextContainer}>
                        <Text style={styles.bottomSheetItemText}>Sanctionner l'auteur</Text>
                        <Text style={styles.bottomSheetItemSubtext}>Avertir, suspendre ou bannir</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
                    </Pressable>
                  )}

                  <View style={styles.bottomSheetSeparator} />
                </>
              )}

              {/* Options signalement (pour tout le monde sauf propriétaire) */}
              {!isMyPost() && (
                <>
                  {!staff.isStaff && (
                    <Text style={styles.bottomSheetSubtitle}>Pourquoi signalez-vous cette publication ?</Text>
                  )}
                  {staff.isStaff && (
                    <Text style={[styles.bottomSheetSubtitle, { marginTop: 8 }]}>Ou signaler manuellement :</Text>
                  )}

                  {raisonsSignalement.map((raison, index) => (
                    <Pressable
                      key={raison.value}
                      style={({ pressed }) => [
                        styles.bottomSheetItem,
                        pressed && styles.bottomSheetItemPressed,
                        index === raisonsSignalement.length - 1 && { borderBottomWidth: 0 },
                      ]}
                      onPress={() => handleReportPost(raison.value)}
                    >
                      <View style={[styles.bottomSheetIconContainer, { backgroundColor: 'rgba(255, 189, 89, 0.15)' }]}>
                        <Ionicons name={raison.icon as any} size={20} color={couleurs.accent} />
                      </View>
                      <View style={styles.bottomSheetTextContainer}>
                        <Text style={styles.bottomSheetItemText}>{raison.label}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>

            {/* Bouton Annuler */}
            <Pressable
              style={({ pressed }) => [
                styles.bottomSheetCancelBtn,
                pressed && styles.bottomSheetItemPressed,
              ]}
              onPress={() => setShowPostMenu(false)}
            >
              <Text style={styles.bottomSheetCancelText}>Annuler</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Staff Actions */}
      <StaffActions
        visible={showStaffActions}
        onClose={() => setShowStaffActions(false)}
        targetType={staffActionTarget}
        targetId={staffActionTarget === 'user' ? publication.auteur._id : publication._id}
        targetName={staffActionTarget === 'user' ? auteurNom : publication.contenu.slice(0, 50)}
        onActionComplete={() => {
          if (staffActionTarget === 'publication') {
            onDelete(publication._id);
          }
        }}
      />

      {/* Mode edition du post */}
      {editingPost ? (
        <View style={styles.editPostContainer}>
          <TextInput
            style={styles.editPostInput}
            value={editingPostContent}
            onChangeText={setEditingPostContent}
            multiline
            maxLength={5000}
            autoFocus
          />
          <View style={styles.editPostActions}>
            <Pressable style={styles.editCancelBtn} onPress={() => { setEditingPost(false); setEditingPostContent(publication.contenu); }}>
              <Text style={styles.editCancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[styles.editSaveBtn, !editingPostContent.trim() && styles.editSaveBtnDisabled]}
              onPress={handleEditPost}
              disabled={!editingPostContent.trim()}
            >
              <Text style={styles.editSaveText}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.postContenu}>{publication.contenu}</Text>
      )}

      {/* Affichage des médias avec carrousel */}
      {publication.medias && publication.medias.length > 0 ? (
        <PostMediaCarousel
          medias={publication.medias}
          postId={publication._id}
          width={mediaWidth}
          height={mediaHeight}
          liked={liked}
          onDoubleTapLike={handleLike}
          onMediaPress={handleMediaPress}
          onVideoPress={handleVideoPress}
        />
      ) : publication.media && (() => {
        // Fallback pour anciennes publications sans medias[]
        const isVideo = isVideoUrl(publication.media);
        const thumbnailUri = isVideo
          ? getVideoThumbnail(publication.media)
          : publication.media;

        return (
          <Pressable
            style={styles.postMediaContainer}
            onPress={handleLegacyMediaPress}
          >
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.postImage}
              resizeMode="cover"
            />
            {isVideo && (
              <View style={styles.postVideoOverlay}>
                <View style={styles.postVideoPlayBtn}>
                  <Ionicons name="play" size={32} color={couleurs.blanc} />
                </View>
                <View style={styles.videoDurationBadge}>
                  <Ionicons name="videocam" size={12} color={couleurs.blanc} />
                </View>
              </View>
            )}
          </Pressable>
        );
      })()}

      <View style={styles.postStats}>
        <Text style={styles.postStatText}>{nbLikes} j'aime</Text>
        <Pressable onPress={handleToggleComments}>
          <Text style={styles.postStatText}>{nbComments} commentaires</Text>
        </Pressable>
      </View>

      <View style={styles.postActions}>
        <AnimatedPressable style={styles.postAction} onPress={handleLike}>
          <LikeButton
            isLiked={liked}
            count={nbLikes}
            onPress={handleLike}
            size={22}
            showCount={false}
          />
          <Text style={[styles.postActionText, liked && { color: couleurs.danger }]}>J'aime</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.postAction} onPress={handleToggleComments}>
          <Ionicons
            name="chatbubble-outline"
            size={22}
            color={couleurs.texteSecondaire}
          />
          <Text style={styles.postActionText}>Commenter</Text>
        </AnimatedPressable>
        <AnimatedPressable style={styles.postAction} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={couleurs.texteSecondaire} />
          <Text style={styles.postActionText}>Partager</Text>
        </AnimatedPressable>
      </View>

      {/* Section commentaires inline (legacy - utilisée si showComments=true) */}
      {showComments && (
        <View style={styles.commentsSection}>
          {replyingTo && (
            <View style={styles.replyingToBanner}>
              <View style={styles.replyingToContent}>
                <Ionicons name="arrow-undo" size={14} color={couleurs.primaire} />
                <Text style={styles.replyingToText}>
                  Reponse a <Text style={styles.replyingToName}>{replyingTo.auteur}</Text>
                </Text>
              </View>
              <Pressable onPress={() => { setReplyingTo(null); setNewComment(''); }} style={styles.cancelReplyBtn}>
                <Ionicons name="close" size={18} color={couleurs.texteSecondaire} />
              </Pressable>
            </View>
          )}

          <View style={styles.commentInputContainer}>
            <Avatar
              uri={utilisateur?.avatar}
              prenom={utilisateur?.prenom}
              nom={utilisateur?.nom}
              taille={32}
              onPress={() => onNavigateToProfile(utilisateur?.id || '')}
            />
            <TextInput
              style={styles.commentInput}
              placeholder={replyingTo ? `Repondre a ${replyingTo.auteur}...` : 'Ecrire un commentaire...'}
              placeholderTextColor={couleurs.texteSecondaire}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              blurOnSubmit={false}
              returnKeyType="send"
              onSubmitEditing={handleAddComment}
            />
            <Pressable
              style={[styles.commentSendBtn, !newComment.trim() && styles.commentSendBtnDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Ionicons
                name="send"
                size={18}
                color={newComment.trim() ? couleurs.primaire : couleurs.texteSecondaire}
              />
            </Pressable>
          </View>

          {chargementCommentaires ? (
            <View style={styles.noComments}>
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
              const canEditDeleteComment = isMyComment(comment.auteur._id) || isAdmin();
              const isEditingThisComment = editingComment === comment._id;
              return (
                <View key={comment._id}>
                  <View style={styles.commentItem}>
                    <Avatar
                      uri={comment.auteur.avatar}
                      prenom={comment.auteur.prenom}
                      nom={comment.auteur.nom}
                      taille={32}
                      onPress={() => onNavigateToProfile(comment.auteur._id)}
                    />
                    <View style={styles.commentContent}>
                      {isEditingThisComment ? (
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
                            <Pressable style={styles.editCancelBtn} onPress={cancelEdit}>
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
                              <View style={styles.commentAuteurRow}>
                                <Text style={styles.commentAuteur}>{commentAuteur}</Text>
                                {(() => {
                                  const badgeConfig = getUserBadgeConfig(comment.auteur.role, comment.auteur.statut);
                                  return (
                                    <View style={[
                                      styles.statutBadgeSmall,
                                      { backgroundColor: badgeConfig.isStaff ? badgeConfig.color : (badgeConfig.label === 'Entrepreneur' ? '#F59E0B' : '#10B981') }
                                    ]}>
                                      <Text style={styles.statutBadgeSmallText}>{badgeConfig.label}</Text>
                                    </View>
                                  );
                                })()}
                              </View>
                              {canEditDeleteComment && (
                                <View style={styles.commentActionsMenu}>
                                  <Pressable
                                    style={styles.commentActionBtn}
                                    onPress={() => startEditComment(comment)}
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
                            <Text style={styles.commentTime}>{formatRelativeDate(comment.dateCreation)}</Text>
                            {comment.modifie && (
                              <Text style={styles.commentModified}>(modifie)</Text>
                            )}
                            <LikeButtonCompact
                              isLiked={comment.aLike}
                              count={comment.nbLikes}
                              onPress={() => handleLikeComment(comment._id)}
                              size={14}
                            />
                            <Pressable
                              style={styles.commentReplyBtn}
                              onPress={() => setReplyingTo({ id: comment._id, auteur: commentAuteur })}
                            >
                              <Text style={styles.commentReplyText}>Repondre</Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                      {comment.reponses && comment.reponses.length > 0 && (
                        <Pressable
                          style={styles.viewRepliesBtn}
                          onPress={() => setExpandedReplies(prev => ({ ...prev, [comment._id]: !prev[comment._id] }))}
                        >
                          <Ionicons
                            name={expandedReplies[comment._id] ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={couleurs.primaire}
                          />
                          <Text style={styles.viewRepliesText}>
                            {expandedReplies[comment._id] ? 'Masquer' : `Voir ${comment.reponses.length} reponse${comment.reponses.length > 1 ? 's' : ''}`}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  {expandedReplies[comment._id] && comment.reponses?.map((reponse) => {
                    const repAuteur = `${reponse.auteur.prenom} ${reponse.auteur.nom}`;
                    const isEditingReply = editingComment === reponse._id;
                    const canEditDeleteReply = isMyComment(reponse.auteur._id) || isAdmin();
                    return (
                      <View key={reponse._id} style={styles.replyItem}>
                        <View style={styles.replyLine} />
                        <Avatar
                          uri={reponse.auteur.avatar}
                          prenom={reponse.auteur.prenom}
                          nom={reponse.auteur.nom}
                          taille={28}
                          onPress={() => onNavigateToProfile(reponse.auteur._id)}
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
                                <Pressable style={styles.editCancelBtn} onPress={cancelEdit}>
                                  <Text style={styles.editCancelText}>Annuler</Text>
                                </Pressable>
                                <Pressable
                                  style={[styles.editSaveBtn, !editingContent.trim() && styles.editSaveBtnDisabled]}
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
                                  <View style={styles.commentAuteurRow}>
                                    <Text style={styles.commentAuteur}>{repAuteur}</Text>
                                    {(() => {
                                      const badgeConfig = getUserBadgeConfig(reponse.auteur.role, reponse.auteur.statut);
                                      return (
                                        <View style={[
                                          styles.statutBadgeSmall,
                                          { backgroundColor: badgeConfig.isStaff ? badgeConfig.color : (badgeConfig.label === 'Entrepreneur' ? '#F59E0B' : '#10B981') }
                                        ]}>
                                          <Text style={styles.statutBadgeSmallText}>{badgeConfig.label}</Text>
                                        </View>
                                      );
                                    })()}
                                  </View>
                                  {canEditDeleteReply && (
                                    <View style={styles.commentActionsMenu}>
                                      <Pressable
                                        style={styles.commentActionBtn}
                                        onPress={() => startEditComment(reponse)}
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
                                <Text style={styles.commentTime}>{formatRelativeDate(reponse.dateCreation)}</Text>
                                {reponse.modifie && (
                                  <Text style={styles.commentModified}>(modifie)</Text>
                                )}
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
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
};

// ============ MEMOIZATION ============
// React.memo compare les props par référence shallow
// Les callbacks passés doivent être stables (useCallback) pour éviter les re-renders
const PublicationCard = React.memo(PublicationCardComponent);

export default PublicationCard;
