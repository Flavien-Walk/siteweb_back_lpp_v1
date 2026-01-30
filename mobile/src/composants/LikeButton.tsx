/**
 * LikeButton - Bouton like animé style Instagram
 * Animation de coeur avec bounce et scale
 */

import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements, typographie } from '../constantes/theme';
import { ANIMATION_CONFIG } from '../hooks/useAnimations';

interface LikeButtonProps {
  /** État liké ou non */
  isLiked: boolean;
  /** Nombre de likes */
  count: number;
  /** Callback au clic */
  onPress: () => void;
  /** Taille de l'icône (défaut: 22) */
  size?: number;
  /** Afficher le compteur */
  showCount?: boolean;
  /** Style personnalisé */
  style?: StyleProp<ViewStyle>;
  /** Désactivé */
  disabled?: boolean;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  isLiked,
  count,
  onPress,
  size = 22,
  showCount = true,
  style,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fillAnim = useRef(new Animated.Value(isLiked ? 1 : 0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(1)).current;

  // Sync animation state with prop
  useEffect(() => {
    fillAnim.setValue(isLiked ? 1 : 0);
  }, [isLiked, fillAnim]);

  const handlePress = useCallback(() => {
    if (disabled) return;

    // Animation du coeur
    Animated.sequence([
      // Scale down rapidement
      Animated.timing(scaleAnim, {
        toValue: 0.7,
        duration: 50,
        useNativeDriver: true,
      }),
      // Bounce up avec spring
      Animated.spring(scaleAnim, {
        toValue: 1.3,
        useNativeDriver: true,
        tension: 100,
        friction: 3,
      }),
      // Retour à la normale
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.spring,
      }),
    ]).start();

    // Animation du remplissage
    Animated.timing(fillAnim, {
      toValue: isLiked ? 0 : 1,
      duration: 150,
      useNativeDriver: false,
    }).start();

    // Animation du compteur (pulse)
    Animated.sequence([
      Animated.timing(countAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(countAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Petit bounce vertical
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: -4,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }),
    ]).start();

    onPress();
  }, [isLiked, disabled, scaleAnim, fillAnim, bounceAnim, countAnim, onPress]);

  const heartColor = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [couleurs.texteSecondaire, couleurs.danger],
  });

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: bounceAnim },
            ],
          },
        ]}
      >
        {/* Coeur plein (visible quand liké) */}
        <Animated.View
          style={[
            styles.heartIcon,
            {
              opacity: fillAnim,
            },
          ]}
        >
          <Ionicons
            name="heart"
            size={size}
            color={couleurs.danger}
          />
        </Animated.View>

        {/* Coeur outline (toujours visible) */}
        <Animated.View
          style={[
            styles.heartIcon,
            {
              opacity: fillAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            },
          ]}
        >
          <Ionicons
            name="heart-outline"
            size={size}
            color={couleurs.texteSecondaire}
          />
        </Animated.View>
      </Animated.View>

      {showCount && (
        <Animated.Text
          style={[
            styles.count,
            {
              color: isLiked ? couleurs.danger : couleurs.texteSecondaire,
              transform: [{ scale: countAnim }],
            },
          ]}
        >
          {count > 0 ? count : ''}
        </Animated.Text>
      )}
    </Pressable>
  );
};

/**
 * Variante compacte pour les commentaires
 */
interface LikeButtonCompactProps {
  isLiked: boolean;
  count?: number;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
}

export const LikeButtonCompact: React.FC<LikeButtonCompactProps> = ({
  isLiked,
  count,
  onPress,
  size = 18,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (disabled) return;

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.spring,
      }),
    ]).start();

    onPress();
  }, [disabled, scaleAnim, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={styles.compactContainer}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={size}
          color={isLiked ? couleurs.danger : couleurs.texteSecondaire}
        />
      </Animated.View>
      {count !== undefined && count > 0 && (
        <Text style={[
          styles.compactCount,
          { color: isLiked ? couleurs.danger : couleurs.texteSecondaire },
        ]}>
          {count}
        </Text>
      )}
    </Pressable>
  );
};

/**
 * Double tap like animation (pour les posts/images)
 */
interface DoubleTapLikeProps {
  onDoubleTap: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const DoubleTapLike: React.FC<DoubleTapLikeProps> = ({
  onDoubleTap,
  children,
  style,
}) => {
  const lastTap = useRef<number | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const handlePress = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTap.current && now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap détecté
      onDoubleTap();

      // Animation du grand coeur
      heartScale.setValue(0);
      heartOpacity.setValue(1);

      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(heartScale, {
            toValue: 1.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(heartOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      lastTap.current = null;
    } else {
      lastTap.current = now;
    }
  }, [onDoubleTap, heartScale, heartOpacity]);

  return (
    <Pressable onPress={handlePress} style={style}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.doubleTapHeart,
          {
            opacity: heartOpacity,
            transform: [{ scale: heartScale }],
          },
        ]}
      >
        <Ionicons name="heart" size={80} color={couleurs.blanc} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  iconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    position: 'absolute',
  },
  count: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
    minWidth: 20,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactCount: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default LikeButton;
