/**
 * PostMediaCarousel - Carrousel multi-média pour publications
 * Affiche images et vidéos avec pagination dots et indicateur "1/5"
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  Image,
  Dimensions,
  StyleSheet,
  Pressable,
  ViewToken,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { couleurs, rayons, espacements } from '../constantes/theme';
import { MediaItem } from '../services/publications';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PostMediaCarouselProps {
  medias: MediaItem[];
  width?: number;
  height?: number;
  onMediaPress?: (index: number) => void;
  showIndicator?: boolean;
  showDots?: boolean;
  autoPlayVideos?: boolean;
}

interface MediaItemRendererProps {
  item: MediaItem;
  index: number;
  width: number;
  height: number;
  isActive: boolean;
  onPress?: () => void;
  autoPlayVideos: boolean;
}

const MediaItemRenderer: React.FC<MediaItemRendererProps> = React.memo(({
  item,
  width,
  height,
  isActive,
  onPress,
  autoPlayVideos,
}) => {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(true);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setShowPlayButton(!status.isPlaying);
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  }, [isPlaying]);

  // Pause video when not active or when component unmounts (scroll out of view)
  React.useEffect(() => {
    if (!isActive && videoRef.current && isPlaying) {
      videoRef.current.pauseAsync();
    }
    if (isActive && autoPlayVideos && videoRef.current && !isPlaying) {
      videoRef.current.playAsync();
    }
  }, [isActive, autoPlayVideos, isPlaying]);

  // Cleanup: pause on unmount
  React.useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pauseAsync().catch(() => {});
      }
    };
  }, []);

  if (item.type === 'video') {
    return (
      <Pressable style={[styles.mediaContainer, { width, height }]} onPress={togglePlayPause}>
        <Video
          ref={videoRef}
          source={{ uri: item.url }}
          style={styles.media}
          resizeMode={ResizeMode.COVER}
          isLooping
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          posterSource={item.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined}
          usePoster={!!item.thumbnailUrl}
        />
        {showPlayButton && (
          <View style={styles.playButtonOverlay}>
            <View style={styles.playButton}>
              <Ionicons name="play" size={32} color={couleurs.blanc} />
            </View>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.mediaContainer, { width, height }]} onPress={onPress}>
      <Image source={{ uri: item.url }} style={styles.media} resizeMode="cover" />
    </Pressable>
  );
});

const PaginationDot: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(isActive ? 24 : 8, { duration: 200 }),
    opacity: withTiming(isActive ? 1 : 0.5, { duration: 200 }),
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        isActive && styles.dotActive,
      ]}
    />
  );
};

const PostMediaCarousel: React.FC<PostMediaCarouselProps> = React.memo(({
  medias,
  width = SCREEN_WIDTH,
  height = SCREEN_WIDTH,
  onMediaPress,
  showIndicator = true,
  showDots = true,
  autoPlayVideos = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

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
        width={width}
        height={height}
        isActive={index === activeIndex}
        onPress={() => onMediaPress?.(index)}
        autoPlayVideos={autoPlayVideos}
      />
    ),
    [width, height, activeIndex, onMediaPress, autoPlayVideos]
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
          width={width}
          height={height}
          isActive={true}
          onPress={() => onMediaPress?.(0)}
          autoPlayVideos={autoPlayVideos}
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
            <Animated.Text style={styles.indicatorText}>
              {activeIndex + 1}/{medias.length}
            </Animated.Text>
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
    backgroundColor: couleurs.blanc,
  },
  dotActive: {
    backgroundColor: couleurs.primaire,
  },
});

export default PostMediaCarousel;
