/**
 * SwipeableScreen - Swipe-back fluide style iOS/Instagram
 *
 * Version améliorée:
 * - Zone de détection sur le bord gauche (50px)
 * - Utilise react-native-gesture-handler pour éviter les conflits
 * - Affiche un aperçu de la page précédente (effet de parallaxe)
 * - Animation fluide avec haptic feedback
 */

import React, { ReactNode, useCallback, useRef, memo, useMemo } from 'react';
import {
  StyleSheet,
  Dimensions,
  ViewStyle,
  Platform,
  View,
  Animated,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Configuration
const EDGE_WIDTH = 50; // Zone de détection sur le bord gauche
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% pour compléter
const VELOCITY_THRESHOLD = 500;
const PARALLAX_FACTOR = 0.3; // L'arrière-plan bouge à 30% de la vitesse

interface SwipeableScreenProps {
  children: ReactNode;
  enabled?: boolean;
  onSwipeBack?: () => void;
  style?: ViewStyle;
  previousScreenColor?: string; // Couleur simulée de l'écran précédent
  /** Contenu personnalisé pour la prévisualisation (au lieu des placeholders) */
  previewContent?: ReactNode;
}

const SwipeableScreen: React.FC<SwipeableScreenProps> = ({
  children,
  enabled = true,
  onSwipeBack,
  style,
  previousScreenColor = '#0D0D12',
  previewContent,
}) => {
  const router = useRouter();
  const translateX = useRef(new Animated.Value(0)).current;
  const hasNavigated = useRef(false);
  const gestureStartX = useRef(0);
  const isValidGesture = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const goBack = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onSwipeBack) {
      onSwipeBack();
    } else {
      router.back();
    }
  }, [onSwipeBack, router]);

  const resetPosition = useCallback(() => {
    hasTriggeredHaptic.current = false;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [translateX]);

  const completeSwipe = useCallback(() => {
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      goBack();
    });
  }, [translateX, goBack]);

  const onGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      if (!enabled || !isValidGesture.current) return;

      const { translationX } = event.nativeEvent;

      // Limiter entre 0 et SCREEN_WIDTH
      const clampedX = Math.max(0, Math.min(translationX, SCREEN_WIDTH));
      translateX.setValue(clampedX);

      // Haptic feedback quand on atteint le seuil
      if (clampedX > SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (clampedX < SWIPE_THRESHOLD) {
        hasTriggeredHaptic.current = false;
      }
    },
    [enabled, translateX]
  );

  const onHandlerStateChange = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { state, translationX, velocityX, x } = event.nativeEvent;

      if (state === State.BEGAN) {
        hasNavigated.current = false;
        hasTriggeredHaptic.current = false;
        // Vérifier si le geste commence sur le bord gauche
        isValidGesture.current = x <= EDGE_WIDTH;
        gestureStartX.current = x;
      }

      if (state === State.END || state === State.CANCELLED) {
        if (!isValidGesture.current) {
          resetPosition();
          return;
        }

        const shouldComplete =
          translationX > SWIPE_THRESHOLD ||
          (velocityX > VELOCITY_THRESHOLD && translationX > 50);

        if (shouldComplete) {
          completeSwipe();
        } else {
          resetPosition();
        }

        isValidGesture.current = false;
      }
    },
    [completeSwipe, resetPosition]
  );

  // Memoize animated interpolations
  const animatedStyles = useMemo(() => ({
    backgroundTranslateX: translateX.interpolate({
      inputRange: [0, SCREEN_WIDTH],
      outputRange: [-SCREEN_WIDTH * PARALLAX_FACTOR, 0],
      extrapolate: 'clamp',
    }),
    overlayOpacity: translateX.interpolate({
      inputRange: [0, SCREEN_WIDTH],
      outputRange: [0.6, 0],
      extrapolate: 'clamp',
    }),
    indicatorOpacity: translateX.interpolate({
      inputRange: [0, 30, 80],
      outputRange: [0, 1, 0.6],
      extrapolate: 'clamp',
    }),
    indicatorTranslateX: translateX.interpolate({
      inputRange: [0, 100],
      outputRange: [-15, 15],
      extrapolate: 'clamp',
    }),
    indicatorScale: translateX.interpolate({
      inputRange: [0, 50, SWIPE_THRESHOLD],
      outputRange: [0.8, 1, 1.1],
      extrapolate: 'clamp',
    }),
  }), [translateX]);

  return (
    <View style={[styles.container, style]}>
      {/* Prévisualisation de la page précédente avec effet parallaxe */}
      <Animated.View
        style={[
          styles.previousScreen,
          {
            backgroundColor: previousScreenColor,
            transform: [{ translateX: animatedStyles.backgroundTranslateX }],
          },
        ]}
        pointerEvents="none"
      >
        {previewContent ? (
          // Contenu personnalisé fourni
          <View style={styles.previousContentCustom}>
            {previewContent}
          </View>
        ) : (
          // Contenu placeholder par défaut
          <View style={styles.previousContent}>
            <View style={styles.previousHeader} />
            <View style={styles.previousItem} />
            <View style={styles.previousItem} />
            <View style={styles.previousItem} />
          </View>
        )}
      </Animated.View>

      {/* Overlay sombre sur la page précédente */}
      <Animated.View
        style={[styles.overlay, { opacity: animatedStyles.overlayOpacity }]}
        pointerEvents="none"
      />

      {/* Indicateur de swipe sur le bord */}
      <Animated.View
        style={[
          styles.indicator,
          {
            opacity: animatedStyles.indicatorOpacity,
            transform: [
              { translateX: animatedStyles.indicatorTranslateX },
              { scale: animatedStyles.indicatorScale },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.indicatorCircle}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.95)" />
        </View>
      </Animated.View>

      {/* Contenu principal avec geste */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={15}
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
    backgroundColor: '#000',
  },
  previousScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  previousContent: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 16,
    gap: 12,
  },
  previousContentCustom: {
    flex: 1,
  },
  previousHeader: {
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  previousItem: {
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#0D0D12',
    zIndex: 2,
    // Ombre pour effet de profondeur
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -10, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 25,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: '45%',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  indicatorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default memo(SwipeableScreen);
