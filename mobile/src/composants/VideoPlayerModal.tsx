/**
 * VideoPlayerModal - Lecteur vidéo plein écran style Instagram/LinkedIn
 * Composant partagé pour garantir la même expérience sur toutes les pages
 */

import React, { useRef, useState, useEffect } from 'react';
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
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs } from '../constantes/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface VideoPlayerModalProps {
  visible: boolean;
  videoUrl: string | null;
  onClose: () => void;
}

export default function VideoPlayerModal({ visible, videoUrl, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setIsPlaying(true);
      setIsMuted(false);
      setVideoDuration(0);
      setVideoPosition(0);
      setShowControls(true);
      controlsOpacity.setValue(1);
    }
  }, [visible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

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

  const handleClose = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setIsPlaying(true);
    setIsMuted(false);
    setVideoDuration(0);
    setVideoPosition(0);
    setShowControls(true);
    controlsOpacity.setValue(1);
    onClose();
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setVideoDuration(status.durationMillis || 0);
      setVideoPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);
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
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.videoModalContainer}>
        {/* Video */}
        {videoUrl && (
          <View style={styles.videoTouchArea}>
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.videoPlayer}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isMuted={isMuted}
              isLooping={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            />
          </View>
        )}

        {/* Overlay gradient haut */}
        <Animated.View
          style={[styles.videoGradientTop, { opacity: controlsOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Overlay gradient bas */}
        <Animated.View
          style={[styles.videoGradientBottom, { opacity: controlsOpacity }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Bouton fermer - Style Instagram */}
        <Animated.View
          style={[styles.videoCloseContainer, { opacity: controlsOpacity }]}
          pointerEvents={showControls ? 'auto' : 'none'}
        >
          <Pressable
            style={styles.videoCloseBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={26} color={couleurs.blanc} />
          </Pressable>
        </Animated.View>

        {/* Zone de tap pour toggle les controles */}
        <Pressable
          style={styles.videoCenterControl}
          onPress={handleVideoTap}
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

        {/* Controles bas - Style epure */}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
