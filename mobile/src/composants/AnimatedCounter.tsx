/**
 * AnimatedCounter - Compteur avec animation de changement
 * Pour les statistiques, likes, followers, etc.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TextStyle,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { couleurs, typographie } from '../constantes/theme';
import { ANIMATION_CONFIG } from '../hooks/useAnimations';

interface AnimatedCounterProps {
  /** Valeur à afficher */
  value: number;
  /** Style du texte */
  textStyle?: StyleProp<TextStyle>;
  /** Style du conteneur */
  style?: StyleProp<ViewStyle>;
  /** Préfixe (ex: "+") */
  prefix?: string;
  /** Suffixe (ex: "k") */
  suffix?: string;
  /** Formater les grands nombres (1000 → 1k) */
  formatLarge?: boolean;
  /** Animation au montage (comptage de 0 à N) */
  animateOnMount?: boolean;
  /** Durée de l'animation de montage en ms */
  mountDuration?: number;
}

const formatNumber = (num: number, formatLarge: boolean): string => {
  if (!formatLarge) return num.toString();

  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  textStyle,
  style,
  prefix = '',
  suffix = '',
  formatLarge = false,
  animateOnMount = false,
  mountDuration = 1000,
}) => {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(value);

  // Animation au changement de valeur
  useEffect(() => {
    if (value !== prevValue.current) {
      const isIncreasing = value > prevValue.current;

      // Animation de scale + translate
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            ...ANIMATION_CONFIG.spring,
          }),
        ]),
        Animated.sequence([
          Animated.timing(translateYAnim, {
            toValue: isIncreasing ? -5 : 5,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            useNativeDriver: true,
            ...ANIMATION_CONFIG.spring,
          }),
        ]),
      ]).start();

      setDisplayValue(value);
      prevValue.current = value;
    }
  }, [value, scaleAnim, translateYAnim]);

  // Animation de comptage au montage
  useEffect(() => {
    if (animateOnMount && value > 0) {
      const startTime = Date.now();
      const startValue = 0;
      const endValue = value;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / mountDuration, 1);

        // Easing: easeOutQuart
        const eased = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (endValue - startValue) * eased);

        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [animateOnMount, value, mountDuration]);

  return (
    <View style={[styles.container, style]}>
      <Animated.Text
        style={[
          styles.text,
          textStyle,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        {prefix}
        {formatNumber(displayValue, formatLarge)}
        {suffix}
      </Animated.Text>
    </View>
  );
};

/**
 * Compteur avec label (pour les profils)
 */
interface StatCounterProps {
  value: number;
  label: string;
  textStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  formatLarge?: boolean;
  animateOnMount?: boolean;
}

export const StatCounter: React.FC<StatCounterProps> = ({
  value,
  label,
  textStyle,
  labelStyle,
  style,
  formatLarge = true,
  animateOnMount = true,
}) => {
  return (
    <View style={[styles.statContainer, style]}>
      <AnimatedCounter
        value={value}
        textStyle={[styles.statValue, textStyle]}
        formatLarge={formatLarge}
        animateOnMount={animateOnMount}
      />
      <Text style={[styles.statLabel, labelStyle]}>{label}</Text>
    </View>
  );
};

/**
 * Badge de notification avec compteur animé
 */
interface NotificationBadgeProps {
  count: number;
  style?: StyleProp<ViewStyle>;
  maxCount?: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  style,
  maxCount = 99,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > 0) {
      // Animation d'apparition
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }).start();

      // Pulse continue
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [count, scaleAnim, pulseAnim]);

  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <Animated.View
      style={[
        styles.badge,
        style,
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
          ],
        },
      ]}
    >
      <Text style={styles.badgeText}>{displayCount}</Text>
    </Animated.View>
  );
};

/**
 * Compteur de changement (ex: +12, -5)
 */
interface ChangeCounterProps {
  change: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const ChangeCounter: React.FC<ChangeCounterProps> = ({
  change,
  style,
  textStyle,
}) => {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (change !== 0) {
      slideAnim.setValue(change > 0 ? 20 : -20);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Disparition après 2 secondes
      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: change > 0 ? -20 : 20,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [change, slideAnim, opacityAnim]);

  if (change === 0) return null;

  const isPositive = change > 0;

  return (
    <Animated.View
      style={[
        styles.changeContainer,
        style,
        {
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text
        style={[
          styles.changeText,
          { color: isPositive ? couleurs.succes : couleurs.danger },
          textStyle,
        ]}
      >
        {isPositive ? '+' : ''}{change}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  text: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  statContainer: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typographie.tailles.xl,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
  },
  statLabel: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    marginTop: 4,
  },
  badge: {
    backgroundColor: couleurs.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: couleurs.blanc,
    fontSize: 11,
    fontWeight: typographie.poids.bold,
  },
  changeContainer: {
    position: 'absolute',
    right: -30,
  },
  changeText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.bold,
  },
});

export default AnimatedCounter;
