/**
 * ImageViewerModal - Visionneuse image plein écran style Instagram
 * Même expérience que VideoPlayerModal : actions overlay, double-tap like, commentaires
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs } from '../constantes/theme';
import { useDoubleTap } from '../hooks/useDoubleTap';
import HeartAnimation from './HeartAnimation';
import VideoActionsOverlay from './VideoActionsOverlay';
import UnifiedCommentsSheet from './UnifiedCommentsSheet';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
  /** ID du post parent (pour commentaires) */
  postId?: string;
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
  /** Callback pour partager */
  onShare?: () => void;
}

export default function ImageViewerModal({
  visible,
  imageUrl,
  onClose,
  postId,
  liked = false,
  likesCount = 0,
  commentsCount = 0,
  sharesCount = 0,
  onLike,
  onShare,
}: ImageViewerModalProps) {
  const [showControls, setShowControls] = useState(true);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [localCommentsCount, setLocalCommentsCount] = useState(commentsCount);
  // OPTIMISTIC UI: Local state pour like instantané
  const [localLiked, setLocalLiked] = useState(liked);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);

  const controlsOpacity = React.useRef(new Animated.Value(1)).current;

  // Sync localCommentsCount with prop
  useEffect(() => {
    setLocalCommentsCount(commentsCount);
  }, [commentsCount]);

  // Sync localLiked et localLikesCount avec les props
  useEffect(() => {
    setLocalLiked(liked);
  }, [liked]);

  useEffect(() => {
    setLocalLikesCount(likesCount);
  }, [likesCount]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setShowControls(true);
      controlsOpacity.setValue(1);
      setCommentsOpen(false);
      setLocalLiked(liked);
      setLocalLikesCount(likesCount);
    }
  }, [visible, liked, likesCount, controlsOpacity]);

  const toggleControls = useCallback(() => {
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
  }, [showControls, controlsOpacity]);

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

  // Double-tap like handler
  const handleDoubleTapLike = useCallback(() => {
    // Animation coeur
    setShowHeartAnimation(true);
    // Toggle like
    setLocalLiked(prev => !prev);
    setLocalLikesCount(prev => localLiked ? prev - 1 : prev + 1);
    if (onLike) {
      onLike();
    }
  }, [onLike, localLiked]);

  // Single tap = toggle controls, double tap = like
  const handleTap = useDoubleTap({
    onDoubleTap: handleDoubleTapLike,
    onSingleTap: toggleControls,
    delayMs: 250,
  });

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Image */}
        {imageUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Overlay gradient haut - masqué quand comments ouverts */}
        {!commentsOpen && (
          <Animated.View
            style={[styles.gradientTop, { opacity: controlsOpacity }]}
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
            style={[styles.gradientBottom, { opacity: controlsOpacity }]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)']}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}

        {/* Bouton fermer - TOUJOURS visible */}
        <Animated.View
          style={[styles.closeContainer, { opacity: commentsOpen ? 1 : controlsOpacity }]}
          pointerEvents={commentsOpen || showControls ? 'auto' : 'none'}
        >
          <Pressable
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={26} color={couleurs.blanc} />
          </Pressable>
        </Animated.View>

        {/* Zone de tap pour toggle les controles / double-tap like */}
        {!commentsOpen && (
          <Pressable
            style={styles.tapArea}
            onPress={handleTap}
          />
        )}

        {/* Heart Animation - Double tap like */}
        <HeartAnimation
          visible={showHeartAnimation}
          onAnimationEnd={() => setShowHeartAnimation(false)}
          size={120}
        />

        {/* Actions Overlay - masqué quand comments ouverts */}
        {!commentsOpen && (onLike || postId || onShare) && (
          <VideoActionsOverlay
            liked={localLiked}
            likesCount={localLikesCount}
            commentsCount={localCommentsCount}
            sharesCount={sharesCount}
            onLike={handleLike}
            onComments={() => setCommentsOpen(true)}
            onShare={onShare || (() => {})}
            visible={true}
          />
        )}

        {/* Comments Sheet */}
        <UnifiedCommentsSheet
          postId={postId || null}
          visible={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          onCommentAdded={() => setLocalCommentsCount(prev => prev + 1)}
          mode="embedded"
          theme="dark"
          initialCount={localCommentsCount}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  closeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 16,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapArea: {
    ...StyleSheet.absoluteFillObject,
  },
});
