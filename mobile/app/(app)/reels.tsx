/**
 * Reels - Feed video vertical style Instagram
 * FlatList vertical avec pagingEnabled pour swipe entre les videos
 * Swipe horizontal droite pour fermer (Gesture.Pan sur le parent)
 * Pagination infinie
 *
 * Note: PagerView (ViewPager2) a ete remplace par FlatList car ViewPager2
 * intercepte TOUS les touch-move events via onInterceptTouchEvent natif,
 * bloquant les gestes RNGH horizontaux meme pour un pager vertical.
 * FlatList (ScrollView) n'intercepte que les moves dans sa direction de scroll.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  StatusBar,
  FlatList,
  ViewToken,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { couleurs } from '../../src/constantes/theme';
import {
  Publication,
  getPublications,
  getPublication,
} from '../../src/services/publications';
import { isVideoUrl } from '../../src/utils/mediaUtils';
import { videoRegistry } from '../../src/stores/videoRegistry';
import { videoPlaybackStore } from '../../src/stores/videoPlaybackStore';
import ReelsVideoPage from '../../src/composants/ReelsVideoPage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function ReelsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialIndex?: string; videoPublicationIds?: string; initialPositionMillis?: string }>();
  const flatListRef = useRef<FlatList<Publication>>(null);

  const initialIndex = parseInt(params.initialIndex || '0', 10);
  const initialPositionMillis = parseInt(params.initialPositionMillis || '0', 10);

  // State
  const [publications, setPublications] = useState<Publication[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Refs to access latest values from stale closures (useFocusEffect blur, unmount cleanup)
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const publicationsRef = useRef(publications);
  publicationsRef.current = publications;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);

  // Parse les IDs des publications video depuis les params
  const initialIds = useMemo(() => {
    try {
      if (params.videoPublicationIds) {
        return JSON.parse(params.videoPublicationIds) as string[];
      }
    } catch {}
    return [] as string[];
  }, [params.videoPublicationIds]);

  // Charger les publications au montage
  useEffect(() => {
    loadInitialPublications();
  }, []);

  const loadInitialPublications = async () => {
    setLoading(true);
    try {
      // Si on a des IDs specifiques, fetcher chaque publication
      if (initialIds.length > 0) {
        const results = await Promise.all(
          initialIds.map(id => getPublication(id).catch(() => null))
        );
        const validPubs = results
          .filter((r): r is NonNullable<typeof r> => r !== null && r.succes === true && !!r.data)
          .map(r => r.data!.publication);

        if (validPubs.length > 0) {
          setPublications(validPubs);
          setLoading(false);
          return;
        }
      }

      // Fallback : charger depuis le feed et filtrer les videos
      const response = await getPublications(1, 40);
      if (response.succes && response.data) {
        const videoPubs = response.data.publications.filter(p =>
          p.medias?.some(m => m.type === 'video') ||
          (p.media && isVideoUrl(p.media))
        );
        setPublications(videoPubs);
        setCurrentPage(1);
        setHasMorePages(response.data.pagination.page < response.data.pagination.pages);
      }
    } catch (err) {
      console.warn('[Reels] Error loading publications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pagination : charger plus de videos
  const loadMorePublications = useCallback(async () => {
    if (loadingMore || !hasMorePages) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = await getPublications(nextPage, 40);
      if (response.succes && response.data) {
        const newVideoPubs = response.data.publications.filter(p =>
          p.medias?.some(m => m.type === 'video') ||
          (p.media && isVideoUrl(p.media))
        );
        if (newVideoPubs.length > 0) {
          setPublications(prev => {
            // Eviter les doublons
            const existingIds = new Set(prev.map(p => p._id));
            const unique = newVideoPubs.filter(p => !existingIds.has(p._id));
            return [...prev, ...unique];
          });
        }
        setCurrentPage(nextPage);
        setHasMorePages(response.data.pagination.page < response.data.pagination.pages);
      }
    } catch (err) {
      console.warn('[Reels] Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMorePages, currentPage]);

  // Trigger pagination quand on approche de la fin
  useEffect(() => {
    if (publications.length > 0 && currentIndex >= publications.length - 3) {
      loadMorePublications();
    }
  }, [currentIndex, publications.length, loadMorePublications]);

  // Viewability tracking (remplace PagerView onPageSelected)
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  // Nettoyage complet au demontage
  useEffect(() => {
    return () => {
      // Update feedContext with current video's postId (safety net)
      const currentPub = publicationsRef.current[currentIndexRef.current];
      if (currentPub) {
        const existing = videoPlaybackStore.getFeedContext();
        if (existing) {
          videoPlaybackStore.setFeedContext({
            postId: currentPub._id,
            scrollY: existing.scrollY,
          });
        }
      }
      videoRegistry.stopAll().catch(() => {});
      videoPlaybackStore.setActivePostId(null);
      videoPlaybackStore.setActiveVideo(null);
    };
  }, []);

  // Stop videos quand l'ecran perd le focus
  useFocusEffect(
    useCallback(() => {
      // Screen focused
      return () => {
        // Screen unfocused — update feedContext with current video's postId
        // (covers system back gesture, Android back button, etc.)
        const currentPub = publicationsRef.current[currentIndexRef.current];
        if (currentPub) {
          const existing = videoPlaybackStore.getFeedContext();
          if (existing) {
            videoPlaybackStore.setFeedContext({
              postId: currentPub._id,
              scrollY: existing.scrollY,
            });
          }
        }
        videoRegistry.stopAll().catch(() => {});
        videoPlaybackStore.setActivePostId(null);
        videoPlaybackStore.setActiveVideo(null);
      };
    }, [])
  );

  // Close handler — update feedContext with the CURRENT video's postId before navigating back
  const handleClose = useCallback(() => {
    const currentPub = publicationsRef.current[currentIndexRef.current];
    if (currentPub) {
      const existing = videoPlaybackStore.getFeedContext();
      videoPlaybackStore.setFeedContext({
        postId: currentPub._id,
        scrollY: existing?.scrollY ?? 0,
      });
    }
    videoRegistry.stopAll().catch(() => {});
    videoPlaybackStore.setActivePostId(null);
    videoPlaybackStore.setActiveVideo(null);
    router.back();
  }, [router]);

  // Description overlay state — allows pan gesture to close overlay instead of fullscreen
  const overlayOpen = useSharedValue(false);
  const closeOverlayRef = useRef<(() => void) | null>(null);

  const handleOverlayToggle = useCallback((open: boolean) => {
    overlayOpen.value = open;
  }, []);

  const doCloseOverlay = useCallback(() => {
    closeOverlayRef.current?.();
  }, []);

  // Swipe-to-dismiss (horizontal pan wrapping la FlatList)
  const translateX = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .activeOffsetX([10, 500])
    .failOffsetY([-80, 80])
    .failOffsetX([-500, -15])
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((event) => {
      'worklet';
      // Don't move screen when description overlay is open
      if (overlayOpen.value) return;
      if (event.translationX > 0) {
        translateX.value = event.translationX;
        screenOpacity.value = 1 - (event.translationX / SCREEN_WIDTH) * 0.5;
      }
    })
    .onEnd((event) => {
      'worklet';
      // If overlay is open, close it instead of dismissing fullscreen
      if (overlayOpen.value) {
        if (event.translationX > 10) {
          runOnJS(doCloseOverlay)();
        }
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        screenOpacity.value = withSpring(1);
        return;
      }
      if (event.translationX > DISMISS_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 }, () => {
          runOnJS(handleClose)();
        });
        screenOpacity.value = withTiming(0, { duration: 200 });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        screenOpacity.value = withSpring(1);
      }
    });

  const dismissStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: screenOpacity.value,
  }));

  // Extraire l'URL video d'une publication
  const getVideoUrl = useCallback((pub: Publication): string => {
    // Chercher dans medias[]
    const videoMedia = pub.medias?.find(m => m.type === 'video');
    if (videoMedia) return videoMedia.url;
    // Fallback legacy
    if (pub.media && isVideoUrl(pub.media)) return pub.media;
    return '';
  }, []);

  // Extraire le poster d'une publication
  const getPosterUrl = useCallback((pub: Publication): string | undefined => {
    const videoMedia = pub.medias?.find(m => m.type === 'video');
    if (videoMedia?.thumbnailUrl) return videoMedia.thumbnailUrl;
    return undefined;
  }, []);

  // Layout fixe pour chaque item (performance + initialScrollIndex)
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  // Render item
  const renderItem = useCallback(({ item: pub, index }: { item: Publication; index: number }) => (
    <View style={styles.page}>
      <ReelsVideoPage
        publication={pub}
        videoUrl={getVideoUrl(pub)}
        posterUrl={getPosterUrl(pub)}
        isActive={index === currentIndex}
        onClose={handleClose}
        initialPositionMillis={index === initialIndex ? initialPositionMillis : 0}
        onOverlayToggle={handleOverlayToggle}
        closeOverlayRef={closeOverlayRef}
      />
    </View>
  ), [currentIndex, getVideoUrl, getPosterUrl, handleClose, initialIndex, initialPositionMillis, handleOverlayToggle]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color={couleurs.blanc} />
      </View>
    );
  }

  // Empty state
  if (publications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.emptyText}>Aucune video disponible</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, dismissStyle]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <FlatList
          ref={flatListRef}
          data={publications}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          bounces={false}
          overScrollMode="never"
          extraData={currentIndex}
        />

        {/* Loading more indicator */}
        {loadingMore && (
          <View style={styles.loadingMoreIndicator}>
            <ActivityIndicator size="small" color={couleurs.blanc} />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: couleurs.blanc,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingMoreIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
