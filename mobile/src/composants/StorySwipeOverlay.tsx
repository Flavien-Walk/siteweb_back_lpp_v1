/**
 * StorySwipeOverlay - Edge swipe pour ouvrir le créateur de stories
 *
 * Même logique que SwipeableScreen mais pour ouvrir les stories
 * au lieu de naviguer en arrière.
 */

import React, { ReactNode, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Dimensions,
  ViewStyle,
  View,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Configuration
const EDGE_WIDTH = 40; // Zone de détection sur le bord gauche
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2; // 20% pour déclencher
const VELOCITY_THRESHOLD = 500;

interface StorySwipeOverlayProps {
  children: ReactNode;
  enabled?: boolean;
  onSwipeToStory: () => void;
  style?: ViewStyle;
}

const StorySwipeOverlay: React.FC<StorySwipeOverlayProps> = ({
  children,
  enabled = true,
  onSwipeToStory,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const isValidGesture = useRef(false);
  const hasTriggeredHaptic = useRef(false);
  const hasTriggered = useRef(false);

  const resetPosition = useCallback(() => {
    hasTriggeredHaptic.current = false;
    hasTriggered.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [translateX]);

  const triggerStoryOpen = useCallback(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animation de completion
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH * 0.3,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onSwipeToStory();
      // Reset après ouverture
      setTimeout(() => {
        translateX.setValue(0);
        hasTriggered.current = false;
        hasTriggeredHaptic.current = false;
      }, 300);
    });
  }, [translateX, onSwipeToStory]);

  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (!enabled || !isValidGesture.current || hasTriggered.current) return;

      const { translationX } = event.nativeEvent;

      // Limiter entre 0 et une partie de l'écran (effet subtil)
      const clampedX = Math.max(0, Math.min(translationX, SCREEN_WIDTH * 0.4));
      translateX.setValue(clampedX * 0.15); // Mouvement subtil du contenu

      // Haptic feedback quand on atteint le seuil
      if (translationX > SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (translationX < SWIPE_THRESHOLD) {
        hasTriggeredHaptic.current = false;
      }
    },
    [enabled, translateX]
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { state, translationX, velocityX, x } = event.nativeEvent;

      if (state === State.BEGAN) {
        hasTriggered.current = false;
        hasTriggeredHaptic.current = false;
        // Vérifier si le geste commence sur le bord gauche
        isValidGesture.current = x <= EDGE_WIDTH;
      }

      if (state === State.END || state === State.CANCELLED) {
        if (!isValidGesture.current) {
          resetPosition();
          return;
        }

        const shouldTrigger =
          translationX > SWIPE_THRESHOLD ||
          (velocityX > VELOCITY_THRESHOLD && translationX > 30);

        if (shouldTrigger && !hasTriggered.current) {
          triggerStoryOpen();
        } else {
          resetPosition();
        }

        isValidGesture.current = false;
      }
    },
    [triggerStoryOpen, resetPosition]
  );

  // Indicateur de swipe (apparaît sur le bord gauche)
  const indicatorOpacity = translateX.interpolate({
    inputRange: [0, 5, 20],
    outputRange: [0, 0.8, 1],
    extrapolate: 'clamp',
  });

  const indicatorTranslateX = translateX.interpolate({
    inputRange: [0, 30],
    outputRange: [-20, 10],
    extrapolate: 'clamp',
  });

  const indicatorScale = translateX.interpolate({
    inputRange: [0, 15, 40],
    outputRange: [0.6, 1, 1.15],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]}>
      {/* Indicateur de swipe vers stories */}
      <Animated.View
        style={[
          styles.indicator,
          {
            opacity: indicatorOpacity,
            transform: [
              { translateX: indicatorTranslateX },
              { scale: indicatorScale },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.indicatorCircle}>
          <Ionicons name="add" size={22} color="rgba(255,255,255,0.95)" />
        </View>
      </Animated.View>

      {/* Contenu avec geste */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={10}
        failOffsetX={-15}
        failOffsetY={[-20, 20]}
        enabled={enabled}
      >
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: '35%',
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  indicatorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.9)', // Couleur primaire
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default StorySwipeOverlay;
