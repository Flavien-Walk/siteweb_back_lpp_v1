/**
 * CoachMark - Tooltip contextuel pour onboarding
 * Affiche une bulle explicative pointant vers un element de l'UI.
 * Stocke dans AsyncStorage les marks deja vus pour ne les afficher qu'une fois.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { couleurs, espacements, rayons } from '../constantes/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const STORAGE_PREFIX = '@lpp_coachmark_';

// === TYPES ===

interface CoachMarkProps {
  /** Identifiant unique du coach mark (pour ne l'afficher qu'une fois) */
  id: string;
  /** Texte principal */
  message: string;
  /** Texte du bouton (defaut: "Compris") */
  buttonText?: string;
  /** Position verticale absolue du tooltip (top) */
  top?: number;
  /** Position : au-dessus ou en-dessous de la cible */
  position?: 'top' | 'bottom';
  /** Icone optionnelle */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Couleur de l'icone */
  iconColor?: string;
  /** Callback quand l'utilisateur ferme */
  onDismiss?: () => void;
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

// === COMPOSANT ===

const CoachMark: React.FC<CoachMarkProps> = ({
  id,
  message,
  buttonText = 'Compris',
  top,
  position = 'bottom',
  icon,
  iconColor = couleurs.primaire,
  onDismiss,
  forceShow = false,
  delay = 500,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
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

  const handleDismiss = useCallback(async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(async () => {
      setShow(false);
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${id}`, 'seen');
      onDismiss?.();
    });
  }, [id, onDismiss]);

  if (alreadySeen || !show) return null;

  return (
    <Modal transparent visible={show} animationType="none" onRequestClose={handleDismiss}>
      {/* Overlay sombre */}
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Animated.View
          style={[
            styles.tooltipContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              ...(top !== undefined ? { top } : { top: '40%' }),
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Triangle */}
            {position === 'bottom' && <View style={styles.triangleUp} />}

            <View style={styles.tooltip}>
              {icon && (
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                  <Ionicons name={icon} size={20} color={iconColor} />
                </View>
              )}
              <Text style={styles.message}>{message}</Text>
              <Pressable style={styles.button} onPress={handleDismiss}>
                <Text style={styles.buttonText}>{buttonText}</Text>
              </Pressable>
            </View>

            {position === 'top' && <View style={styles.triangleDown} />}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// === STYLES ===

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  tooltipContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: couleurs.fondElevated,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    width: '100%',
    maxWidth: SCREEN_WIDTH - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: couleurs.texte,
    marginBottom: 14,
  },
  button: {
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-end',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  triangleUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: couleurs.fondElevated,
    alignSelf: 'center',
    marginBottom: -1,
  },
  triangleDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: couleurs.fondElevated,
    alignSelf: 'center',
    marginTop: -1,
  },
});

export default CoachMark;
