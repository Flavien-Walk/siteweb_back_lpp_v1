/**
 * ReelsVideoPage - Page individuelle dans le feed vertical Reels
 * Affiche une video plein ecran avec overlays Instagram-style
 * Gestes: double-tap = like, single-tap = mute/unmute, long-press = pause
 * (swipe droite = fermer est gere au niveau de reels.tsx)
 *
 * Architecture des couches (du bas vers le haut) :
 * 1. Video (expo-av) — ne recoit pas de touches
 * 2. Couche gesture transparente — capture taps + long press
 * 3. Gradients (pointerEvents="none")
 * 4. UI overlays (close, actions, auteur, progress)
 * 5. Description expandee (overlay semi-transparent, zIndex: 25)
 *
 * IMPORTANT: Toute la lecture est DECLARATIVE (props shouldPlay/isMuted/volume).
 * Aucun appel imperatif playAsync/pauseAsync/setStatusAsync pour play/pause/mute.
 * Cela elimine les race conditions entre useEffect et gestes utilisateur.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
  Share,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { couleurs, espacements } from '../constantes/theme';
import { Publication, toggleLikePublication } from '../services/publications';
import { videoRegistry } from '../stores/videoRegistry';
import { videoPlaybackStore } from '../stores/videoPlaybackStore';
import VideoActionsOverlay from './VideoActionsOverlay';
import HeartAnimation from './HeartAnimation';
import Avatar from './Avatar';
import UnifiedCommentsSheet from './UnifiedCommentsSheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReelsVideoPageProps {
  publication: Publication;
  videoUrl: string;
  posterUrl?: string;
  isActive: boolean;
  onClose: () => void;
  initialPositionMillis?: number;
  onOverlayToggle?: (open: boolean) => void;
  closeOverlayRef?: React.MutableRefObject<(() => void) | null>;
}

export default function ReelsVideoPage({
  publication,
  videoUrl,
  posterUrl,
  isActive,
  onClose,
  initialPositionMillis = 0,
  onOverlayToggle,
  closeOverlayRef,
}: ReelsVideoPageProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const videoIdRef = useRef(`reels-${publication._id}`);
  // Prefixed postId to avoid identity collision with feed PostMediaCarousel
  // Without this, setActivePostId(publication._id) makes the feed's useIsPostActive(postId)
  // return true (same ID), causing the feed video to play alongside the Reels video (double audio).
  const reelsPostId = `reels:${publication._id}`;

  // Etats video
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [holdPaused, setHoldPaused] = useState(false);
  const [showMuteIcon, setShowMuteIcon] = useState(false);

  // Etats interactions
  const [liked, setLiked] = useState(publication.aLike);
  const [likesCount, setLikesCount] = useState(publication.nbLikes);
  const [commentsCount, setCommentsCount] = useState(publication.nbCommentaires);
  const [showHeart, setShowHeart] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Ref for holdPaused (needed in worklet callbacks with [] deps)
  const holdPausedRef = useRef(false);

  // Position tracking for session save on close
  const currentPositionRef = useRef(0);
  const initialSeekDoneRef = useRef(false);

  // ========= DESCRIPTION OVERLAY ANIMATION =========
  const overlayTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.5)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closeDescriptionFnRef = useRef<() => void>(() => {});

  const openDescription = useCallback(() => {
    overlayTranslateY.setValue(SCREEN_HEIGHT * 0.5);
    backdropOpacity.setValue(0);
    setDescriptionExpanded(true);
    onOverlayToggle?.(true);
  }, [onOverlayToggle, overlayTranslateY, backdropOpacity]);

  const closeDescription = useCallback(() => {
    onOverlayToggle?.(false);
    Animated.parallel([
      Animated.timing(overlayTranslateY, {
        toValue: SCREEN_HEIGHT * 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDescriptionExpanded(false);
    });
  }, [onOverlayToggle, overlayTranslateY, backdropOpacity]);

  // Keep ref in sync for PanResponder (created once, needs latest fn)
  closeDescriptionFnRef.current = closeDescription;

  // Animate open when descriptionExpanded becomes true
  useEffect(() => {
    if (descriptionExpanded) {
      Animated.parallel([
        Animated.spring(overlayTranslateY, {
          toValue: 0,
          damping: 22,
          mass: 1,
          stiffness: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [descriptionExpanded]);

  // Expose closeDescription to parent (reels.tsx) only when overlay is open on active page
  useEffect(() => {
    if (closeOverlayRef) {
      closeOverlayRef.current = (isActive && descriptionExpanded) ? closeDescription : null;
    }
  }, [closeOverlayRef, closeDescription, isActive, descriptionExpanded]);

  // Close overlay when page becomes inactive (e.g. user swiped to next video)
  useEffect(() => {
    if (!isActive && descriptionExpanded) {
      setDescriptionExpanded(false);
      onOverlayToggle?.(false);
      overlayTranslateY.setValue(SCREEN_HEIGHT * 0.5);
      backdropOpacity.setValue(0);
    }
  }, [isActive]);

  // PanResponder for drag handle — swipe down to dismiss overlay
  const dragHandlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          overlayTranslateY.setValue(gs.dy);
          backdropOpacity.setValue(Math.max(0, 1 - gs.dy / (SCREEN_HEIGHT * 0.3)));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          closeDescriptionFnRef.current();
        } else {
          Animated.parallel([
            Animated.spring(overlayTranslateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 200,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // ========= DECLARATIVE VIDEO CONTROL =========
  // Single source of truth: shouldPlay is computed from state, no imperative calls
  const shouldPlay = isActive && !holdPaused && !commentsVisible;

  // Memoize source objects to prevent expo-av from reloading video on every re-render
  const videoSource = useMemo(() => ({ uri: videoUrl }), [videoUrl]);
  const videoPosterSource = useMemo(
    () => posterUrl ? { uri: posterUrl } : undefined,
    [posterUrl]
  );

  // Auto-hide mute icon after 800ms
  useEffect(() => {
    if (showMuteIcon) {
      const timer = setTimeout(() => setShowMuteIcon(false), 800);
      return () => clearTimeout(timer);
    }
  }, [showMuteIcon]);

  // Register/unregister video in registry
  useEffect(() => {
    const id = videoIdRef.current;
    if (videoRef.current) {
      videoRegistry.registerVideo(id, videoRef.current, reelsPostId, videoUrl);
    }
    return () => {
      videoRegistry.stopAndUnregister(id).catch(() => {});
    };
  }, [publication._id, videoUrl]);

  // Save position to session store on unmount (for feed restore)
  useEffect(() => {
    return () => {
      if (currentPositionRef.current > 0) {
        videoPlaybackStore.saveSession(videoUrl, currentPositionRef.current, false);
      }
    };
  }, [videoUrl]);

  // Stop other videos + update store when this page becomes active
  useEffect(() => {
    if (isActive) {
      videoRegistry.stopAllExcept(reelsPostId).catch(() => {});
      videoPlaybackStore.setActivePostId(reelsPostId);
      videoPlaybackStore.setActiveVideo(videoUrl);
    }
    // No imperative pause on !isActive — shouldPlay prop handles it
  }, [isActive, publication._id, videoUrl]);

  // Playback status update — tracks position + applies initial seek once
  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.warn('[ReelsVideoPage] Playback error:', status.error);
      }
      return;
    }

    // Track position for session save on close
    currentPositionRef.current = status.positionMillis;

    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);

    if (status.durationMillis) {
      setDuration(status.durationMillis);
      setProgress(status.positionMillis / status.durationMillis);
    }

    // Initial seek (once, on first load) — resume from feed position
    if (!initialSeekDoneRef.current && initialPositionMillis > 0) {
      initialSeekDoneRef.current = true;
      videoRef.current?.setPositionAsync(initialPositionMillis).catch(() => {});
    }
  }, [initialPositionMillis]);

  // Toggle like
  const handleToggleLike = useCallback(async () => {
    const wasLiked = liked;
    const prevCount = likesCount;

    setLiked(!wasLiked);
    setLikesCount(wasLiked ? prevCount - 1 : prevCount + 1);

    try {
      const response = await toggleLikePublication(publication._id);
      if (response.succes && response.data) {
        setLiked(response.data.aLike);
        setLikesCount(response.data.nbLikes);
      }
    } catch {
      setLiked(wasLiked);
      setLikesCount(prevCount);
    }
  }, [liked, likesCount, publication._id]);

  // JS callbacks pour les worklets
  const doDoubleTapLike = useCallback(() => {
    if (!liked) {
      handleToggleLike();
    }
    setShowHeart(true);
  }, [liked, handleToggleLike]);

  // Mute: just toggle state — the isMuted + volume props on Video handle the rest
  const doToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    setShowMuteIcon(true);
  }, []);

  // Long press pause: just toggle state — shouldPlay prop handles play/pause
  const doPauseForHold = useCallback(() => {
    holdPausedRef.current = true;
    setHoldPaused(true);
  }, []);

  const doResumeAfterHold = useCallback(() => {
    if (holdPausedRef.current) {
      holdPausedRef.current = false;
      setHoldPaused(false);
    }
  }, []);

  // ========= GESTES =========

  // Double-tap : like
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .enabled(!descriptionExpanded)
    .onEnd(() => {
      'worklet';
      runOnJS(doDoubleTapLike)();
    });

  // Single-tap : mute/unmute (attend que double-tap echoue)
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .enabled(!descriptionExpanded)
    .requireExternalGestureToFail(doubleTapGesture)
    .onEnd(() => {
      'worklet';
      runOnJS(doToggleMute)();
    });

  // Long press : maintenir pour pause, relacher pour reprendre
  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .enabled(!descriptionExpanded)
    .onStart(() => {
      'worklet';
      runOnJS(doPauseForHold)();
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(doResumeAfterHold)();
    });

  // Composer : taps (double > single) en simultane avec long press
  const tapGestures = Gesture.Exclusive(doubleTapGesture, singleTapGesture);
  const composedGesture = Gesture.Simultaneous(tapGestures, longPressGesture);

  // Open comments
  const handleOpenComments = useCallback(() => {
    setCommentsVisible(true);
  }, []);

  // Share
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: publication.contenu
          ? `${publication.contenu.substring(0, 100)}...`
          : 'Regarde cette video !',
      });
    } catch {}
  }, [publication.contenu]);

  // Navigate to author profile
  const handleNavigateToProfile = useCallback(() => {
    router.push({
      pathname: '/(app)/utilisateur/[id]',
      params: { id: publication.auteur._id },
    });
  }, [router, publication.auteur._id]);

  // Comment added callback
  const handleCommentAdded = useCallback(() => {
    setCommentsCount(prev => prev + 1);
  }, []);

  return (
    <View style={styles.container}>
      {/* Couche 1 : Video — 100% declaratif, zero appel imperatif */}
      <Video
        ref={videoRef}
        source={videoSource}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay={shouldPlay}
        isMuted={isMuted}
        volume={isMuted ? 0.0 : 1.0}
        posterSource={videoPosterSource}
        posterStyle={styles.poster}
        usePoster={!!posterUrl}
        onPlaybackStatusUpdate={handlePlaybackStatus}
      />

      {/* Couche 2 : Zone de capture des gestes (transparente, PAR-DESSUS la video) */}
      <GestureDetector gesture={composedGesture}>
        <View style={styles.gestureLayer} collapsable={false}>
          {/* Loading indicator */}
          {isLoading && isActive && (
            <ActivityIndicator size="large" color={couleurs.blanc} />
          )}

          {/* Mute/unmute icon (visible briefly after tap) */}
          {showMuteIcon && (
            <View style={styles.muteIconCircle} pointerEvents="none">
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={30}
                color={couleurs.blanc}
              />
            </View>
          )}

          {/* Hold-to-pause indicator */}
          {holdPaused && (
            <View style={styles.pauseIconCircle} pointerEvents="none">
              <Ionicons name="pause" size={36} color={couleurs.blanc} />
            </View>
          )}

          {/* Heart animation (double-tap) */}
          <HeartAnimation
            visible={showHeart}
            onAnimationEnd={() => setShowHeart(false)}
            size={100}
          />
        </View>
      </GestureDetector>

      {/* Couche 3 : Gradients (pas de touches) */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent']}
        style={[styles.topGradient, { paddingTop: insets.top }]}
        pointerEvents="none"
      />

      {/* Couche 4 : UI overlays (boutons interactifs) */}
      <Pressable
        style={[styles.closeButton, { top: insets.top + espacements.sm }]}
        onPress={onClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={28} color={couleurs.blanc} style={styles.iconShadow} />
      </Pressable>

      <VideoActionsOverlay
        liked={liked}
        likesCount={likesCount}
        commentsCount={commentsCount}
        onLike={handleToggleLike}
        onComments={handleOpenComments}
        onShare={handleShare}
      />

      <View style={[styles.authorContainer, { bottom: insets.bottom + 60 }]} pointerEvents="box-none">
        <Pressable style={styles.authorRow} onPress={handleNavigateToProfile}>
          <Avatar
            uri={publication.auteur.avatar}
            prenom={publication.auteur.prenom}
            nom={publication.auteur.nom}
            taille={36}
          />
          <Text style={styles.authorName} numberOfLines={1}>
            {publication.auteur.prenom} {publication.auteur.nom}
          </Text>
        </Pressable>
        {publication.contenu ? (
          <Pressable onPress={openDescription}>
            <Text style={styles.description} numberOfLines={2}>
              {publication.contenu}
            </Text>
            {publication.contenu.length > 80 && (
              <Text style={styles.voirPlus}>voir plus</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.progressBarContainer, { bottom: insets.bottom + 8 }]} pointerEvents="none">
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Couche 5 : Description overlay anime (backdrop + sheet) */}
      {descriptionExpanded && publication.contenu ? (
        <>
          {/* Dim backdrop — tap to close */}
          <Animated.View
            style={[styles.descriptionBackdrop, { opacity: backdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeDescription}
            />
          </Animated.View>

          {/* Animated bottom sheet */}
          <Animated.View
            style={[
              styles.descriptionSheet,
              {
                paddingBottom: insets.bottom + 20,
                transform: [{ translateY: overlayTranslateY }],
              },
            ]}
          >
            {/* Drag handle — swipe down to dismiss */}
            <View {...dragHandlePanResponder.panHandlers} style={styles.dragHandleArea}>
              <View style={styles.dragHandle} />
            </View>

            <ScrollView
              style={styles.descriptionScroll}
              contentContainerStyle={styles.descriptionScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.descriptionExpandedHeader}>
                <Pressable style={styles.authorRow} onPress={handleNavigateToProfile}>
                  <Avatar
                    uri={publication.auteur.avatar}
                    prenom={publication.auteur.prenom}
                    nom={publication.auteur.nom}
                    taille={32}
                  />
                  <Text style={styles.authorName} numberOfLines={1}>
                    {publication.auteur.prenom} {publication.auteur.nom}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.descriptionFullText}>
                {publication.contenu}
              </Text>
              <Pressable
                onPress={closeDescription}
                style={styles.voirMoinsButton}
              >
                <Text style={styles.voirMoinsText}>voir moins</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </>
      ) : null}

      {/* Comments sheet */}
      <UnifiedCommentsSheet
        postId={commentsVisible ? publication._id : null}
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        onCommentAdded={handleCommentAdded}
        mode="embedded"
        theme="dark"
        initialCount={commentsCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  poster: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resizeMode: 'contain',
  },
  // Couche transparente par-dessus la video qui capture tous les gestes
  gestureLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.001)',
  },
  muteIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 300,
    zIndex: 2,
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
    zIndex: 2,
  },
  closeButton: {
    position: 'absolute',
    left: espacements.md,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  authorContainer: {
    position: 'absolute',
    left: espacements.md,
    right: 80,
    zIndex: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  authorName: {
    color: couleurs.blanc,
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    flexShrink: 1,
  },
  description: {
    color: couleurs.blanc,
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  voirPlus: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  progressBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    zIndex: 15,
  },
  progressBarBg: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: couleurs.blanc,
  },
  // Description overlay anime
  descriptionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 25,
  },
  descriptionSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_HEIGHT * 0.55,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 26,
    paddingHorizontal: espacements.md,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  descriptionScroll: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  descriptionScrollContent: {
    paddingBottom: 20,
  },
  descriptionExpandedHeader: {
    marginBottom: 12,
  },
  descriptionFullText: {
    color: couleurs.blanc,
    fontSize: 14,
    lineHeight: 21,
  },
  voirMoinsButton: {
    marginTop: 12,
    paddingVertical: 4,
  },
  voirMoinsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
});
