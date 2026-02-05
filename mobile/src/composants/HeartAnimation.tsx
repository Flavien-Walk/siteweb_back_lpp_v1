/**
 * HeartAnimation - Animation de coeur style Instagram pour double-tap like
 * Pop + fade out au centre de la vidéo
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs } from '../constantes/theme';

interface HeartAnimationProps {
  visible: boolean;
  onAnimationEnd?: () => void;
  size?: number;
}

export default function HeartAnimation({
  visible,
  onAnimationEnd,
  size = 100,
}: HeartAnimationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset
      scaleAnim.setValue(0);
      opacityAnim.setValue(1);

      // Animation sequence: pop in -> hold -> fade out
      Animated.sequence([
        // Pop in with bounce
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        // Hold briefly
        Animated.delay(200),
        // Fade out
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationEnd?.();
      });
    }
  }, [visible, scaleAnim, opacityAnim, onAnimationEnd]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.heart,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Ionicons name="heart" size={size} color={couleurs.danger} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  heart: {
    // Ombre légère pour visibilité sur fond clair/foncé
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
