/**
 * Toast d'XP - affiche les gains d'XP en temps reel.
 * Se positionne en haut de l'ecran, apparait/disparait avec animation.
 */

import React, { memo, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';
import { useGamification } from '../contexts/GamificationContext';

function XpToast() {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);
  const { xpToast, hideXpToast } = useGamification();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (xpToast) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [xpToast]);

  if (!xpToast) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toast, xpToast.levelUp && styles.toastLevelUp]}>
        <Ionicons
          name={xpToast.levelUp ? 'arrow-up-circle' : 'star'}
          size={18}
          color={xpToast.levelUp ? couleurs.accent : couleurs.primaire}
        />
        <Text style={styles.text}>
          +{xpToast.xp} XP
          {xpToast.levelUp && xpToast.levelName
            ? ` — Niveau ${xpToast.levelName} !`
            : ''
          }
        </Text>
      </View>
    </Animated.View>
  );
}

export default memo(XpToast);

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: couleurs.fondElevated,
    borderWidth: 1,
    borderColor: couleurs.primaire + '40',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: couleurs.primaire,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastLevelUp: {
    borderColor: couleurs.accent + '60',
    backgroundColor: couleurs.fondElevated,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: couleurs.texte,
  },
});
