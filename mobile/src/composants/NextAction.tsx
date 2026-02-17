/**
 * Widget "Mission en cours" pour la Home
 * Compact : niveau + barre XP, quete active + progression.
 * Tout le widget est cliquable → navigation vers l'ecran Parcours.
 */

import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import { useGamification } from '../contexts/GamificationContext';

function NextAction() {
  const { couleurs } = useTheme();
  const { state } = useGamification();
  const router = useRouter();
  const styles = createStyles(couleurs);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const questProgressAnim = useRef(new Animated.Value(0)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;

  const nextQuest = state?.quickQuests?.find(q => !q.isCompleted) || null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Animer la barre de progression de la quete
  useEffect(() => {
    if (!nextQuest) {
      questProgressAnim.setValue(0);
      return;
    }
    const ratio = nextQuest.target > 0 ? nextQuest.progress / nextQuest.target : 0;
    Animated.spring(questProgressAnim, {
      toValue: Math.min(ratio, 1),
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [nextQuest?.progress, nextQuest?.target, nextQuest?.questId]);

  // Animer la barre XP de niveau
  useEffect(() => {
    if (!state) return;
    const xpForNext = state.xpForNextLevel || 100;
    const xpIn = state.xpInLevel || 0;
    Animated.spring(xpBarAnim, {
      toValue: xpForNext > 0 ? Math.min(xpIn / xpForNext, 1) : 0,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [state?.xpInLevel, state?.xpForNextLevel]);

  const goToParcours = () => router.push('/(app)/parcours');

  if (!state) return null;

  const doneQuests = state.quickQuests?.filter(q => q.isCompleted).length || 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={goToParcours}
      >
        {/* === Niveau + barre XP === */}
        <View style={styles.header}>
          <View style={[styles.levelIcon, { backgroundColor: couleurs.primaire + '18' }]}>
            <Ionicons name={state.levelIcon as any} size={16} color={couleurs.primaire} />
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.headerTopRow}>
              <Text style={[styles.levelName, { color: couleurs.texte }]}>
                Niv.{state.level} {state.levelName}
              </Text>
              <Text style={[styles.xpCounter, { color: couleurs.texteMuted }]}>
                {state.xpInLevel || 0}/{state.xpForNextLevel || 100} XP
              </Text>
            </View>
            <View style={[styles.xpBarBg, { backgroundColor: couleurs.fondTertiaire }]}>
              <Animated.View
                style={[
                  styles.xpBarFill,
                  {
                    backgroundColor: couleurs.primaire,
                    width: xpBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
          {(state.streakDays || 0) > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: couleurs.erreur + '15' }]}>
              <Ionicons name="flame" size={12} color={couleurs.erreur} />
              <Text style={[styles.streakText, { color: couleurs.erreur }]}>{state.streakDays}</Text>
            </View>
          )}
        </View>

        {/* === Separateur === */}
        <View style={[styles.sep, { backgroundColor: couleurs.bordure }]} />

        {/* === Quete active ou etat complete === */}
        {nextQuest ? (
          <View style={styles.questSection}>
            <View style={styles.questRow}>
              <View style={[styles.questIconWrap, { backgroundColor: nextQuest.color + '15' }]}>
                <Ionicons name={nextQuest.icon as any} size={16} color={nextQuest.color} />
              </View>
              <View style={styles.questInfo}>
                <Text style={[styles.questTitle, { color: couleurs.texte }]} numberOfLines={1}>
                  {nextQuest.title}
                </Text>
                <Text style={[styles.questDesc, { color: couleurs.texteSecondaire }]} numberOfLines={1}>
                  {nextQuest.description}
                </Text>
              </View>
              <View style={[styles.xpChip, { backgroundColor: couleurs.accent + '15' }]}>
                <Text style={[styles.xpChipText, { color: couleurs.accent }]}>+{nextQuest.xpReward}</Text>
              </View>
            </View>
            {/* Barre de progression de la quete */}
            <View style={styles.questProgressRow}>
              <View style={[styles.questProgressBg, { backgroundColor: couleurs.fondTertiaire }]}>
                <Animated.View
                  style={[
                    styles.questProgressFill,
                    {
                      backgroundColor: nextQuest.color,
                      width: questProgressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.questProgressText, { color: couleurs.texteMuted }]}>
                {nextQuest.progress}/{nextQuest.target}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.completedSection}>
            <Ionicons name="checkmark-circle" size={18} color={couleurs.succes} />
            <Text style={[styles.completedText, { color: couleurs.succes }]}>
              {doneQuests} quete{doneQuests > 1 ? 's' : ''} completee{doneQuests > 1 ? 's' : ''} !
            </Text>
          </View>
        )}

        {/* === Lien vers parcours === */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: couleurs.primaire }]}>Mon parcours</Text>
          <Ionicons name="chevron-forward" size={14} color={couleurs.primaire} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default memo(NextAction);

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    marginHorizontal: espacements.md,
    marginBottom: espacements.md,
  },
  card: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },

  // Header — niveau + XP
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 5,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelName: {
    fontSize: 13,
    fontWeight: '700',
  },
  xpCounter: {
    fontSize: 11,
    fontWeight: '600',
  },
  xpBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Separateur
  sep: {
    height: 1,
    marginVertical: 12,
  },

  // Section quete
  questSection: {
    gap: 8,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  questIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  questDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  xpChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  xpChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  questProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 42, // aligne avec le titre (icon 32 + gap 10)
  },
  questProgressBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  questProgressText: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },

  // Etat tout complete
  completedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  completedText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
