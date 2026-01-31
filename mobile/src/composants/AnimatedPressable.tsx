/**
 * AnimatedPressable - Bouton avec feedback visuel animé
 * Remplace Pressable/TouchableOpacity avec animations fluides
 */

import React, { useRef, useCallback, useMemo } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  ViewStyle,
  StyleProp,
  StyleSheet,
} from 'react-native';
import { ANIMATION_CONFIG } from '../hooks/useAnimations';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  /** Style du conteneur */
  style?: StyleProp<ViewStyle>;
  /** Échelle au press (défaut: 0.97) */
  scaleOnPress?: number;
  /** Opacité au press (défaut: 1) */
  opacityOnPress?: number;
  /** Désactiver l'animation */
  disableAnimation?: boolean;
  /** Contenu enfant */
  children: React.ReactNode;
}

// Propriétés de layout à appliquer au Pressable externe
const LAYOUT_PROPS: (keyof ViewStyle)[] = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
];

const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  style,
  scaleOnPress = 0.97,
  opacityOnPress = 1,
  disableAnimation = false,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Séparer les styles de layout (pour Pressable) des autres styles (pour Animated.View)
  const { pressableStyle, innerStyle } = useMemo(() => {
    const flatStyle = StyleSheet.flatten(style) || {};
    const layoutStyle: ViewStyle = {};
    const contentStyle: ViewStyle = {};

    Object.keys(flatStyle).forEach((key) => {
      if (LAYOUT_PROPS.includes(key as keyof ViewStyle)) {
        (layoutStyle as any)[key] = (flatStyle as any)[key];
      } else {
        (contentStyle as any)[key] = (flatStyle as any)[key];
      }
    });

    // Si le Pressable a flex, l'inner view doit aussi remplir son parent
    if (layoutStyle.flex || layoutStyle.flexGrow || layoutStyle.width || layoutStyle.height) {
      contentStyle.flex = contentStyle.flex ?? 1;
    }

    return { pressableStyle: layoutStyle, innerStyle: contentStyle };
  }, [style]);

  const handlePressIn = useCallback((event: any) => {
    if (disableAnimation || disabled) {
      onPressIn?.(event);
      return;
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scaleOnPress,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.springFast,
      }),
      Animated.timing(opacityAnim, {
        toValue: opacityOnPress,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    onPressIn?.(event);
  }, [scaleAnim, opacityAnim, scaleOnPress, opacityOnPress, disableAnimation, disabled, onPressIn]);

  const handlePressOut = useCallback((event: any) => {
    if (disableAnimation || disabled) {
      onPressOut?.(event);
      return;
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.spring,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPressOut?.(event);
  }, [scaleAnim, opacityAnim, disableAnimation, disabled, onPressOut]);

  return (
    <Pressable
      style={pressableStyle}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        style={[
          innerStyle,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

/**
 * Variante avec bounce au tap (pour les boutons d'action importants)
 */
interface AnimatedBounceButtonProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
}

export const AnimatedBounceButton: React.FC<AnimatedBounceButtonProps> = ({
  style,
  children,
  disabled,
  onPress,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback((event: any) => {
    if (disabled) return;

    // Animation bounce
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        useNativeDriver: true,
        tension: 100,
        friction: 5,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.spring,
      }),
    ]).start(() => {
      onPress?.(event);
    });
  }, [scaleAnim, disabled, onPress]);

  return (
    <Pressable onPress={handlePress} disabled={disabled} {...props}>
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

/**
 * Variante avec ripple effect (pour les listes)
 */
interface AnimatedListItemProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  style,
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback((event: any) => {
    if (disabled) {
      onPressIn?.(event);
      return;
    }

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();

    onPressIn?.(event);
  }, [scaleAnim, backgroundAnim, disabled, onPressIn]);

  const handlePressOut = useCallback((event: any) => {
    if (disabled) {
      onPressOut?.(event);
      return;
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...ANIMATION_CONFIG.spring,
      }),
      Animated.timing(backgroundAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    onPressOut?.(event);
  }, [scaleAnim, backgroundAnim, disabled, onPressOut]);

  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgba(124, 92, 255, 0.08)'],
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            backgroundColor,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default AnimatedPressable;
