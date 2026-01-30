/**
 * Hook d'animations réutilisables
 * Animations fluides inspirées des réseaux sociaux modernes
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { Animated, Easing, AccessibilityInfo } from 'react-native';

// Configuration par défaut des animations
export const ANIMATION_CONFIG = {
  // Durées
  durations: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  // Spring configuration (comme le SplashScreen)
  spring: {
    tension: 50,
    friction: 7,
  },
  // Spring rapide pour feedback
  springFast: {
    tension: 100,
    friction: 10,
  },
  // Easing
  easing: {
    smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
    bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
  },
};

/**
 * Hook pour animation fade-in
 */
export const useFadeIn = (duration = ANIMATION_CONFIG.durations.normal, delay = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
      easing: ANIMATION_CONFIG.easing.smooth,
    }).start();
  }, [opacity, duration, delay]);

  const fadeOut = useCallback((callback?: () => void) => {
    Animated.timing(opacity, {
      toValue: 0,
      duration,
      useNativeDriver: true,
      easing: ANIMATION_CONFIG.easing.smooth,
    }).start(callback);
  }, [opacity, duration]);

  const reset = useCallback(() => {
    opacity.setValue(0);
  }, [opacity]);

  return { opacity, fadeIn, fadeOut, reset };
};

/**
 * Hook pour animation slide-in
 */
export const useSlideIn = (
  direction: 'left' | 'right' | 'up' | 'down' = 'up',
  distance = 30,
  duration = ANIMATION_CONFIG.durations.normal,
  delay = 0
) => {
  const translateX = useRef(new Animated.Value(
    direction === 'left' ? -distance : direction === 'right' ? distance : 0
  )).current;
  const translateY = useRef(new Animated.Value(
    direction === 'up' ? distance : direction === 'down' ? -distance : 0
  )).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const slideIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(direction === 'left' || direction === 'right' ? translateX : translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.easing.smooth,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, translateY, opacity, direction, duration, delay]);

  const slideOut = useCallback((callback?: () => void) => {
    const targetValue = direction === 'left' ? -distance :
                        direction === 'right' ? distance :
                        direction === 'up' ? -distance : distance;

    Animated.parallel([
      Animated.timing(direction === 'left' || direction === 'right' ? translateX : translateY, {
        toValue: targetValue,
        duration,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.easing.smooth,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start(callback);
  }, [translateX, translateY, opacity, direction, distance, duration]);

  const reset = useCallback(() => {
    translateX.setValue(direction === 'left' ? -distance : direction === 'right' ? distance : 0);
    translateY.setValue(direction === 'up' ? distance : direction === 'down' ? -distance : 0);
    opacity.setValue(0);
  }, [translateX, translateY, opacity, direction, distance]);

  return {
    translateX,
    translateY,
    opacity,
    slideIn,
    slideOut,
    reset,
    style: {
      opacity,
      transform: [
        { translateX },
        { translateY },
      ],
    },
  };
};

/**
 * Hook pour animation scale avec spring
 */
export const useScale = (
  initialValue = 1,
  type: 'spring' | 'timing' = 'spring'
) => {
  const scale = useRef(new Animated.Value(initialValue)).current;

  const scaleTo = useCallback((toValue: number, callback?: () => void) => {
    if (type === 'spring') {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.spring,
      }).start(callback);
    } else {
      Animated.timing(scale, {
        toValue,
        duration: ANIMATION_CONFIG.durations.fast,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.easing.smooth,
      }).start(callback);
    }
  }, [scale, type]);

  const bounce = useCallback((callback?: () => void) => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.2,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.springFast,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.spring,
      }),
    ]).start(callback);
  }, [scale]);

  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale]);

  return { scale, scaleTo, bounce, pulse };
};

/**
 * Hook pour animation shake (erreur de validation)
 */
export const useShake = () => {
  const translateX = useRef(new Animated.Value(0)).current;

  const shake = useCallback((callback?: () => void) => {
    Animated.sequence([
      Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(callback);
  }, [translateX]);

  return { translateX, shake };
};

/**
 * Hook pour animation pulse continue (badges, notifications)
 */
export const usePulse = (minOpacity = 0.6, maxOpacity = 1, duration = 1000) => {
  const opacity = useRef(new Animated.Value(maxOpacity)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    animationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: minOpacity,
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(opacity, {
          toValue: maxOpacity,
          duration: duration / 2,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    );
    animationRef.current.start();
  }, [opacity, minOpacity, maxOpacity, duration]);

  const stopPulse = useCallback(() => {
    animationRef.current?.stop();
    opacity.setValue(maxOpacity);
  }, [opacity, maxOpacity]);

  return { opacity, startPulse, stopPulse };
};

/**
 * Hook pour animation bounce (feedback positif)
 */
export const useBounce = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const bounce = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.15,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          ...ANIMATION_CONFIG.spring,
        }),
      ]),
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          ...ANIMATION_CONFIG.spring,
        }),
      ]),
    ]).start(callback);
  }, [scale, translateY]);

  return { scale, translateY, bounce, style: { transform: [{ scale }, { translateY }] } };
};

/**
 * Hook pour entrée staggered de liste
 */
export const useStaggeredEntrance = (itemCount: number, staggerDelay = 50) => {
  const animations = useRef<Animated.Value[]>([]).current;

  // S'assurer qu'on a assez d'animations
  while (animations.length < itemCount) {
    animations.push(new Animated.Value(0));
  }

  const animateIn = useCallback(() => {
    const animationSequence = animations.slice(0, itemCount).map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.durations.normal,
        delay: index * staggerDelay,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.easing.smooth,
      })
    );

    Animated.parallel(animationSequence).start();
  }, [animations, itemCount, staggerDelay]);

  const reset = useCallback(() => {
    animations.forEach(anim => anim.setValue(0));
  }, [animations]);

  const getItemStyle = useCallback((index: number) => {
    if (index >= animations.length) return {};

    return {
      opacity: animations[index],
      transform: [{
        translateY: animations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      }],
    };
  }, [animations]);

  return { animateIn, reset, getItemStyle, animations };
};

/**
 * Hook pour animation de press (feedback tactile)
 */
export const usePressAnimation = (scaleValue = 0.97) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: true,
      ...ANIMATION_CONFIG.springFast,
    }).start();
  }, [scale, scaleValue]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...ANIMATION_CONFIG.spring,
    }).start();
  }, [scale]);

  return { scale, onPressIn, onPressOut };
};

/**
 * Hook pour vérifier si l'utilisateur a activé "Réduire les animations"
 */
export const useReducedMotion = () => {
  const [isReducedMotion, setIsReducedMotion] = React.useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReducedMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotion
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return isReducedMotion;
};

/**
 * Hook combiné pour animation d'entrée (fade + slide)
 */
export const useEntranceAnimation = (
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distance = 20,
  duration = ANIMATION_CONFIG.durations.normal,
  delay = 0
) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateValue = useRef(new Animated.Value(
    direction === 'up' || direction === 'left' ? distance : -distance
  )).current;

  const animate = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
        easing: ANIMATION_CONFIG.easing.smooth,
      }),
      Animated.spring(translateValue, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.spring,
      }),
    ]).start();
  }, [opacity, translateValue, duration, delay]);

  const reset = useCallback(() => {
    opacity.setValue(0);
    translateValue.setValue(direction === 'up' || direction === 'left' ? distance : -distance);
  }, [opacity, translateValue, direction, distance]);

  const style = {
    opacity,
    transform: [
      direction === 'up' || direction === 'down'
        ? { translateY: translateValue }
        : { translateX: translateValue },
    ],
  };

  return { animate, reset, style, opacity, translateValue };
};

export default {
  ANIMATION_CONFIG,
  useFadeIn,
  useSlideIn,
  useScale,
  useShake,
  usePulse,
  useBounce,
  useStaggeredEntrance,
  usePressAnimation,
  useReducedMotion,
  useEntranceAnimation,
};
