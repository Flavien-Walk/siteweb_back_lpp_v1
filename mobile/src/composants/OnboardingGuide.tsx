/**
 * Onboarding Guide - Banderole en haut de la home
 * Affiche l'etape courante de l'onboarding avec un CTA cliquable.
 * Interrompable (Plus tard) et reprenable.
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs, espacements, rayons } from '../constantes/theme';
import { useGamification } from '../contexts/GamificationContext';

function OnboardingGuide() {
  const router = useRouter();
  const { state, dismissOnboarding } = useGamification();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAction = useCallback((mobileAction: string) => {
    switch (mobileAction) {
      case 'discover':
        // Scroll vers section Decouvrir
        break;
      case 'feed':
        // Deja sur le feed
        break;
      case 'profile':
        router.push('/(app)/profil');
        break;
      case 'entrepreneur':
        // Onglet entrepreneur
        break;
      case 'messages':
        router.push('/(app)/messages');
        break;
    }
  }, [router]);

  const handleDismiss = useCallback(() => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      dismissOnboarding();
    });
  }, [dismissOnboarding, fadeAnim]);

  if (!state?.onboarding) return null;
  if (state.onboarding.isDismissed || state.onboarding.isComplete) return null;

  // Trouver la prochaine etape non completee
  const nextStep = state.onboarding.steps.find(s => !s.isCompleted);
  if (!nextStep) return null;

  const completedCount = state.onboarding.steps.filter(s => s.isCompleted).length;
  const totalSteps = state.onboarding.steps.length;

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      <LinearGradient
        colors={[couleurs.primaire + '15', 'transparent']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {state.onboarding.steps.map((step, i) => (
          <View
            key={step.stepId}
            style={[
              styles.dot,
              step.isCompleted && styles.dotDone,
              step.stepId === nextStep.stepId && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Step content */}
      <View style={styles.stepRow}>
        <View style={[styles.stepIcon, { backgroundColor: couleurs.primaire + '20' }]}>
          <Ionicons name={nextStep.icon as any} size={20} color={couleurs.primaire} />
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepLabel}>
            Etape {completedCount + 1}/{totalSteps}
          </Text>
          <Text style={styles.stepTitle}>{nextStep.title}</Text>
          <Text style={styles.stepDesc} numberOfLines={1}>{nextStep.description}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.8 }]}
          onPress={() => handleAction(nextStep.mobileAction)}
        >
          <Text style={styles.ctaText}>C'est parti</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.6 }]}
          onPress={handleDismiss}
        >
          <Text style={styles.dismissText}>Plus tard</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default memo(OnboardingGuide);

const styles = StyleSheet.create({
  container: {
    backgroundColor: couleurs.fondElevated,
    borderRadius: rayons.lg,
    borderWidth: 1,
    borderColor: couleurs.primaire + '25',
    padding: espacements.md,
    marginBottom: espacements.md,
    overflow: 'hidden',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  dot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: couleurs.fondCard,
  },
  dotDone: {
    backgroundColor: couleurs.succes,
  },
  dotActive: {
    backgroundColor: couleurs.primaire,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInfo: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: couleurs.texteMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: couleurs.texte,
    marginTop: 1,
  },
  stepDesc: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: couleurs.primaire,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  dismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 12,
    color: couleurs.texteMuted,
  },
});
