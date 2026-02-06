/**
 * StoryViewer - Lecteur de stories plein écran style Instagram
 * - Barre de progression en haut
 * - Tap gauche = story précédente
 * - Tap droite = story suivante
 * - Swipe down / bouton X = fermer
 * - Support photo et vidéo
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  PanResponder,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from './Avatar';
import { couleurs, espacements, typographie, rayons } from '../constantes/theme';
import { Story, formatTempsRestant, markStorySeen, getStoryViewers, supprimerStory, StoryViewer as StoryViewerType } from '../services/stories';
import { getFilterOverlay, FilterPreset } from '../utils/imageFilters';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_STORY_DURATION_SEC = 7; // Durée par défaut si non spécifiée

interface StoryViewerProps {
  visible: boolean;
  stories: Story[];
  userId?: string; // ID de l'utilisateur pour la navigation
  userName: string;
  userAvatar?: string;
  initialIndex?: number;
  isOwnStory?: boolean; // true si ce sont ses propres stories (pas de marquage vue)
  onClose: () => void;
  onAllStoriesViewed?: () => void;
  onNavigateToProfile?: (userId: string, currentIndex: number) => void; // Navigation vers profil
  onStoryDeleted?: (storyId: string) => void; // Callback quand une story est supprimée
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  visible,
  stories,
  userId,
  userName,
  userAvatar,
  initialIndex = 0,
  isOwnStory = false,
  onClose,
  onAllStoriesViewed,
  onNavigateToProfile,
  onStoryDeleted,
}) => {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);

  // États
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const markedSeenRef = useRef<Set<string>>(new Set()); // Stories déjà marquées comme vues

  // États pour les vues (uniquement pour ses propres stories)
  const [viewers, setViewers] = useState<StoryViewerType[]>([]);
  const [nbVues, setNbVues] = useState(0);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // État pour la suppression
  const [isDeleting, setIsDeleting] = useState(false);

  // Animation de progression
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Animation de swipe down
  const translateY = useRef(new Animated.Value(0)).current;

  // Story courante
  const currentStory = stories[currentIndex];
  const isVideo = currentStory?.type === 'video';

  // V2 - Durée d'affichage en ms (utilise durationSec ou valeur par défaut)
  const currentDurationMs = ((currentStory?.durationSec || DEFAULT_STORY_DURATION_SEC) * 1000);

  // Reset à l'ouverture
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsPaused(false);
      setIsLoading(true);
      progressAnim.setValue(0);
      translateY.setValue(0);
      markedSeenRef.current.clear(); // Reset le suivi des stories vues
      setViewers([]);
      setNbVues(0);
      setViewersModalVisible(false);
    }
  }, [visible, initialIndex]);

  // Charger les vues pour ses propres stories
  useEffect(() => {
    if (!visible || !isOwnStory || !currentStory) return;

    const chargerViewers = async () => {
      setLoadingViewers(true);
      try {
        const response = await getStoryViewers(currentStory._id);
        if (response.succes && response.data) {
          setViewers(response.data.viewers);
          setNbVues(response.data.nbVues);
        }
      } catch (error) {
        console.error('Erreur chargement viewers:', error);
      } finally {
        setLoadingViewers(false);
      }
    };

    chargerViewers();
  }, [visible, currentIndex, isOwnStory, currentStory]);

  // Marquer la story comme vue quand elle est affichée
  useEffect(() => {
    if (!visible || isOwnStory || !currentStory) return;

    const storyId = currentStory._id;

    // Ne pas re-marquer si déjà marquée dans cette session ou si déjà vue avant
    if (markedSeenRef.current.has(storyId) || currentStory.estVue) return;

    // Marquer comme vue côté API
    markedSeenRef.current.add(storyId);
    markStorySeen(storyId).catch((error) => {
      console.error('Erreur markStorySeen:', error);
      // On garde quand même dans le set pour éviter les retries
    });
  }, [visible, currentIndex, isOwnStory, currentStory]);

  // Démarrer/arrêter la progression
  const startProgress = useCallback((duration: number) => {
    progressAnimation.current?.stop();
    progressAnim.setValue(0);

    progressAnimation.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });

    progressAnimation.current.start(({ finished }) => {
      if (finished && !isPaused) {
        goToNext();
      }
    });
  }, [isPaused]);

  const pauseProgress = useCallback(() => {
    progressAnimation.current?.stop();
  }, []);

  const resumeProgress = useCallback(() => {
    if (!isPaused && !isVideo) {
      // V2 - Calculer le temps restant avec la durée personnalisée
      const currentProgress = (progressAnim as any)._value || 0;
      const remainingDuration = currentDurationMs * (1 - currentProgress);

      progressAnimation.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
      });

      progressAnimation.current.start(({ finished }) => {
        if (finished && !isPaused) {
          goToNext();
        }
      });
    }
  }, [isPaused, isVideo, currentDurationMs]);

  // Navigation entre stories
  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsLoading(true);
      progressAnim.setValue(0);
    } else {
      // Toutes les stories vues
      onAllStoriesViewed?.();
      onClose();
    }
  }, [currentIndex, stories.length, onAllStoriesViewed, onClose]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsLoading(true);
      progressAnim.setValue(0);
    } else {
      // Restart current story
      progressAnim.setValue(0);
      if (!isVideo) {
        startProgress(currentDurationMs);
      }
    }
  }, [currentIndex, isVideo, startProgress, currentDurationMs]);

  // Démarrer la progression quand l'image est chargée
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    if (!isPaused) {
      startProgress(currentDurationMs);
    }
  }, [isPaused, startProgress, currentDurationMs]);

  // Gérer la vidéo
  const handleVideoStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);

      if (status.didJustFinish) {
        goToNext();
      } else if (status.durationMillis && status.positionMillis !== undefined) {
        // Mettre à jour la barre de progression
        const progress = status.positionMillis / status.durationMillis;
        progressAnim.setValue(progress);
      }
    }
  }, [goToNext]);

  // Pan responder pour le swipe down
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < 30;
      },
      onPanResponderGrant: () => {
        pauseProgress();
        setIsPaused(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // Fermer
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          // Revenir
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            setIsPaused(false);
            resumeProgress();
          });
        }
      },
    })
  ).current;

  // Gérer les taps gauche/droite
  const handleTap = useCallback((event: any) => {
    const { locationX } = event.nativeEvent;
    const thirdWidth = SCREEN_WIDTH / 3;

    if (locationX < thirdWidth) {
      // Tap gauche - précédent
      goToPrev();
    } else if (locationX > thirdWidth * 2) {
      // Tap droite - suivant
      goToNext();
    } else {
      // Tap centre - pause/play
      setIsPaused((prev) => {
        if (!prev) {
          pauseProgress();
          if (isVideo && videoRef.current) {
            videoRef.current.pauseAsync();
          }
        } else {
          resumeProgress();
          if (isVideo && videoRef.current) {
            videoRef.current.playAsync();
          }
        }
        return !prev;
      });
    }
  }, [goToPrev, goToNext, isVideo, pauseProgress, resumeProgress]);

  // Long press pour pause
  const handleLongPressIn = useCallback(() => {
    setIsPaused(true);
    pauseProgress();
    if (isVideo && videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [isVideo, pauseProgress]);

  const handleLongPressOut = useCallback(() => {
    setIsPaused(false);
    resumeProgress();
    if (isVideo && videoRef.current) {
      videoRef.current.playAsync();
    }
  }, [isVideo, resumeProgress]);

  // Formater le temps depuis la création
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) {
      return `Il y a ${diffHours}h`;
    }
    if (diffMins > 0) {
      return `Il y a ${diffMins}m`;
    }
    return 'À l\'instant';
  };

  // Navigation vers le profil de l'auteur de la story
  const handleProfilePress = useCallback(() => {
    // Obtenir l'ID utilisateur depuis la story ou le prop
    const storyUserId = currentStory?.utilisateur?._id || userId;

    if (!storyUserId || !onNavigateToProfile) {
      return;
    }

    // Pause la progression avant navigation
    pauseProgress();
    setIsPaused(true);
    if (isVideo && videoRef.current) {
      videoRef.current.pauseAsync();
    }

    // Naviguer vers le profil (pas de condition bloquante - fonctionne même pour son propre profil)
    onNavigateToProfile(storyUserId, currentIndex);
  }, [currentStory, userId, currentIndex, onNavigateToProfile, pauseProgress, isVideo]);

  // Supprimer la story (uniquement pour ses propres stories)
  const handleDeleteStory = useCallback(async () => {
    if (!currentStory || !isOwnStory || isDeleting) return;

    // Pause la progression pendant la confirmation
    pauseProgress();
    setIsPaused(true);

    Alert.alert(
      'Supprimer la story',
      'Cette story sera définitivement supprimée. Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => {
            setIsPaused(false);
            resumeProgress();
          },
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await supprimerStory(currentStory._id);
              if (response.succes) {
                // Notifier le parent
                onStoryDeleted?.(currentStory._id);

                // Si c'était la dernière story, fermer le viewer
                if (stories.length === 1) {
                  onClose();
                } else if (currentIndex >= stories.length - 1) {
                  // Si c'était la dernière dans la liste, aller à la précédente
                  setCurrentIndex(currentIndex - 1);
                }
                // Sinon, rester à l'index actuel (le parent aura mis à jour stories)
              } else {
                Alert.alert('Erreur', response.message || 'Impossible de supprimer la story');
                setIsPaused(false);
                resumeProgress();
              }
            } catch (error) {
              console.error('Erreur suppression story:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
              setIsPaused(false);
              resumeProgress();
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [currentStory, isOwnStory, isDeleting, currentIndex, stories.length, onStoryDeleted, onClose, pauseProgress, resumeProgress]);

  if (!currentStory) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Média (photo ou vidéo) */}
        <Pressable
          style={styles.mediaContainer}
          onPress={handleTap}
          onLongPress={handleLongPressIn}
          onPressOut={handleLongPressOut}
          delayLongPress={200}
        >
          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: currentStory.mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={!isPaused}
              isLooping={false}
              onPlaybackStatusUpdate={handleVideoStatusUpdate}
            />
          ) : (
            <>
              <Image
                source={{ uri: currentStory.mediaUrl }}
                style={styles.media}
                resizeMode="contain"
                onLoad={handleImageLoad}
              />
              {/* V2 - Overlay de filtre pour les photos */}
              {currentStory?.filterPreset && currentStory.filterPreset !== 'normal' && (() => {
                const overlay = getFilterOverlay(currentStory.filterPreset as FilterPreset);
                if (!overlay.overlayColor) return null;
                return (
                  <View
                    style={[
                      styles.filterOverlay,
                      {
                        backgroundColor: overlay.overlayColor,
                        opacity: overlay.overlayOpacity || 0.2,
                      },
                    ]}
                    pointerEvents="none"
                  />
                );
              })()}
            </>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={couleurs.blanc} />
            </View>
          )}
        </Pressable>

        {/* Gradient en haut */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={[styles.topGradient, { paddingTop: insets.top }]}
          pointerEvents="box-none"
        >
          {/* Barres de progression */}
          <View style={styles.progressContainer}>
            {stories.map((_, index) => (
              <View key={index} style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width:
                        index < currentIndex
                          ? '100%'
                          : index === currentIndex
                          ? progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            })
                          : '0%',
                    },
                  ]}
                />
              </View>
            ))}
          </View>

          {/* Header avec avatar et nom */}
          <View style={styles.header}>
            {/* Zone cliquable pour navigation vers profil */}
            <Pressable
              style={styles.userInfo}
              onPress={handleProfilePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Avatar
                uri={userAvatar}
                prenom={userName.split(' ')[0]}
                nom={userName.split(' ')[1] || ''}
                taille={36}
              />
              <View style={styles.userTextContainer}>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.timeAgo}>
                  {getTimeAgo(currentStory.dateCreation)}
                </Text>
              </View>
            </Pressable>

            {/* Actions header */}
            <View style={styles.headerActions}>
              {/* Bouton supprimer (uniquement pour ses propres stories) */}
              {isOwnStory && (
                <Pressable
                  style={styles.headerActionButton}
                  onPress={handleDeleteStory}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={couleurs.blanc} />
                  ) : (
                    <Ionicons name="trash-outline" size={24} color={couleurs.blanc} />
                  )}
                </Pressable>
              )}

              {/* Bouton fermer */}
              <Pressable
                style={styles.headerActionButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color={couleurs.blanc} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* Indicateur de pause */}
        {isPaused && !isLoading && (
          <View style={styles.pauseIndicator}>
            <Ionicons name="pause" size={60} color={couleurs.blanc} />
          </View>
        )}

        {/* V2 - Badge de localisation */}
        {currentStory?.location?.label && (
          <View style={[styles.locationBadge, { bottom: isOwnStory ? 80 + insets.bottom : 20 + insets.bottom }]}>
            <Ionicons name="location" size={14} color={couleurs.blanc} />
            <Text style={styles.locationBadgeText} numberOfLines={1}>
              {currentStory.location.label}
            </Text>
          </View>
        )}

        {/* Barre des vues en bas (uniquement pour ses propres stories) */}
        {isOwnStory && (
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={[styles.bottomGradient, { paddingBottom: insets.bottom + espacements.md }]}
          >
            <Pressable
              style={styles.viewersButton}
              onPress={() => {
                pauseProgress();
                setIsPaused(true);
                setViewersModalVisible(true);
              }}
            >
              <Ionicons name="eye-outline" size={20} color={couleurs.blanc} />
              <Text style={styles.viewersCount}>
                {loadingViewers ? '...' : nbVues} {nbVues === 1 ? 'vue' : 'vues'}
              </Text>
            </Pressable>
          </LinearGradient>
        )}
      </Animated.View>

      {/* Modal liste des viewers */}
      <Modal
        visible={viewersModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setViewersModalVisible(false);
          setIsPaused(false);
          resumeProgress();
        }}
      >
        <View style={styles.viewersModalOverlay}>
          <View style={[styles.viewersModalContent, { paddingBottom: insets.bottom }]}>
            {/* Header modal */}
            <View style={styles.viewersModalHeader}>
              <View style={styles.viewersModalHandle} />
              <Text style={styles.viewersModalTitle}>
                {nbVues} {nbVues === 1 ? 'vue' : 'vues'}
              </Text>
              <Pressable
                style={styles.viewersModalClose}
                onPress={() => {
                  setViewersModalVisible(false);
                  setIsPaused(false);
                  resumeProgress();
                }}
              >
                <Ionicons name="close" size={24} color={couleurs.texte} />
              </Pressable>
            </View>

            {/* Liste des viewers */}
            {viewers.length === 0 ? (
              <View style={styles.viewersEmptyContainer}>
                <Ionicons name="eye-off-outline" size={48} color={couleurs.texteSecondaire} />
                <Text style={styles.viewersEmptyText}>Aucune vue pour le moment</Text>
              </View>
            ) : (
              <FlatList
                data={viewers}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View style={styles.viewerItem}>
                    <Avatar
                      uri={item.avatar}
                      prenom={item.prenom}
                      nom={item.nom}
                      taille={44}
                    />
                    <Text style={styles.viewerName}>
                      {item.prenom} {item.nom}
                    </Text>
                  </View>
                )}
                contentContainerStyle={styles.viewersList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  // V2 - Overlay de filtre pour les photos
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: espacements.md,
    paddingBottom: espacements.xl,
  },
  progressContainer: {
    flexDirection: 'row',
    marginTop: espacements.sm,
    gap: 4,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: couleurs.blanc,
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espacements.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userTextContainer: {
    marginLeft: espacements.sm,
    flex: 1,
  },
  userName: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typographie.tailles.xs,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    opacity: 0.5,
  },
  // V2 - Badge de localisation
  locationBadge: {
    position: 'absolute',
    left: espacements.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.full,
    maxWidth: '60%',
  },
  locationBadgeText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  // Styles pour les vues
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: espacements.xxl,
    paddingHorizontal: espacements.md,
  },
  viewersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  viewersCount: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
  // Modal viewers
  viewersModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  viewersModalContent: {
    backgroundColor: couleurs.fondCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    minHeight: 200,
  },
  viewersModalHeader: {
    alignItems: 'center',
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  viewersModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: couleurs.bordure,
    borderRadius: 2,
    marginBottom: espacements.sm,
  },
  viewersModalTitle: {
    color: couleurs.texte,
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
  },
  viewersModalClose: {
    position: 'absolute',
    right: espacements.md,
    top: espacements.md,
    padding: espacements.xs,
  },
  viewersList: {
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
  },
  viewerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.sm,
    gap: espacements.md,
  },
  viewerName: {
    color: couleurs.texte,
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.medium,
  },
  viewersEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: espacements.xxxl,
  },
  viewersEmptyText: {
    color: couleurs.texteSecondaire,
    fontSize: typographie.tailles.sm,
    marginTop: espacements.md,
  },
});

export default StoryViewer;
