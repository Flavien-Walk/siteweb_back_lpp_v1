/**
 * ReelsAdPage - Page pub dans le feed vertical Reels
 * Affiche une video pub plein ecran avec overlay marque/CTA
 *
 * Architecture identique a ReelsVideoPage :
 * - Video declarative (shouldPlay/isMuted via props)
 * - Gestes: single-tap = mute/unmute, long-press = pause
 * - postId prefixe 'reels:ad:${id}' pour eviter collision avec feed
 * - Tracking impression/view_3s/click
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
  Linking,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { couleurs, espacements, rayons } from '../constantes/theme';
import { AdItem, trackAdEvent } from '../services/ads';
import { videoRegistry } from '../stores/videoRegistry';
import { videoPlaybackStore } from '../stores/videoPlaybackStore';
import Avatar from './Avatar';
import MoreActionsSheet from './MoreActionsSheet';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ReelsAdPageProps {
  ad: AdItem;
  isActive: boolean;
  onClose: () => void;
}

export default function ReelsAdPage({
  ad,
  isActive,
  onClose,
}: ReelsAdPageProps) {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<Video>(null);
  const videoIdRef = useRef(`reels-ad-${ad._id}`);
  const reelsPostId = `reels:ad:${ad._id}`;

  // State
  const [isMuted, setIsMuted] = useState(true);
  const [holdPaused, setHoldPaused] = useState(false);
  const [showMuteIcon, setShowMuteIcon] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Tracking refs
  const hasTrackedImpression = useRef(false);
  const viewStartRef = useRef<number>(0);
  const has3sTracked = useRef(false);

  // Refs for gesture callbacks
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const holdPausedRef = useRef(holdPaused);
  holdPausedRef.current = holdPaused;

  // Declarative playback control
  const shouldPlay = isActive && !holdPaused;

  // Video source (stable ref)
  const videoSource = useMemo(() => ({ uri: ad.videoUrl }), [ad.videoUrl]);
  const videoPosterSource = useMemo(
    () => ad.thumbnailUrl ? { uri: ad.thumbnailUrl } : undefined,
    [ad.thumbnailUrl]
  );

  // Register/unregister in video registry
  useEffect(() => {
    const id = videoIdRef.current;
    if (videoRef.current) {
      videoRegistry.registerVideo(id, videoRef.current, reelsPostId, ad.videoUrl);
    }
    return () => {
      videoRegistry.stopAndUnregister(id).catch(() => {});
    };
  }, [ad._id, ad.videoUrl, reelsPostId]);

  // When becomes active, take over playback
  useEffect(() => {
    if (isActive) {
      videoRegistry.stopAllExcept(reelsPostId).catch(() => {});
      videoPlaybackStore.setActivePostId(reelsPostId);
      videoPlaybackStore.setActiveVideo(ad.videoUrl);

      // Track impression
      if (!hasTrackedImpression.current) {
        trackAdEvent('impression', ad, 0);
        hasTrackedImpression.current = true;
        viewStartRef.current = Date.now();
      }
    }
  }, [isActive, reelsPostId, ad]);

  // Track 3s view
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (!has3sTracked.current && viewStartRef.current > 0) {
        if (Date.now() - viewStartRef.current >= 3000) {
          trackAdEvent('view_3s', ad, 0);
          has3sTracked.current = true;
          clearInterval(interval);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, ad]);

  // Playback status handler
  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsBuffering(status.isBuffering);
    if (status.durationMillis && status.durationMillis > 0) {
      setProgress(status.positionMillis / status.durationMillis);
    }
  }, []);

  // --- GESTURES ---

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
    setShowMuteIcon(true);
    setTimeout(() => setShowMuteIcon(false), 600);
  }, []);

  const startHoldPause = useCallback(() => {
    setHoldPaused(true);
    setShowPauseIcon(true);
  }, []);

  const endHoldPause = useCallback(() => {
    setHoldPaused(false);
    setShowPauseIcon(false);
  }, []);

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      'worklet';
      runOnJS(toggleMute)();
    });

  const longPress = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      'worklet';
      runOnJS(startHoldPause)();
    })
    .onEnd(() => {
      'worklet';
      runOnJS(endHoldPause)();
    });

  const composedGesture = Gesture.Race(longPress, singleTap);

  // CTA press
  const handleCtaPress = useCallback(() => {
    trackAdEvent('click', ad, 0);
    Linking.openURL(ad.ctaUrl).catch(() => {});
  }, [ad]);

  // More menu
  const handleOpenMore = useCallback(() => setShowMoreMenu(true), []);

  return (
    <View style={styles.container}>
      {/* Video */}
      <Video
        ref={videoRef}
        source={videoSource}
        posterSource={videoPosterSource}
        usePoster={!!ad.thumbnailUrl}
        posterStyle={styles.poster}
        shouldPlay={shouldPlay}
        isMuted={isMuted}
        volume={isMuted ? 0.0 : 1.0}
        isLooping
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={handlePlaybackStatus}
        style={styles.video}
      />

      {/* Buffering indicator */}
      {isBuffering && isActive && (
        <View style={styles.gestureLayer}>
          <ActivityIndicator size="large" color={couleurs.blanc} />
        </View>
      )}

      {/* Gesture layer */}
      <GestureDetector gesture={composedGesture}>
        <View style={styles.gestureLayer}>
          {/* Mute icon feedback */}
          {showMuteIcon && (
            <View style={styles.muteIconCircle}>
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={28}
                color={couleurs.blanc}
              />
            </View>
          )}
          {/* Pause icon feedback */}
          {showPauseIcon && !showMuteIcon && (
            <View style={styles.muteIconCircle}>
              <Ionicons name="pause" size={28} color={couleurs.blanc} />
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Gradients */}
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

      {/* Close button */}
      <Pressable
        style={[styles.closeButton, { top: insets.top + espacements.sm }]}
        onPress={onClose}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={28} color={couleurs.blanc} style={styles.iconShadow} />
      </Pressable>

      {/* Right side actions: only "..." for ads */}
      <View style={[styles.actionsColumn, { bottom: Platform.OS === 'ios' ? 140 : 160 }]}>
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
          onPress={handleOpenMore}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="ellipsis-horizontal" size={26} color={couleurs.blanc} style={styles.iconShadow} />
        </Pressable>
      </View>

      {/* Brand overlay (bottom-left) — meme position que authorContainer dans ReelsVideoPage */}
      <View style={[styles.brandContainer, { bottom: insets.bottom + 60 }]} pointerEvents="box-none">
        {/* Brand avatar + name + "Sponsorise" inline (style Instagram) */}
        <View style={styles.brandRow}>
          <Avatar
            uri={ad.brand.avatar}
            prenom={ad.brand.name.split(' ')[0]}
            nom={ad.brand.name.split(' ')[1] || ''}
            taille={36}
          />
          <Text style={styles.brandName} numberOfLines={1}>
            {ad.brand.name}
          </Text>
          <Text style={styles.sponsorisedInline}> · Sponsorise</Text>
        </View>

        {/* Description */}
        {ad.contenu ? (
          <Text style={styles.description} numberOfLines={2}>
            {ad.contenu}
          </Text>
        ) : null}

        {/* CTA button */}
        <Pressable
          style={styles.ctaButton}
          onPress={handleCtaPress}
        >
          <Text style={styles.ctaText}>{ad.ctaLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color="#fff" />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBarContainer, { bottom: insets.bottom + 8 }]} pointerEvents="none">
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Report / More actions sheet */}
      <MoreActionsSheet
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        contentType="ad"
        contentId={ad._id}
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
  actionsColumn: {
    position: 'absolute',
    right: espacements.md,
    alignItems: 'center',
    gap: 24,
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  brandContainer: {
    position: 'absolute',
    left: espacements.md,
    right: 80,
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  brandName: {
    color: couleurs.blanc,
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sponsorisedInline: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: couleurs.blanc,
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 10,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: rayons.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
});
