/**
 * SplashScreen - Écran de chargement animé
 * Design moderne avec effets 3D et animations fluides
 * La Première Pierre - LPP
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs } from '../constantes/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish?: () => void;
}

// Composant pour les particules flottantes
const FloatingParticle = ({
  delay,
  startX,
  size,
  duration
}: {
  delay: number;
  startX: number;
  size: number;
  duration: number;
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT + 50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(translateX, {
            toValue: Math.random() * 60 - 30,
            duration: duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1,
              duration: duration * 0.5,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.3,
              duration: duration * 0.5,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 50,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ translateY }, { translateX }, { scale }],
          opacity,
        },
      ]}
    />
  );
};

// Composant pour les anneaux orbitaux
const OrbitalRing = ({
  size,
  delay,
  clockwise = true
}: {
  size: number;
  delay: number;
  clockwise?: boolean;
}) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(rotation, {
        toValue: clockwise ? 1 : -1,
        duration: 8000 + delay * 2,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.orbitalRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ rotateZ: rotateInterpolate }],
          opacity,
        },
      ]}
    >
      <View style={[styles.orbitalDot, { backgroundColor: couleurs.primaire }]} />
    </Animated.View>
  );
};

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // Animations principales
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotateY = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  // Animations des pierres 3D
  const stone1Anim = useRef(new Animated.Value(0)).current;
  const stone2Anim = useRef(new Animated.Value(0)).current;
  const stone3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Séquence d'animation principale
    Animated.sequence([
      // Phase 1: Apparition du logo avec effet 3D
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Rotation 3D Y
        Animated.timing(logoRotateY, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),

      // Phase 2: Animation des pierres
      Animated.stagger(150, [
        Animated.spring(stone1Anim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(stone2Anim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(stone3Anim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // Phase 3: Texte
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),

      // Phase 4: Sous-titre
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de pulsation du glow (loop)
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.8,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de la barre de progression
    Animated.timing(progressWidth, {
      toValue: 1,
      duration: 2500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Timer pour finir le splash
    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish?.();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Interpolation rotation 3D
  const rotateYInterpolate = logoRotateY.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Interpolation pour les pierres
  const stoneTransforms = [stone1Anim, stone2Anim, stone3Anim].map((anim, index) => ({
    scale: anim,
    translateY: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [50 + index * 20, 0],
    }),
    rotate: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [`${-30 + index * 15}deg`, '0deg'],
    }),
  }));

  // Génération des particules
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 400,
    startX: (SCREEN_WIDTH / 12) * i + Math.random() * 30,
    size: 4 + Math.random() * 8,
    duration: 4000 + Math.random() * 2000,
  }));

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <LinearGradient
        colors={['#0D0D12', '#13131A', '#0D0D12']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Particules flottantes */}
        {particles.map((p) => (
          <FloatingParticle key={p.id} {...p} />
        ))}

        {/* Effet de grille futuriste */}
        <View style={styles.gridOverlay}>
          {Array.from({ length: 10 }, (_, i) => (
            <View key={`h-${i}`} style={[styles.gridLine, styles.gridLineHorizontal, { top: `${i * 10}%` }]} />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <View key={`v-${i}`} style={[styles.gridLine, styles.gridLineVertical, { left: `${i * 10}%` }]} />
          ))}
        </View>

        {/* Glow effect derrière le logo */}
        <Animated.View style={[styles.glowContainer, { opacity: glowPulse }]}>
          <LinearGradient
            colors={['transparent', 'rgba(124, 92, 255, 0.3)', 'transparent']}
            style={styles.glow}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>

        {/* Anneaux orbitaux */}
        <View style={styles.orbitalsContainer}>
          <OrbitalRing size={200} delay={500} clockwise={true} />
          <OrbitalRing size={260} delay={800} clockwise={false} />
          <OrbitalRing size={320} delay={1100} clockwise={true} />
        </View>

        {/* Logo principal avec effet 3D */}
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { perspective: 1000 },
                  { rotateY: rotateYInterpolate },
                ],
              },
            ]}
          >
            {/* Ombre 3D */}
            <View style={styles.logoShadow}>
              <Text style={styles.logoShadowText}>LPP</Text>
            </View>

            {/* Logo principal */}
            <LinearGradient
              colors={[couleurs.primaire, couleurs.secondaire]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>LPP</Text>
            </LinearGradient>

            {/* Reflet brillant */}
            <View style={styles.logoShine} />
          </Animated.View>

          {/* Pierres 3D animées */}
          <View style={styles.stonesContainer}>
            {stoneTransforms.map((transform, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.stone,
                  (styles as Record<string, unknown>)[`stone${index + 1}`] as Animated.WithAnimatedObject<ViewStyle>,
                  {
                    transform: [
                      { scale: transform.scale },
                      { translateY: transform.translateY },
                      { rotate: transform.rotate },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    index === 0
                      ? [couleurs.primaire, couleurs.primaireDark]
                      : index === 1
                      ? [couleurs.secondaire, '#1BA8AB']
                      : [couleurs.accent, '#CC9547']
                  }
                  style={styles.stoneGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Texte principal */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>La Première Pierre</Text>
        </Animated.View>

        {/* Sous-titre */}
        <Animated.View style={[styles.subtitleContainer, { opacity: subtitleOpacity }]}>
          <Text style={styles.subtitle}>Construisez l'avenir ensemble</Text>
        </Animated.View>

        {/* Barre de progression */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressWidth.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={[couleurs.primaire, couleurs.secondaire]}
                style={styles.progressGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </Animated.View>
          </View>
          <Text style={styles.progressText}>Chargement...</Text>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: couleurs.primaire,
  },
  gridLineHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  particle: {
    position: 'absolute',
    backgroundColor: couleurs.primaire,
  },
  glowContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orbitalsContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitalRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  orbitalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  logoWrapper: {
    position: 'relative',
  },
  logoShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    opacity: 0.3,
  },
  logoShadowText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 8,
  },
  logoGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
  },
  logoText: {
    fontSize: 72,
    fontWeight: '900',
    color: couleurs.blanc,
    letterSpacing: 8,
    textShadowColor: 'rgba(124, 92, 255, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  logoShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  stonesContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  stone: {
    position: 'absolute',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stone1: {
    width: 24,
    height: 24,
    top: -20,
    right: -30,
    transform: [{ rotate: '45deg' }],
  },
  stone2: {
    width: 18,
    height: 18,
    bottom: 20,
    left: -40,
    transform: [{ rotate: '30deg' }],
  },
  stone3: {
    width: 14,
    height: 14,
    top: 40,
    right: -50,
    transform: [{ rotate: '-15deg' }],
  },
  stoneGradient: {
    flex: 1,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: couleurs.texte,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitleContainer: {
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: couleurs.texteSecondaire,
    letterSpacing: 1,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 100,
    width: '70%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: couleurs.bordure,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    marginTop: 12,
    fontSize: 12,
    color: couleurs.texteMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  versionContainer: {
    position: 'absolute',
    bottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: couleurs.texteMuted,
  },
});

export default SplashScreen;
