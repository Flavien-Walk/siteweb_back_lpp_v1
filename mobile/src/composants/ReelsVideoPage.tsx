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
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
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
}

export default function ReelsVideoPage({
  publication,
  videoUrl,
  posterUrl,
  isActive,
  onClose,
}: ReelsVideoPageProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const videoRef = useRef<Video>(null);
  const videoIdRef = useRef(`reels-${publication._id}`);

  // Etats video
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showMuteIcon, setShowMuteIcon] = useState(false);
  const [holdPaused, setHoldPaused] = useState(false);

  // Etats interactions
  const [liked, setLiked] = useState(publication.aLike);
  const [likesCount, setLikesCount] = useState(publication.nbLikes);
  const [commentsCount, setCommentsCount] = useState(publication.nbCommentaires);
  const [showHeart, setShowHeart] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Refs pour acceder aux etats depuis les worklets
  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  const isMutedRef = useRef(false);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  const holdPausedRef = useRef(false);

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
      videoRegistry.registerVideo(id, videoRef.current, publication._id, videoUrl);
    }
    return () => {
      videoRegistry.stopAndUnregister(id).catch(() => {});
    };
  }, [publication._id, videoUrl]);

  // Play/pause based on isActive
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      videoRegistry.stopAllExcept(publication._id).then(() => {
        videoRef.current?.playAsync().catch(() => {});
      });
      videoPlaybackStore.setActivePostId(publication._id);
      videoPlaybackStore.setActiveVideo(videoUrl);
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [isActive, publication._id, videoUrl]);

  // Pause video when comments are open
  useEffect(() => {
    if (!videoRef.current || !isActive) return;
    if (commentsVisible) {
      videoRef.current.pauseAsync().catch(() => {});
    } else {
      videoRef.current.playAsync().catch(() => {});
    }
  }, [commentsVisible, isActive]);

  // Playback status update
  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.warn('[ReelsVideoPage] Playback error:', status.error);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setIsLoading(status.isBuffering);

    if (status.durationMillis) {
      setDuration(status.durationMillis);
      setProgress(status.positionMillis / status.durationMillis);
    }
  }, []);

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

  const doToggleMute = useCallback(() => {
    const newMuted = !isMutedRef.current;
    setIsMuted(newMuted);
    setShowMuteIcon(true);
    // Imperative call — expo-av prop isMuted is not reliably reactive
    videoRef.current?.setStatusAsync({ isMuted: newMuted }).catch(() => {});
  }, []);

  const doPauseForHold = useCallback(() => {
    if (videoRef.current) {
      // Always pause, regardless of isPlaying state (avoids buffering guard skip)
      videoRef.current.setStatusAsync({ shouldPlay: false }).catch(() => {});
      holdPausedRef.current = true;
      setHoldPaused(true);
    }
  }, []);

  const doResumeAfterHold = useCallback(() => {
    if (videoRef.current && holdPausedRef.current) {
      videoRef.current.setStatusAsync({ shouldPlay: true }).catch(() => {});
      holdPausedRef.current = false;
      setHoldPaused(false);
    }
  }, []);

  // ========= GESTES =========

  // Double-tap : like
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd(() => {
      'worklet';
      runOnJS(doDoubleTapLike)();
    });

  // Single-tap : mute/unmute (attend que double-tap echoue)
  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .requireExternalGestureToFail(doubleTapGesture)
    .onEnd(() => {
      'worklet';
      runOnJS(doToggleMute)();
    });

  // Long press : maintenir pour pause, relacher pour reprendre
  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
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
      {/* Couche 1 : Video (fond, ne recoit pas de touches) */}
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted={isMuted}
        posterSource={posterUrl ? { uri: posterUrl } : undefined}
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
          <Pressable onPress={() => setDescriptionExpanded(true)}>
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

      {/* Couche 5 : Description expandee (overlay) */}
      {descriptionExpanded && publication.contenu ? (
        <Pressable
          style={[styles.descriptionOverlay, { paddingBottom: insets.bottom + 80 }]}
          onPress={() => setDescriptionExpanded(false)}
        >
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
              onPress={() => setDescriptionExpanded(false)}
              style={styles.voirMoinsButton}
            >
              <Text style={styles.voirMoinsText}>voir moins</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
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
    resizeMode: 'cover',
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
  // Description expandee overlay
  descriptionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 25,
    justifyContent: 'flex-end',
  },
  descriptionScroll: {
    maxHeight: SCREEN_HEIGHT * 0.5,
    marginHorizontal: espacements.md,
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
