/**
 * StorySwipeOverlay - Edge swipe pour ouvrir le créateur de stories
 *
 * Version améliorée: contrôle l'animation du parent pour un aperçu live
 * pendant le swipe, révélant le StoryCreator derrière.
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
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Configuration
const EDGE_WIDTH = 50; // Zone de détection sur le bord gauche
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% pour déclencher
const VELOCITY_THRESHOLD = 500;

interface StorySwipeOverlayProps {
  children: ReactNode;
  enabled?: boolean;
  onSwipeToStory: () => void;
  /** Animation value du parent pour contrôle direct du slide */
  slideAnim?: Animated.Value;
  style?: ViewStyle;
}

const StorySwipeOverlay: React.FC<StorySwipeOverlayProps> = ({
  children,
  enabled = true,
  onSwipeToStory,
  slideAnim,
  style,
}) => {
  const isValidGesture = useRef(false);
  const hasTriggeredHaptic = useRef(false);
  const hasTriggered = useRef(false);

  const resetPosition = useCallback(() => {
    hasTriggeredHaptic.current = false;
    hasTriggered.current = false;

    // Reset l'animation du parent si fournie
    if (slideAnim) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [slideAnim]);

  const triggerStoryOpen = useCallback(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animation de completion vers la droite
    if (slideAnim) {
      Animated.spring(slideAnim, {
        toValue: SCREEN_WIDTH,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start(() => {
        onSwipeToStory();
        // Reset après un petit délai
        setTimeout(() => {
          hasTriggered.current = false;
          hasTriggeredHaptic.current = false;
        }, 100);
      });
    } else {
      // Fallback si pas d'animation fournie
      onSwipeToStory();
      setTimeout(() => {
        hasTriggered.current = false;
        hasTriggeredHaptic.current = false;
      }, 300);
    }
  }, [slideAnim, onSwipeToStory]);

  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (!enabled || !isValidGesture.current || hasTriggered.current) return;

      const { translationX } = event.nativeEvent;

      // Limiter entre 0 et SCREEN_WIDTH
      const clampedX = Math.max(0, Math.min(translationX, SCREEN_WIDTH));

      // Mettre à jour l'animation du parent (si fournie) pour le slide live
      if (slideAnim) {
        slideAnim.setValue(clampedX);
      }

      // Haptic feedback quand on atteint le seuil
      if (translationX > SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (translationX < SWIPE_THRESHOLD) {
        hasTriggeredHaptic.current = false;
      }
    },
    [enabled, slideAnim]
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
          (velocityX > VELOCITY_THRESHOLD && translationX > 50);

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

  return (
    <View style={[styles.container, style]}>
      {/* Contenu avec geste - le parent gère le slide */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={15}
        failOffsetX={-15}
        failOffsetY={[-20, 20]}
        enabled={enabled}
      >
        <Animated.View style={styles.content}>
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
});

export default StorySwipeOverlay;
