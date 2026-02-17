/**
 * Ecran Parcours — Vue complete des quetes, niveau et progression.
 * Accessible via le bouton FAB "Parcours" sur la Home.
 */

import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeCouleurs } from '../../src/contexts/ThemeContext';
import { espacements, rayons } from '../../src/constantes/theme';
import { useGamification } from '../../src/contexts/GamificationContext';
import QuickQuests from '../../src/composants/QuickQuests';
import SwipeableScreen from '../../src/composants/SwipeableScreen';
import type { QuestProgress } from '../../src/services/gamification';

export default function ParcoursScreen() {
  const { couleurs } = useTheme();
  const router = useRouter();
  const { state, isLoading, refresh } = useGamification();
  const styles = createStyles(couleurs);

  useEffect(() => {
    refresh();
  }, []);

  if (isLoading && !state) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: couleurs.fond }]}>
        <ActivityIndicator size="large" color={couleurs.primaire} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!state) return null;

  const xpForNext = state.xpForNextLevel || 100;
  const xpInLevel = state.xpInLevel || 0;
  const progressPercent = xpForNext > 0 ? Math.min(xpInLevel / xpForNext, 1) : 0;

  // Regrouper les quetes de chapitre par chapitre
  const chapterMap: Record<string, QuestProgress[]> = {};
  for (const q of state.quests || []) {
    const chapter = (q as any).chapter || 'Autre';
    if (!chapterMap[chapter]) chapterMap[chapter] = [];
    chapterMap[chapter].push(q);
  }

  const screenContent = (
    <SafeAreaView style={[styles.container, { backgroundColor: couleurs.fond }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: couleurs.texte }]}>Mon Parcours</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero niveau */}
        <View style={[styles.levelCard, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
          <View style={styles.levelRow}>
            <View style={[styles.levelIconWrap, { backgroundColor: couleurs.primaireLight }]}>
              <Ionicons name={state.levelIcon as any} size={28} color={couleurs.primaire} />
            </View>
            <View style={styles.levelInfo}>
              <Text style={[styles.levelName, { color: couleurs.texte }]}>{state.levelName}</Text>
              <Text style={[styles.levelLabel, { color: couleurs.texteSecondaire }]}>Niveau {state.level}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={14} color="#FFBD59" />
              <Text style={styles.xpBadgeText}>{state.xp} XP</Text>
            </View>
          </View>

          {/* Barre XP */}
          <View style={styles.xpBarSection}>
            <View style={[styles.xpBarBg, { backgroundColor: couleurs.fondCard }]}>
              <View style={[styles.xpBarFill, { width: `${progressPercent * 100}%`, backgroundColor: couleurs.primaire }]} />
            </View>
            {state.nextLevelName && (
              <Text style={[styles.xpBarLabel, { color: couleurs.texteSecondaire }]}>
                {xpInLevel}/{xpForNext} XP → {state.nextLevelName}
              </Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame-outline" size={16} color="#EF4444" />
              <Text style={[styles.statValue, { color: couleurs.texte }]}>{state.streakDays || 0}</Text>
              <Text style={[styles.statLabel, { color: couleurs.texteSecondaire }]}>jours</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
              <Text style={[styles.statValue, { color: couleurs.texte }]}>
                {(state.quickQuests?.filter(q => q.isCompleted).length || 0) + (state.quests?.filter(q => q.isCompleted).length || 0)}
              </Text>
              <Text style={[styles.statLabel, { color: couleurs.texteSecondaire }]}>quetes</Text>
            </View>
          </View>
        </View>

        {/* Quetes rapides */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: couleurs.texte }]}>Quetes rapides</Text>
          <QuickQuests />
        </View>

        {/* Quetes de chapitre */}
        {Object.entries(chapterMap).map(([chapter, quests]) => (
          <View key={chapter} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: couleurs.texte }]}>{chapter}</Text>
            {quests.map(quest => {
              const isDone = quest.isCompleted;
              const progress = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : 0;
              return (
                <View key={quest.questId} style={[styles.chapterQuest, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
                  <View style={[styles.chapterIcon, { backgroundColor: quest.color + '15' }]}>
                    {isDone ? (
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    ) : (
                      <Ionicons name={quest.icon as any} size={16} color={quest.color} />
                    )}
                  </View>
                  <View style={styles.chapterInfo}>
                    <Text style={[styles.chapterTitle, { color: isDone ? couleurs.texteSecondaire : couleurs.texte }, isDone && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
                      {quest.title}
                    </Text>
                    <View style={styles.chapterProgressRow}>
                      <View style={[styles.chapterProgressBg, { backgroundColor: couleurs.fond }]}>
                        <View style={[styles.chapterProgressFill, { width: `${progress * 100}%`, backgroundColor: isDone ? '#10B981' : quest.color }]} />
                      </View>
                      <Text style={[styles.chapterProgressText, { color: isDone ? '#10B981' : quest.color }]}>
                        {quest.progress}/{quest.target}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.chapterXp, isDone && { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                    {isDone ? (
                      <Ionicons name="checkmark" size={12} color="#10B981" />
                    ) : (
                      <Text style={[styles.chapterXpText, { color: couleurs.primaire }]}>+{quest.xpReward}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  return Platform.OS === 'android' ? (
    <SwipeableScreen>{screenContent}</SwipeableScreen>
  ) : screenContent;
}

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.md,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: espacements.md, paddingBottom: 40 },
  levelCard: {
    borderRadius: rayons.xl,
    padding: 18,
    borderWidth: 1,
    marginBottom: espacements.lg,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  levelIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelInfo: { flex: 1, marginLeft: 12 },
  levelName: { fontSize: 20, fontWeight: '800' },
  levelLabel: { fontSize: 12, fontWeight: '500' },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,189,89,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  xpBadgeText: { fontSize: 14, fontWeight: '800', color: '#FFBD59' },
  xpBarSection: { marginBottom: 14 },
  xpBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 4 },
  xpBarLabel: { fontSize: 11, fontWeight: '500', marginTop: 4, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500' },
  section: { marginBottom: espacements.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  chapterQuest: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: rayons.md,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  chapterIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterInfo: { flex: 1 },
  chapterTitle: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  chapterProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chapterProgressBg: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  chapterProgressFill: { height: '100%', borderRadius: 2 },
  chapterProgressText: { fontSize: 10, fontWeight: '700', minWidth: 24, textAlign: 'right' },
  chapterXp: {
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  chapterXpText: { fontSize: 11, fontWeight: '700' },
});
