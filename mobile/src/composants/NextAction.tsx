/**
 * Module "Prochaine Action" pour la Home
 * Affiche une seule carte hero avec la prochaine quete a realiser.
 * Meme style visuel que l'ancien bloc "Votre Prochaine Action".
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
import { useTheme, ThemeCouleurs, espacements, rayons } from '../constantes/theme';
import { useGamification } from '../contexts/GamificationContext';

function NextAction() {
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
        // Onglet decouvrir
        break;
      case 'feed':
        // Deja sur le feed
        break;
      case 'entrepreneur':
        router.push('/(app)/mes-startups');
        break;
      case 'create_post':
        // Gere par accueil.tsx via le context
        break;
      case 'profile':
        router.push('/(app)/profil');
        break;
      case 'messages':
        // Onglet messages
        break;
    }
  }, [nextQuest?.mobileAction, router]);

  if (!state || !nextQuest) return null;

  const progressPercent = nextQuest.target > 0 ? Math.min(nextQuest.progress / nextQuest.target, 1) : 0;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
        onPress={handlePress}
      >
        <LinearGradient
          colors={[nextQuest.color + '12', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        {/* Header : icone + badges */}
        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: nextQuest.color + '20' }]}>
            <Ionicons name={nextQuest.icon as any} size={22} color={nextQuest.color} />
          </View>
          <View style={styles.badges}>
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={11} color="#00D68F" />
              <Text style={styles.xpBadgeText}>+{nextQuest.xpReward} XP</Text>
            </View>
            <View style={[styles.levelBadge, { borderColor: couleurs.bordure }]}>
              <Text style={[styles.levelText, { color: couleurs.texteSecondaire }]}>
                Niv.{state.level}
              </Text>
            </View>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text style={[styles.label, { color: couleurs.texteSecondaire }]}>PROCHAINE ACTION</Text>
          <Text style={[styles.title, { color: couleurs.texte }]}>{nextQuest.title}</Text>
          <Text style={[styles.desc, { color: couleurs.texteSecondaire }]}>{nextQuest.description}</Text>
        </View>

        {/* Barre de progression */}
        {nextQuest.target > 1 && (
          <View style={styles.progressSection}>
            <View style={[styles.progressBg, { backgroundColor: couleurs.fondCard }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: nextQuest.color,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: nextQuest.color }]}>
              {nextQuest.progress}/{nextQuest.target}
            </Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: nextQuest.color }]}
          onPress={handlePress}
        >
          <Text style={styles.ctaBtnText}>C'est parti !</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
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
    backgroundColor: 'rgba(0, 214, 143, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00D68F',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: rayons.md,
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
