/**
 * ShopBottomSheet — Bottom sheet animee pour la Boutique
 * Slide-up avec overlay, poignee de drag, fermeture par tap overlay
 * Swipe-down pour fermer (seuil 100px ou velocite > 500)
 * Utilise Modal + Reanimated pour une animation fluide
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';
import { rayons } from '../constantes/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

interface ShopBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ShopBottomSheet({ visible, onClose, children }: ShopBottomSheetProps) {
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      dragY.value = 0;
      overlayOpacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, {
        damping: 25,
        stiffness: 300,
        mass: 0.8,
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow dragging down (positive Y)
      const clampedY = Math.max(0, event.translationY);
      dragY.value = clampedY;
      // Fade overlay proportionally
      const progress = Math.min(clampedY / 300, 1);
      overlayOpacity.value = 1 - progress * 0.6;
    })
    .onEnd((event) => {
      const shouldDismiss =
        dragY.value > DISMISS_THRESHOLD ||
        event.velocityY > VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        // Dismiss
        overlayOpacity.value = withTiming(0, { duration: 200 });
        dragY.value = withTiming(SCREEN_HEIGHT, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        }, () => {
          runOnJS(onClose)();
        });
      } else {
        // Snap back
        dragY.value = withSpring(0, { damping: 25, stiffness: 300 });
        overlayOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }],
  }));

  const styles = createSheetStyles(couleurs);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <KeyboardAvoidingView
          style={styles.wrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Overlay */}
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          </Animated.View>

          {/* Sheet */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + 16 }]}>
              {/* Handle */}
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
              </View>

              {children}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const createSheetStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    gestureRoot: {
      flex: 1,
    },
    wrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheet: {
      backgroundColor: couleurs.fondCard,
      borderTopLeftRadius: rayons.xl,
      borderTopRightRadius: rayons.xl,
      maxHeight: SCREEN_HEIGHT * 0.85,
    },
    handleContainer: {
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 8,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: couleurs.bordure,
    },
  });
