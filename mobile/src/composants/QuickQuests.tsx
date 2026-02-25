/**
 * Module Quetes Rapides pour la Home
 * Affiche jusqu'a 3 quetes rapides avec progression instantanee.
 */

import React, { memo, useCallback, useRef, useEffect, useMemo } from 'react';
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
import { espacements, rayons } from '../constantes/theme';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';
import { useGamification } from '../contexts/GamificationContext';
import type { QuestProgress } from '../services/gamification';

// === QUEST CARD ===

const QuestCard = memo(({ quest, index }: { quest: QuestProgress; index: number }) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, index * 80);
    return () => clearTimeout(timer);
  }, []);

  // Animer la barre de progression
  useEffect(() => {
    const target = quest.target > 0 ? quest.progress / quest.target : 0;
    Animated.spring(progressAnim, {
      toValue: Math.min(target, 1),
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [quest.progress, quest.target]);

  const handlePress = useCallback(() => {
    switch (quest.mobileAction) {
      case 'discover':
        // Scroll vers la section Decouvrir dans l'accueil
        // On utilise un event global ou on navigate
        break;
      case 'feed':
        // Deja sur le feed
        break;
      case 'entrepreneur':
        router.push('/(app)/accueil');
        break;
      case 'create_post':
        // Ouvrir le modal de creation de post (gere par accueil.tsx)
        break;
    }
  }, [quest.mobileAction, router]);

  const progressPercent = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : 0;
  const isDone = quest.isCompleted;

  return (
    <Animated.View style={[
      styles.questCard,
      {
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      },
      isDone && styles.questCardDone,
    ]}>
      <Pressable
        style={({ pressed }) => [styles.questPressable, pressed && { opacity: 0.8 }]}
        onPress={handlePress}
      >
        {/* Icone */}
        <View style={[styles.questIcon, { backgroundColor: quest.color + '15' }]}>
          {isDone ? (
            <Ionicons name="checkmark-circle" size={20} color={couleurs.succes} />
          ) : (
            <Ionicons name={quest.icon as any} size={18} color={quest.color} />
          )}
        </View>

        {/* Info */}
        <View style={styles.questInfo}>
          <Text style={[styles.questTitle, isDone && styles.questTitleDone]} numberOfLines={1}>
            {quest.title}
          </Text>

          {/* Barre de progression */}
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: isDone ? couleurs.succes : quest.color,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: isDone ? couleurs.succes : quest.color }]}>
              {quest.progress}/{quest.target}
            </Text>
          </View>
        </View>

        {/* XP badge */}
        <View style={[styles.xpBadge, isDone && styles.xpBadgeDone]}>
          {isDone ? (
            <Ionicons name="checkmark" size={12} color={couleurs.succes} />
          ) : (
            <Text style={styles.xpText}>+{quest.xpReward}</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

// === COMPOSANT PRINCIPAL ===

function QuickQuests() {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);
  const { state } = useGamification();

  if (!state || state.quickQuests.length === 0) return null;

  // Ne montrer que les non-completees (max 3)
  const activeQuests = state.quickQuests.filter(q => !q.isCompleted).slice(0, 3);
  if (activeQuests.length === 0) return null;

  const levelInfo = state;

  return (
    <View style={styles.container}>
      {/* Header avec niveau */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionLabel}>QUETES RAPIDES</Text>
          <View style={styles.levelBadge}>
            <Ionicons name={state.levelIcon as any} size={10} color={couleurs.primaire} />
            <Text style={styles.levelText}>Niv.{state.level}</Text>
          </View>
        </View>
        <View style={styles.xpTotal}>
          <Ionicons name="star" size={12} color={couleurs.accent} />
          <Text style={styles.xpTotalText}>{state.xp} XP</Text>
        </View>
      </View>

      {/* Quetes */}
      {activeQuests.map((quest, index) => (
        <QuestCard key={quest.questId} quest={quest} index={index} />
      ))}
    </View>
  );
}

export default memo(QuickQuests);

// === STYLES ===

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    marginBottom: espacements.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: espacements.sm,
    paddingHorizontal: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: couleurs.texteMuted,
    letterSpacing: 1,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    color: couleurs.primaire,
  },
  xpTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  xpTotalText: {
    fontSize: 11,
    fontWeight: '600',
    color: couleurs.accent,
  },

  // Quest card
  questCard: {
    backgroundColor: couleurs.fondTertiaire,
    borderRadius: rayons.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    marginBottom: 6,
    overflow: 'hidden',
  },
  questCardDone: {
    borderColor: couleurs.succes + '30',
    opacity: 0.7,
  },
  questPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  questIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: 4,
  },
  questTitleDone: {
    textDecorationLine: 'line-through',
    color: couleurs.texteSecondaire,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBg: {
    flex: 1,
    height: 4,
    backgroundColor: couleurs.fondCard,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'right',
  },

  // XP badge
  xpBadge: {
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  xpBadgeDone: {
    backgroundColor: couleurs.succes + '25',
  },
  xpText: {
    fontSize: 11,
    fontWeight: '700',
    color: couleurs.primaire,
  },
});
