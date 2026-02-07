/**
 * VideoPlayerModal - Lecteur vidéo plein écran style Instagram/LinkedIn
 * Composant partagé pour garantir la même expérience sur toutes les pages
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs } from '../constantes/theme';
import { videoPlaybackStore } from '../stores/videoPlaybackStore';
import { videoRegistry } from '../stores/videoRegistry';
import { useDoubleTap } from '../hooks/useDoubleTap';
import HeartAnimation from './HeartAnimation';
import VideoActionsOverlay from './VideoActionsOverlay';
import UnifiedCommentsSheet from './UnifiedCommentsSheet';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const FULLSCREEN_VIDEO_ID = 'fullscreen-modal';
const SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.2; // 20% pour fermer
const VELOCITY_THRESHOLD = 800;

export type VideoOrigin = 'feed' | 'profil' | 'post' | 'story';

interface VideoPlayerModalProps {
  visible: boolean;
  videoUrl: string | null;
  onClose: (finalPositionMillis?: number) => void;
  /** Image de preview affichée avant le chargement */
  posterUrl?: string;
  /** Lecture automatique (défaut: true) - ignoré si initialShouldPlay est fourni */
  autoPlay?: boolean;
  /** Position initiale en millisecondes (pour continuité avec preview) */
  initialPositionMillis?: number;
  /** État de lecture initial (pour continuité avec preview) */
  initialShouldPlay?: boolean;
  /** Origine de l'ouverture pour analytics */
  origin?: VideoOrigin;
  /** ID du post parent (pour tracking et registry) */
  postId?: string;
  // Props pour interactions Instagram-like
  /** Post est liké par l'utilisateur */
  liked?: boolean;
  /** Nombre de likes */
  likesCount?: number;
  /** Nombre de commentaires */
  commentsCount?: number;
  /** Nombre de partages */
  sharesCount?: number;
  /** Callback pour toggle like */
  onLike?: () => void;
  /** Callback pour ouvrir les commentaires */
  onComments?: () => void;
  /** Callback pour partager */
  onShare?: () => void;
}

export default function VideoPlayerModal({
  visible,
  videoUrl,
  onClose,
  posterUrl,
  autoPlay = true,
  initialPositionMillis,
  initialShouldPlay,
  origin,
  postId,
  // Props Instagram-like
  liked = false,
  likesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  onLike,
  onComments,
  onShare,
}: VideoPlayerModalProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  // Comments sheet state - géré en interne, pas besoin de callback parent
  const [commentsOpen, setCommentsOpen] = useState(false);
  // Track comments count locally for live updates
  const [localCommentsCount, setLocalCommentsCount] = useState(commentsCount);
  // OPTIMISTIC UI: Local state pour like instantané
  const [localLiked, setLocalLiked] = useState(liked);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Swipe-down gesture state
  const translateY = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;
  const isSwipeClosing = useRef(false);

  // Track if we've already applied the initial position
  const hasAppliedInitialPosition = useRef(false);
  // Track current position for resync on close
  const currentPositionRef = useRef<number>(0);

  // Determine effective autoPlay: use initialShouldPlay if provided, otherwise autoPlay
  const effectiveShouldPlay = initialShouldPlay !== undefined ? initialShouldPlay : autoPlay;

  // Sync localCommentsCount with prop
  useEffect(() => {
    setLocalCommentsCount(commentsCount);
  }, [commentsCount]);

  // Sync localLiked et localLikesCount avec les props (quand parent se met à jour)
  useEffect(() => {
    setLocalLiked(liked);
  }, [liked]);

  useEffect(() => {
    setLocalLikesCount(likesCount);
  }, [likesCount]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      hasAppliedInitialPosition.current = false;
      setIsPlaying(effectiveShouldPlay);
      setIsMuted(false);
      setVideoDuration(0);
      setVideoPosition(initialPositionMillis || 0);
      currentPositionRef.current = initialPositionMillis || 0;
      setShowControls(true);
      controlsOpacity.setValue(1);
      setCommentsOpen(false); // Reset comments state
      // Sync like state from props on open
      setLocalLiked(liked);
      setLocalLikesCount(likesCount);
    }
  }, [visible, effectiveShouldPlay, initialPositionMillis, liked, likesCount]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Registry management: stop all other videos when fullscreen opens
  useEffect(() => {
    if (visible && videoUrl) {
      const fullscreenVideoId = `${FULLSCREEN_VIDEO_ID}-${postId || 'unknown'}`;

      // Stop ALL other videos before fullscreen plays
      videoRegistry.stopAll().then(() => {
        if (videoRef.current) {
          videoRegistry.registerVideo(fullscreenVideoId, videoRef.current, fullscreenVideoId, videoUrl);
        }
      }).catch(() => {});

      // Cleanup: unregister when modal closes
      return () => {
        videoRegistry.stopAndUnregister(fullscreenVideoId).catch(() => {});
      };
    }
  }, [visible, videoUrl, postId]);

  // Update registry ref when video loads
  useEffect(() => {
    if (visible && videoUrl && videoRef.current) {
      const fullscreenVideoId = `${FULLSCREEN_VIDEO_ID}-${postId || 'unknown'}`;
      videoRegistry.updateVideoRef(fullscreenVideoId, videoRef.current, videoUrl);
    }
  }, [visible, videoUrl, postId, videoRef.current]);

  const togglePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
      resetControlsTimeout();
    }
  };

  const toggleMute = async () => {
    if (videoRef.current) {
      await videoRef.current.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
      resetControlsTimeout();
    }
  };

  const seekVideo = async (value: number) => {
    if (videoRef.current && videoDuration > 0) {
      await videoRef.current.setPositionAsync(value);
      resetControlsTimeout();
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowControls(false));
      }
    }, 3000);
  };

  const handleVideoTap = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (showControls) {
      Animated.timing(controlsOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setShowControls(false));
    } else {
      setShowControls(true);
      Animated.timing(controlsOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  // OPTIMISTIC UI: Handler pour like avec mise à jour immédiate
  const handleLike = useCallback(() => {
    // Optimistic update immédiat
    setLocalLiked(prev => !prev);
    setLocalLikesCount(prev => localLiked ? prev - 1 : prev + 1);
    // Appeler le callback parent
    if (onLike) {
      onLike();
    }
  }, [onLike, localLiked]);

  // Double-tap like handler - toggle like (même comportement que le feed)
  const handleDoubleTapLike = useCallback(() => {
    // Animation coeur
    setShowHeartAnimation(true);
    // Toggle like - comportement identique au feed
    setLocalLiked(prev => !prev);
    setLocalLikesCount(prev => localLiked ? prev - 1 : prev + 1);
    if (onLike) {
      onLike();
    }
  }, [onLike, localLiked]);

  // Single tap = toggle controls, double tap = like
  const handleTap = useDoubleTap({
    onDoubleTap: handleDoubleTapLike,
    onSingleTap: handleVideoTap,
    delayMs: 250,
  });

  // ============================================================
  // SWIPE-DOWN GESTURE - Fermeture par glissement vers le bas
  // ============================================================
  const onSwipeGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { translationY } = event.nativeEvent;
      // Only allow downward swipe
      if (translationY > 0 && !commentsOpen) {
        translateY.setValue(translationY);
        // Fade background as user swipes
        const progress = Math.min(translationY / SWIPE_THRESHOLD, 1);
        backgroundOpacity.setValue(1 - progress * 0.5);
      }
    },
    [translateY, backgroundOpacity, commentsOpen]
  );

  const onSwipeStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { state, translationY, velocityY } = event.nativeEvent;

      if (state === State.END && !commentsOpen) {
        const shouldClose =
          translationY > SWIPE_THRESHOLD ||
          (velocityY > VELOCITY_THRESHOLD && translationY > 50);

        if (shouldClose && !isSwipeClosing.current) {
          isSwipeClosing.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          // Animate out
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SCREEN_HEIGHT,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Fermer d'abord — ne PAS reset les valeurs ici
            // Le useEffect sur visible les remettra à zéro à la réouverture
            isSwipeClosing.current = false;
            handleClose();
          });
        } else {
          // Spring back
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }),
            Animated.spring(backgroundOpacity, {
              toValue: 1,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }),
          ]).start();
        }
      }
    },
    [translateY, backgroundOpacity, commentsOpen]
  );

  // Reset swipe state + fade-in when modal opens
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      isSwipeClosing.current = false;
      // Fade-in fluide à l'ouverture (remplace animationType="fade" du Modal)
      backgroundOpacity.setValue(0);
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY, backgroundOpacity]);

  // ============================================================
  // COMMENTS SHEET CALLBACKS - Pause/Resume vidéo selon mode READ/WRITE
  // ============================================================
  const handleCommentsBeginTyping = useCallback(async () => {
    // Mode WRITE: Mettre la vidéo en pause
    if (__DEV__) {
      console.log('🎬 [VIDEO] Comments WRITE mode → pausing video');
    }
    try {
      await videoRef.current?.pauseAsync();
      setIsPlaying(false);
    } catch {
      // Ignore errors
    }
  }, []);

  const handleCommentsEndTyping = useCallback(async () => {
    // Mode READ: Reprendre la lecture (si vidéo n'était pas finie)
    if (__DEV__) {
      console.log('🎬 [VIDEO] Comments READ mode → resuming video');
    }
    try {
      await videoRef.current?.playAsync();
      setIsPlaying(true);
    } catch {
      // Ignore errors
    }
  }, []);

  const handleClose = async () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    // Get final position and play state before closing (for resync)
    let finalPosition = currentPositionRef.current;
    let wasPlaying = isPlaying;
    try {
      const status = await videoRef.current?.getStatusAsync();
      if (status?.isLoaded) {
        finalPosition = status.positionMillis || 0;
        wasPlaying = status.isPlaying;
      }
    } catch {
      // Use cached values
    }

    // Save to global store for preview resync
    if (videoUrl) {
      videoPlaybackStore.saveSession(videoUrl, finalPosition, wasPlaying);
    }

    // Reset state
    setIsPlaying(autoPlay);
    setIsMuted(false);
    setVideoDuration(0);
    setVideoPosition(0);
    setShowControls(true);
    controlsOpacity.setValue(1);

    // Pass final position to parent for resync
    onClose(finalPosition);
  };

  const handlePlaybackStatusUpdate = async (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setVideoDuration(status.durationMillis || 0);
      setVideoPosition(status.positionMillis || 0);
      currentPositionRef.current = status.positionMillis || 0;
      setIsPlaying(status.isPlaying);

      // Apply initial position once when video first loads
      if (!hasAppliedInitialPosition.current && initialPositionMillis && initialPositionMillis > 0) {
        hasAppliedInitialPosition.current = true;
        try {
          await videoRef.current?.setPositionAsync(initialPositionMillis);
          // Apply play state after seeking
          if (effectiveShouldPlay) {
            await videoRef.current?.playAsync();
          }
        } catch (e) {
          // Ignore seek errors
        }
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
        setShowControls(true);
        controlsOpacity.setValue(1);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View style={[styles.modalBackground, { opacity: backgroundOpacity }]} />
      <PanGestureHandler
        onGestureEvent={onSwipeGestureEvent}
        onHandlerStateChange={onSwipeStateChange}
        activeOffsetY={20}
        failOffsetX={[-20, 20]}
        enabled={!commentsOpen}
      >
        <Animated.View
          style={[
            styles.videoModalContainer,
            { opacity: backgroundOpacity, transform: [{ translateY }] },
          ]}
        >
        {/* Video */}
        {videoUrl && (
          <View style={styles.videoTouchArea}>
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.videoPlayer}
              resizeMode={ResizeMode.CONTAIN}
              // If initial position provided, don't autoplay - we'll play after seeking
              shouldPlay={initialPositionMillis ? false : effectiveShouldPlay}
              isMuted={isMuted}
              isLooping={false}
              posterSource={posterUrl ? { uri: posterUrl } : undefined}
              posterStyle={styles.videoPlayer}
              usePoster={!!posterUrl}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />
          </View>
        )}

        {/* Overlay gradient haut - masqué quand comments ouverts */}
        {!commentsOpen && (
          <Animated.View
            style={[styles.videoGradientTop, { opacity: controlsOpacity }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}

        {/* Overlay gradient bas - masqué quand comments ouverts */}
        {!commentsOpen && (
          <Animated.View
            style={[styles.videoGradientBottom, { opacity: controlsOpacity }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}

        {/* Bouton fermer - TOUJOURS visible (même avec comments) */}
        <Animated.View
          style={[styles.videoCloseContainer, { opacity: commentsOpen ? 1 : controlsOpacity }]}
          pointerEvents={commentsOpen || showControls ? 'auto' : 'none'}
        >
          <Pressable
            style={styles.videoCloseBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={26} color={couleurs.blanc} />
          </Pressable>
        </Animated.View>

        {/* Zone de tap pour toggle les controles / double-tap like - désactivé quand comments ouverts */}
        {!commentsOpen && (
          <Pressable
            style={styles.videoCenterControl}
            onPress={handleTap}
          >
            {/* Bouton Play/Pause central */}
            {showControls && (
              <Animated.View style={{ opacity: controlsOpacity }}>
                <Pressable
                  style={styles.videoCenterBtn}
                  onPress={togglePlayPause}
                >
                  <View style={styles.videoCenterBtnInner}>
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={44}
                      color={couleurs.blanc}
                      style={!isPlaying ? { marginLeft: 4 } : undefined}
                    />
                  </View>
                </Pressable>
              </Animated.View>
            )}
          </Pressable>
        )}

        {/* Heart Animation - Double tap like */}
        <HeartAnimation
          visible={showHeartAnimation}
          onAnimationEnd={() => setShowHeartAnimation(false)}
          size={120}
        />

        {/* Actions Overlay - masqué quand comments ouverts (sauf si external via onComments) */}
        {!commentsOpen && (onLike || postId || onShare) && (
          <VideoActionsOverlay
            liked={localLiked}
            likesCount={localLikesCount}
            commentsCount={localCommentsCount}
            sharesCount={sharesCount}
            onLike={handleLike}
            onComments={onComments || (() => setCommentsOpen(true))}
            onShare={onShare || (() => {})}
            visible={true}
          />
        )}

        {/* Controles bas - masqués quand comments ouverts */}
        {!commentsOpen && (
          <Animated.View
            style={[styles.videoBottomControls, { opacity: controlsOpacity }]}
            pointerEvents={showControls ? 'auto' : 'none'}
          >
            {/* Barre de progression */}
            <Pressable
              style={styles.videoProgressBar}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const progress = locationX / (SCREEN_WIDTH - 32);
                const newPosition = progress * videoDuration;
                seekVideo(Math.max(0, Math.min(newPosition, videoDuration)));
              }}
            >
              <View style={styles.videoProgressTrack}>
                <View
                  style={[
                    styles.videoProgressFill,
                    {
                      width: videoDuration > 0
                        ? `${(videoPosition / videoDuration) * 100}%`
                        : '0%',
                    },
                  ]}
                />
              </View>
            </Pressable>

            {/* Ligne de controles */}
            <View style={styles.videoControlsRow}>
              {/* Temps */}
              <View style={styles.videoTimeContainer}>
                <Text style={styles.videoTimeText}>
                  {formatTime(videoPosition)} <Text style={styles.videoTimeSeparator}>/</Text> {formatTime(videoDuration)}
                </Text>
              </View>

              {/* Boutons droite */}
              <View style={styles.videoRightControls}>
                {/* Bouton Mute */}
                <Pressable
                  style={styles.videoSmallBtn}
                  onPress={toggleMute}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isMuted ? 'volume-mute' : 'volume-high'}
                    size={22}
                    color={couleurs.blanc}
                  />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Comments Sheet - rendu EN DERNIER pour être au-dessus de tout */}
        <UnifiedCommentsSheet
          postId={postId || null}
          visible={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          onCommentAdded={() => setLocalCommentsCount(prev => prev + 1)}
          mode="embedded"
          theme="dark"
          initialCount={localCommentsCount}
          onBeginTyping={handleCommentsBeginTyping}
          onEndTyping={handleCommentsEndTyping}
        />
        </Animated.View>
      </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoTouchArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  videoGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  videoGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 160 : 200,
  },
  videoCloseContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 16,
    zIndex: 10,
  },
  videoCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCenterControl: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCenterBtn: {
    padding: 8,
  },
  videoCenterBtnInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  videoBottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 72,
  },
  videoProgressBar: {
    height: 24,
    justifyContent: 'center',
    marginBottom: 8,
  },
  videoProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: couleurs.primaire,
    borderRadius: 1.5,
  },
  videoControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoTimeText: {
    fontSize: 13,
    color: couleurs.blanc,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  videoTimeSeparator: {
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  videoRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  videoSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
