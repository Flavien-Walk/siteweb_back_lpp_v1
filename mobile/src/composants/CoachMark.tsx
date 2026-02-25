/**
 * CoachMark - Systeme d'onboarding sequentiel
 * Affiche des tooltips un par un avec progression.
 * Stocke dans AsyncStorage les flows deja vus.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { espacements, rayons } from '../constantes/theme';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const STORAGE_PREFIX = '@lpp_coachmark_';

// === TYPES ===

export interface CoachStep {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  buttonText?: string;
}

interface OnboardingFlowProps {
  /** Identifiant unique du flow (pour ne l'afficher qu'une fois) */
  id: string;
  /** Les etapes du flow */
  steps: CoachStep[];
  /** Callback quand l'utilisateur termine */
  onComplete?: () => void;
  /** Forcer l'affichage meme si deja vu (debug) */
  forceShow?: boolean;
  /** Delai avant apparition (ms) */
  delay?: number;
}

// === HOOK ===

export function useCoachMark(id: string) {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(`${STORAGE_PREFIX}${id}`).then(val => {
      if (val !== 'seen') {
        setVisible(true);
      }
      setChecked(true);
    });
  }, [id]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${id}`, 'seen');
  }, [id]);

  return { visible: checked && visible, dismiss };
}

/** Reset tous les coach marks (pour debug/testing) */
export async function resetAllCoachMarks() {
  const keys = await AsyncStorage.getAllKeys();
  const coachKeys = keys.filter(k => k.startsWith(STORAGE_PREFIX));
  if (coachKeys.length > 0) {
    await AsyncStorage.multiRemove(coachKeys);
  }
}

// === COMPOSANT FLOW ===

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  id,
  steps,
  onComplete,
  forceShow = false,
  delay = 800,
}) => {
  const { couleurs } = useTheme();
  const s = useMemo(() => createStyles(couleurs), [couleurs]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);
  const [alreadySeen, setAlreadySeen] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setShow(true);
      return;
    }
    AsyncStorage.getItem(`${STORAGE_PREFIX}${id}`).then(val => {
      if (val === 'seen') {
        setAlreadySeen(true);
      } else {
        setShow(true);
      }
    });
  }, [id, forceShow]);

  // Animation d'entree
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [show, delay]);

  // Animation slide entre steps
  const animateToStep = useCallback((nextStep: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 30, duration: 0, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(nextStep);
      Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 60, useNativeDriver: true }).start();
    });
  }, []);

  const handleNext = useCallback(async () => {
    if (currentStep < steps.length - 1) {
      animateToStep(currentStep + 1);
    } else {
      // Dernier step : fermer
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(async () => {
        setShow(false);
        await AsyncStorage.setItem(`${STORAGE_PREFIX}${id}`, 'seen');
        onComplete?.();
      });
    }
  }, [currentStep, steps.length, id, onComplete, animateToStep]);

  const handleSkip = useCallback(async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(async () => {
      setShow(false);
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${id}`, 'seen');
      onComplete?.();
    });
  }, [id, onComplete]);

  if (alreadySeen || !show || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const iconColor = step.iconColor || couleurs.primaire;

  return (
    <Modal transparent visible={show} animationType="none" onRequestClose={handleSkip}>
      <Pressable style={s.overlay} onPress={handleSkip}>
        <Animated.View
          style={[
            s.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={s.card}>
            {/* Progress dots */}
            {steps.length > 1 && (
              <View style={s.dotsRow}>
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.dot,
                      i === currentStep ? s.dotActive : s.dotInactive,
                      i < currentStep && s.dotDone,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Content with slide animation */}
            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
              {step.icon && (
                <View style={[s.iconBg, { backgroundColor: `${iconColor}15` }]}>
                  <Ionicons name={step.icon} size={28} color={iconColor} />
                </View>
              )}
              <Text style={s.message}>{step.message}</Text>
            </Animated.View>

            {/* Actions */}
            <View style={s.actions}>
              {!isLast && (
                <Pressable onPress={handleSkip} style={s.skipBtn}>
                  <Text style={s.skipText}>Passer</Text>
                </Pressable>
              )}
              <Pressable style={s.nextBtn} onPress={handleNext}>
                <Text style={s.nextText}>
                  {step.buttonText || (isLast ? "C'est parti !" : 'Suivant')}
                </Text>
                {!isLast && <Ionicons name="arrow-forward" size={16} color="#fff" />}
              </Pressable>
            </View>

            {/* Step counter */}
            <Text style={s.counter}>{currentStep + 1}/{steps.length}</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// === STYLES ===

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - 48,
  },
  card: {
    backgroundColor: couleurs.fondElevated,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 255, 0.2)',
    shadowColor: '#7C5CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: couleurs.primaire,
    width: 24,
  },
  dotInactive: {
    backgroundColor: couleurs.fondCard,
  },
  dotDone: {
    backgroundColor: couleurs.succes,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: couleurs.texte,
    textAlign: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },
  nextBtn: {
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  nextText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  counter: {
    fontSize: 11,
    color: couleurs.texteMuted,
    textAlign: 'center',
    marginTop: 12,
  },
});

export default OnboardingFlow;
