/**
 * PostMediaCarousel - Carrousel multi-média pour publications
 * Affiche images et vidéos avec pagination dots et indicateur "1/5"
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  Image,
  Dimensions,
  StyleSheet,
  Pressable,
  ViewToken,
  Animated,
  Text,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, rayons, espacements } from '../constantes/theme';
import { MediaItem } from '../services/publications';
import { videoPlaybackStore, useVideoPlaybackSession, useIsPostActive } from '../stores/videoPlaybackStore';
import { videoRegistry } from '../stores/videoRegistry';
import { useDoubleTap } from '../hooks/useDoubleTap';
import HeartAnimation from './HeartAnimation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Paramètres passés lors de l'ouverture plein écran */
export interface VideoFullscreenParams {
  videoUrl: string;
  thumbnailUrl?: string;
  positionMillis: number;
  isPlaying: boolean;
}

interface PostMediaCarouselProps {
  medias: MediaItem[];
  /** ID unique du post (pour le registry vidéo) */
  postId: string;
  width?: number;
  height?: number;
  onMediaPress?: (index: number) => void;
  /** Callback pour ouvrir une vidéo en plein écran avec position et état */
  onVideoPress?: (params: VideoFullscreenParams) => void;
  /** Callback pour resync position au retour du plein écran */
  onVideoPositionSync?: (videoUrl: string, positionMillis: number) => void;
  showIndicator?: boolean;
  showDots?: boolean;
  autoPlayVideos?: boolean;
  /** Double-tap like support */
  liked?: boolean;
  /** Callback pour double-tap like */
  onDoubleTapLike?: () => void;
}

interface MediaItemRendererProps {
  item: MediaItem;
  index: number;
  /** ID unique du post parent (pour le registry vidéo) */
  postId: string;
  width: number;
  height: number;
  isActive: boolean;
  onPress?: () => void;
  onVideoPress?: (params: VideoFullscreenParams) => void;
  /** Position à appliquer au retour du plein écran (en millis) */
  syncPositionMillis?: number;
  autoPlayVideos: boolean;
  /** Double-tap like support */
  liked?: boolean;
  onDoubleTapLike?: () => void;
}

const MediaItemRenderer: React.FC<MediaItemRendererProps> = React.memo(({
  item,
  postId,
  width,
  height,
  isActive,
  onPress,
  onVideoPress,
  syncPositionMillis,
  autoPlayVideos,
  liked,
  onDoubleTapLike,
}) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(!autoPlayVideos);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  // Track current position for fullscreen handoff
  const currentPositionRef = useRef<number>(0);
  // Track if we need to apply a pending session after load
  const pendingSessionRef = useRef<{ position: number } | null>(null);
  // Track registration status
  const isRegisteredRef = useRef(false);
  // Track long-press-to-pause state
  const holdPausedRef = useRef(false);
  const [holdPaused, setHoldPaused] = useState(false);
  // Unique ID for this video in the registry
  const videoId = `${postId}-${item.url}`;

  // Listen to store for session updates (from fullscreen close)
  const { session } = useVideoPlaybackSession(item.url);

  // PRIMARY SOURCE OF TRUTH: Is this post the active post?
  const isPostActive = useIsPostActive(postId);
  const isGloballyActive = isPostActive;

  // Register video with registry on mount, hard stop + unregister on unmount
  useEffect(() => {
    if (item.type !== 'video') return;

    // Register when ref is available (pass URI for debug)
    if (videoRef.current && !isRegisteredRef.current) {
      videoRegistry.registerVideo(videoId, videoRef.current, postId, item.url);
      isRegisteredRef.current = true;
    }

    // Cleanup: hard stop + unregister on unmount (critical for FlatList recycling)
    return () => {
      if (isRegisteredRef.current) {
        videoRegistry.stopAndUnregister(videoId).catch(() => {});
        isRegisteredRef.current = false;
      }
    };
  }, [videoId, postId, item.type, item.url]);

  // Update registry ref when video loads (ref might not be ready at mount)
  useEffect(() => {
    if (item.type === 'video' && videoRef.current && isLoaded) {
      if (!isRegisteredRef.current) {
        videoRegistry.registerVideo(videoId, videoRef.current, postId, item.url);
        isRegisteredRef.current = true;
      } else {
        videoRegistry.updateVideoRef(videoId, videoRef.current, item.url);
      }
    }
  }, [videoId, postId, item.type, item.url, isLoaded]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoaded(true);
      setIsPlaying(status.isPlaying);
      setShowPlayButton(!status.isPlaying);
      // Track position for fullscreen handoff
      currentPositionRef.current = status.positionMillis || 0;

      // Apply pending position restore if video just loaded
      // Only restore POSITION — play/pause is handled by shouldPlay prop
      if (pendingSessionRef.current) {
        const { position } = pendingSessionRef.current;
        pendingSessionRef.current = null;
        videoRef.current?.setPositionAsync(position).catch(() => {});
      }
    }
  }, []);

  // Toggle play/pause by changing global active state — shouldPlay prop handles the rest
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      // Deactivate this post → shouldPlay becomes false
      videoPlaybackStore.setActivePostId(null);
      videoPlaybackStore.setActiveVideo(null);
    } else {
      // Activate this post → shouldPlay becomes true
      videoPlaybackStore.setActivePostId(postId);
      videoPlaybackStore.setActiveVideo(item.url);
    }
  }, [isPlaying, item.url, postId]);

  // Double-tap like handler
  const handleDoubleTapLike = useCallback(() => {
    if (onDoubleTapLike) {
      setShowHeartAnimation(true);
      onDoubleTapLike();
    }
  }, [onDoubleTapLike]);

  // Handler pour ouvrir plein écran
  // Capture position exacte via getStatusAsync pour fiabilité
  // No pauseAsync — handleOpenVideo sets activePostId=null which makes shouldPlay=false
  const handleFullscreenPress = useCallback(async () => {
    if (onVideoPress && videoRef.current) {
      try {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          onVideoPress({
            videoUrl: item.url,
            thumbnailUrl: item.thumbnailUrl,
            positionMillis: status.positionMillis || 0,
            isPlaying: status.isPlaying,
          });
        } else {
          onVideoPress({
            videoUrl: item.url,
            thumbnailUrl: item.thumbnailUrl,
            positionMillis: 0,
            isPlaying: false,
          });
        }
      } catch {
        onVideoPress({
          videoUrl: item.url,
          thumbnailUrl: item.thumbnailUrl,
          positionMillis: currentPositionRef.current,
          isPlaying: isPlaying,
        });
      }
    }
  }, [onVideoPress, item.url, item.thumbnailUrl, isPlaying]);

  // Long press: pause while held, resume on release (declarative via shouldPlay)
  const handleLongPress = useCallback(() => {
    holdPausedRef.current = true;
    setHoldPaused(true);
  }, []);

  const handlePressOut = useCallback(() => {
    if (holdPausedRef.current) {
      holdPausedRef.current = false;
      setHoldPaused(false);
    }
  }, []);

  // Use double-tap hook: single tap = open fullscreen reels, double tap = like
  const handleTap = useDoubleTap({
    onDoubleTap: handleDoubleTapLike,
    onSingleTap: onVideoPress ? handleFullscreenPress : togglePlayPause,
    delayMs: 250,
  });

  // AUTO-RESYNC: Listen to store session changes (when fullscreen closes)
  // Restore POSITION only from session (e.g. after returning from fullscreen)
  // Play/pause is handled entirely by the shouldPlay prop — no imperative calls
  useEffect(() => {
    if (!session || !isActive) return;

    // Only process recent sessions (within last 2 seconds = just closed fullscreen)
    const isRecent = Date.now() - session.updatedAt < 2000;
    if (!isRecent) return;

    if (!videoRef.current) return;

    // Restore position only
    videoRef.current.setPositionAsync(session.positionMillis).catch(() => {
      // Video not loaded yet, store pending position
      pendingSessionRef.current = { position: session.positionMillis };
    });
  }, [session, isActive]);

  // Fallback: Resync position via props (legacy support)
  useEffect(() => {
    if (syncPositionMillis !== undefined && syncPositionMillis > 0 && videoRef.current && isLoaded) {
      videoRef.current.setPositionAsync(syncPositionMillis).catch(() => {});
    }
  }, [syncPositionMillis, isLoaded]);

  // No imperative play/pause effects — shouldPlay prop on <Video> handles everything.
  // This eliminates race conditions between effects and user gestures.

  // Memoize source objects to prevent expo-av from reloading on every render
  const videoSource = useMemo(() => ({ uri: item.url }), [item.url]);
  const videoPosterSource = useMemo(
    () => item.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined,
    [item.thumbnailUrl]
  );

  // Declarative shouldPlay — single source of truth, no race conditions
  const feedShouldPlay = isActive && isGloballyActive && autoPlayVideos && !holdPaused;

  if (item.type === 'video') {
    return (
      <View style={[styles.mediaContainer, { width, height }]}>
        {/* Zone de tap: single = fullscreen, double = like, long press = pause/resume */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleTap}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          delayLongPress={300}
        >
          <Video
            ref={videoRef}
            source={videoSource}
            style={styles.media}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={feedShouldPlay}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            posterSource={videoPosterSource}
            usePoster={!!item.thumbnailUrl}
          />
          {showPlayButton && !autoPlayVideos && (
            <View style={styles.playButtonOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={32} color={couleurs.blanc} />
              </View>
            </View>
          )}
        </Pressable>
        {/* Heart animation on double-tap */}
        <HeartAnimation
          visible={showHeartAnimation}
          onAnimationEnd={() => setShowHeartAnimation(false)}
          size={80}
        />
        {/* Bouton expand - SEUL déclencheur du plein écran */}
        {onVideoPress && (
          <Pressable
            style={styles.expandIconContainer}
            onPress={handleFullscreenPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="expand" size={20} color={couleurs.blanc} />
          </Pressable>
        )}
      </View>
    );
  }

  // Image double-tap handler
  const handleImageTap = useDoubleTap({
    onDoubleTap: handleDoubleTapLike,
    onSingleTap: onPress,
    delayMs: 250,
  });

  return (
    <View style={[styles.mediaContainer, { width, height }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleImageTap}>
        <Image source={{ uri: item.url }} style={styles.media} resizeMode="cover" />
      </Pressable>
      {/* Heart animation on double-tap */}
      <HeartAnimation
        visible={showHeartAnimation}
        onAnimationEnd={() => setShowHeartAnimation(false)}
        size={80}
      />
    </View>
  );
});

// PaginationDot avec Animated natif React Native
const PaginationDot: React.FC<{ isActive: boolean }> = React.memo(({ isActive }) => {
  const widthAnim = useRef(new Animated.Value(isActive ? 24 : 8)).current;
  const opacityAnim = useRef(new Animated.Value(isActive ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: isActive ? 24 : 8,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: isActive ? 1 : 0.5,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive, widthAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: widthAnim,
          opacity: opacityAnim,
          backgroundColor: isActive ? couleurs.primaire : couleurs.blanc,
        },
      ]}
    />
  );
});

const PostMediaCarousel: React.FC<PostMediaCarouselProps> = React.memo(({
  medias,
  postId,
  width = SCREEN_WIDTH,
  height = SCREEN_WIDTH,
  onMediaPress,
  onVideoPress,
  onVideoPositionSync,
  showIndicator = true,
  showDots = true,
  autoPlayVideos = false,
  liked,
  onDoubleTapLike,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  // Track sync positions per video URL for resync after fullscreen
  const [syncPositions, setSyncPositions] = useState<Record<string, number>>({});

  // Handler to receive position sync from parent (after fullscreen closes)
  const handlePositionSync = useCallback((videoUrl: string, positionMillis: number) => {
    setSyncPositions(prev => ({ ...prev, [videoUrl]: positionMillis }));
    onVideoPositionSync?.(videoUrl, positionMillis);
  }, [onVideoPositionSync]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => (
      <MediaItemRenderer
        item={item}
        index={index}
        postId={postId}
        width={width}
        height={height}
        isActive={index === activeIndex}
        onPress={() => onMediaPress?.(index)}
        onVideoPress={onVideoPress}
        syncPositionMillis={syncPositions[item.url]}
        autoPlayVideos={autoPlayVideos}
        liked={liked}
        onDoubleTapLike={onDoubleTapLike}
      />
    ),
    [postId, width, height, activeIndex, onMediaPress, onVideoPress, syncPositions, autoPlayVideos, liked, onDoubleTapLike]
  );

  const keyExtractor = useCallback(
    (item: MediaItem, index: number) => `${item.url}-${index}`,
    []
  );

  // Si un seul média, afficher sans carrousel
  if (medias.length === 1) {
    return (
      <View style={[styles.container, { width, height }]}>
        <MediaItemRenderer
          item={medias[0]}
          index={0}
          postId={postId}
          width={width}
          height={height}
          isActive={true}
          onPress={() => onMediaPress?.(0)}
          onVideoPress={onVideoPress}
          syncPositionMillis={syncPositions[medias[0].url]}
          autoPlayVideos={autoPlayVideos}
          liked={liked}
          onDoubleTapLike={onDoubleTapLike}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      <FlatList
        ref={flatListRef}
        data={medias}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        decelerationRate="fast"
        snapToInterval={width}
        snapToAlignment="start"
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        // Performance optimizations
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
      />

      {/* Indicateur numérique "1/5" */}
      {showIndicator && medias.length > 1 && (
        <View style={styles.indicatorContainer}>
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>
              {activeIndex + 1}/{medias.length}
            </Text>
          </View>
        </View>
      )}

      {/* Pagination dots */}
      {showDots && medias.length > 1 && (
        <View style={styles.dotsContainer}>
          {medias.map((_, index) => (
            <PaginationDot key={index} isActive={index === activeIndex} />
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: couleurs.fondCard,
  },
  mediaContainer: {
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  expandIconContainer: {
    position: 'absolute',
    bottom: espacements.sm,
    right: espacements.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    top: espacements.md,
    right: espacements.md,
  },
  indicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: rayons.full,
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
  },
  indicatorText: {
    color: couleurs.blanc,
    fontSize: 12,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: espacements.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: espacements.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

export default PostMediaCarousel;
