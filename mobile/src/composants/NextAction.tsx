/**
 * Module "Prochaine Action" pour la Home
 * Affiche une seule carte hero avec la prochaine quete a realiser.
 * Couleurs 100% theme LPP (primaire, accent, succes).
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
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import { useGamification } from '../contexts/GamificationContext';

interface NextActionProps {
  /** Callback pour changer d'onglet dans accueil (discover, messages, etc.) */
  onNavigateTab?: (tab: string) => void;
  /** Callback pour ouvrir le modal de creation de post */
  onCreatePost?: () => void;
}

function NextAction({ onNavigateTab, onCreatePost }: NextActionProps) {
  const { couleurs } = useTheme();
  const { state } = useGamification();
  const router = useRouter();
  const styles = createStyles(couleurs);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Trouver la prochaine quete non completee
  const nextQuest = state?.quickQuests?.find(q => !q.isCompleted) || null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Animer la barre de progression
  useEffect(() => {
    if (!nextQuest) return;
    const target = nextQuest.target > 0 ? nextQuest.progress / nextQuest.target : 0;
    Animated.spring(progressAnim, {
      toValue: Math.min(target, 1),
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [nextQuest?.progress, nextQuest?.target]);

  const handlePress = useCallback(() => {
    if (!nextQuest) return;
    switch (nextQuest.mobileAction) {
      case 'discover':
        onNavigateTab?.('decouvrir');
        break;
      case 'feed':
        onNavigateTab?.('feed');
        break;
      case 'entrepreneur':
        router.push('/(app)/mes-startups');
        break;
      case 'create_post':
        onCreatePost?.();
        break;
      case 'profile':
        router.push('/(app)/profil');
        break;
      case 'messages':
        onNavigateTab?.('messages');
        break;
    }
  }, [nextQuest?.mobileAction, router, onNavigateTab, onCreatePost]);

  if (!state || !nextQuest) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
        onPress={handlePress}
      >
        <LinearGradient
          colors={[couleurs.primaire + '12', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        {/* Header : icone + badges */}
        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: couleurs.primaire + '20' }]}>
            <Ionicons name={nextQuest.icon as any} size={22} color={couleurs.primaire} />
          </View>
          <View style={styles.badges}>
            <View style={[styles.xpBadge, { backgroundColor: couleurs.accent + '20' }]}>
              <Ionicons name="star" size={11} color={couleurs.accent} />
              <Text style={[styles.xpBadgeText, { color: couleurs.accent }]}>+{nextQuest.xpReward} XP</Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: couleurs.primaire + '15', borderColor: couleurs.primaire + '30' }]}>
              <Text style={[styles.levelText, { color: couleurs.primaire }]}>
                Niv.{state.level}
              </Text>
            </View>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={[styles.label, { color: couleurs.texteMuted }]}>PROCHAINE ACTION</Text>
          <Text style={[styles.title, { color: couleurs.texte }]}>{nextQuest.title}</Text>
          <Text style={[styles.desc, { color: couleurs.texteSecondaire }]}>{nextQuest.description}</Text>
        </View>

        {/* Barre de progression */}
        {nextQuest.target > 1 && (
          <View style={styles.progressSection}>
            <View style={[styles.progressBg, { backgroundColor: couleurs.bordure }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: couleurs.primaire,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: couleurs.primaire }]}>
              {nextQuest.progress}/{nextQuest.target}
            </Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={handlePress}
        >
          <LinearGradient
            colors={[couleurs.primaire, couleurs.primaireDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaBtnText}>C'est parti !</Text>
            <Ionicons name="arrow-forward" size={16} color={couleurs.blanc} />
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default memo(NextAction);

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    marginHorizontal: espacements.md,
    marginBottom: espacements.lg,
  },
  card: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: rayons.xl,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  body: {
    marginBottom: 16,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  progressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
  },
  ctaBtn: {
    borderRadius: rayons.md,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
