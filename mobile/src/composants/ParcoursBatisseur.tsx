/**
 * ParcoursBatisseur - "Parcours du Batisseur"
 * Card hero gamifiee sur l'accueil : progression XP + defi de la semaine + prochaine quete.
 * Premier element visible par tous les utilisateurs (visiteurs + entrepreneurs).
 */

import React, { useEffect, useRef, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements, rayons } from '../constantes/theme';
import type { ParcoursData, DefiActif, Quete } from '../services/parcours';

// === TYPES ===

interface ParcoursBatisseurProps {
  parcours: ParcoursData | null;
  defiActif: DefiActif | null;
  prochaineQuete: Quete | null;
  statutUtilisateur: 'visiteur' | 'entrepreneur';
  chargement: boolean;
  onQuetePress?: (quete: Quete) => void;
}

// === HELPERS ===

function formatCountdown(dateFin: string): string {
  const fin = new Date(dateFin).getTime();
  const now = Date.now();
  const diff = fin - now;

  if (diff <= 0) return 'Termine';

  const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
  const heures = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (jours > 0) return `${jours}j ${heures}h`;
  if (heures > 0) return `${heures}h ${minutes}m`;
  return `${minutes}m`;
}

// === SKELETON (chargement) ===

function ParcoursSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={s.wrapper}>
      <View style={s.card}>
        <View style={s.cardInner}>
          <Animated.View style={[s.skeletonLine, { opacity, width: '60%', height: 16 }]} />
          <Animated.View style={[s.skeletonLine, { opacity, width: '100%', height: 8, marginTop: 12 }]} />
          <Animated.View style={[s.skeletonLine, { opacity, width: '40%', height: 12, marginTop: 12 }]} />
        </View>
      </View>
    </View>
  );
}

// === COMPOSANT PRINCIPAL ===

function ParcoursBatisseurComponent({
  parcours,
  defiActif,
  prochaineQuete,
  statutUtilisateur,
  chargement,
  onQuetePress,
}: ParcoursBatisseurProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const defiProgressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [countdown, setCountdown] = useState('');

  // Animation d'entree
  useEffect(() => {
    if (!chargement && parcours) {
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleIn, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [chargement, parcours]);

  // Animation barre de progression XP
  useEffect(() => {
    if (parcours && parcours.xpTotalNiveau > 0) {
      const progress = parcours.xpDansNiveau / parcours.xpTotalNiveau;
      Animated.spring(progressAnim, {
        toValue: Math.min(progress, 1),
        friction: 8,
        tension: 50,
        useNativeDriver: false,
      }).start();
    } else if (parcours && parcours.xpTotalNiveau === 0) {
      // Niveau max
      Animated.spring(progressAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: false,
      }).start();
    }
  }, [parcours?.xp]);

  // Animation barre defi
  useEffect(() => {
    if (defiActif && defiActif.objectif > 0) {
      const progress = defiActif.progression / defiActif.objectif;
      Animated.spring(defiProgressAnim, {
        toValue: Math.min(progress, 1),
        friction: 8,
        tension: 50,
        useNativeDriver: false,
      }).start();
    }
  }, [defiActif?.progression]);

  // Shimmer bordure
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  // Countdown defi
  useEffect(() => {
    if (!defiActif) return;
    setCountdown(formatCountdown(defiActif.dateFin));
    const interval = setInterval(() => {
      setCountdown(formatCountdown(defiActif.dateFin));
    }, 60000);
    return () => clearInterval(interval);
  }, [defiActif?.dateFin]);

  if (chargement) return <ParcoursSkeleton />;
  if (!parcours) return null;

  const borderColor = shimmerAnim.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [couleurs.primaire, '#2DE2E6', '#FFBD59', couleurs.primaire],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const defiProgressWidth = defiProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isEntrepreneur = statutUtilisateur === 'entrepreneur';

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeIn, transform: [{ scale: scaleIn }] }]}>
      {/* Label */}
      <View style={s.labelRow}>
        <View style={s.labelBadge}>
          <Ionicons name="trophy" size={14} color={couleurs.accent} />
          <Text style={s.labelText}>Parcours du Batisseur</Text>
        </View>
        {parcours.streak > 0 && (
          <View style={s.streakBadge}>
            <Ionicons name="flame" size={12} color="#FF6B35" />
            <Text style={s.streakText}>{parcours.streak}j</Text>
          </View>
        )}
      </View>

      {/* Card principale */}
      <Animated.View style={[s.card, { borderColor }]}>
        <LinearGradient
          colors={[
            isEntrepreneur ? 'rgba(255, 189, 89, 0.08)' : 'rgba(124, 92, 255, 0.08)',
            'rgba(45, 226, 230, 0.04)',
            'transparent',
          ]}
          style={s.cardGradient}
        />
        <View style={s.cardInner}>
          {/* === SECTION 1 : Progression === */}
          <View style={s.progressSection}>
            {/* Niveau actuel */}
            <View style={s.niveauRow}>
              <View style={[s.niveauBadge, { backgroundColor: isEntrepreneur ? 'rgba(255, 189, 89, 0.15)' : couleurs.primaireLight }]}>
                <Ionicons
                  name={(parcours.niveauIcone || 'eye-outline') as any}
                  size={16}
                  color={isEntrepreneur ? couleurs.accent : couleurs.primaire}
                />
              </View>
              <View style={s.niveauInfo}>
                <Text style={s.niveauNom}>{parcours.niveauNom}</Text>
                <Text style={s.niveauLabel}>Niveau {parcours.niveau}</Text>
              </View>
              <View style={s.xpDisplay}>
                <Text style={s.xpCount}>{parcours.xp}</Text>
                <Text style={s.xpLabel}>XP</Text>
              </View>
            </View>

            {/* Barre de progression */}
            <View style={s.progressBarContainer}>
              <View style={s.progressBarBg}>
                <Animated.View
                  style={[
                    s.progressBarFill,
                    {
                      width: progressWidth,
                      backgroundColor: isEntrepreneur ? couleurs.accent : couleurs.primaire,
                    },
                  ]}
                />
              </View>
              <View style={s.progressLabels}>
                <Text style={s.progressText}>
                  {parcours.xpDansNiveau}/{parcours.xpTotalNiveau || '~'} XP
                </Text>
                <Text style={s.progressNext}>
                  {parcours.niveauSuivant !== 'Max' ? `→ ${parcours.niveauSuivant}` : 'Niveau Max !'}
                </Text>
              </View>
            </View>
          </View>

          {/* === SECTION 2 : Defi de la Semaine === */}
          {defiActif && (
            <View style={s.defiSection}>
              <View style={s.defiSeparator} />
              <View style={s.defiHeader}>
                <View style={s.defiTitleRow}>
                  <View style={[s.defiIconBadge, { backgroundColor: defiActif.couleur + '20' }]}>
                    <Ionicons name={(defiActif.icone || 'trophy-outline') as any} size={14} color={defiActif.couleur} />
                  </View>
                  <View style={s.defiTitleInfo}>
                    <Text style={s.defiLabel}>Defi de la semaine</Text>
                    <Text style={s.defiTitre} numberOfLines={1}>{defiActif.titre}</Text>
                  </View>
                </View>
                <View style={s.countdownBadge}>
                  <Ionicons name="time-outline" size={10} color={couleurs.texteSecondaire} />
                  <Text style={s.countdownText}>{countdown}</Text>
                </View>
              </View>

              {/* Barre progression defi */}
              <View style={s.defiProgressRow}>
                <View style={s.defiProgressBarBg}>
                  <Animated.View
                    style={[
                      s.defiProgressBarFill,
                      { width: defiProgressWidth, backgroundColor: defiActif.couleur },
                    ]}
                  />
                </View>
                <Text style={s.defiProgressText}>
                  {defiActif.complete ? '✓' : `${defiActif.progression}/${defiActif.objectif}`}
                </Text>
              </View>

              {/* Stats defi */}
              <View style={s.defiStatsRow}>
                <View style={s.defiStat}>
                  <Ionicons name="people-outline" size={11} color={couleurs.texteSecondaire} />
                  <Text style={s.defiStatText}>{defiActif.participants} participants</Text>
                </View>
                <View style={s.defiStat}>
                  <Ionicons name="star-outline" size={11} color={couleurs.accent} />
                  <Text style={[s.defiStatText, { color: couleurs.accent }]}>+{defiActif.xpRecompense} XP</Text>
                </View>
              </View>
            </View>
          )}

          {/* === SECTION 3 : Prochaine quete === */}
          {prochaineQuete && (
            <Pressable
              style={s.queteSection}
              onPress={() => onQuetePress?.(prochaineQuete)}
            >
              <View style={s.defiSeparator} />
              <View style={s.queteRow}>
                <View style={s.queteIconBadge}>
                  <Ionicons name={(prochaineQuete.icone || 'flag-outline') as any} size={13} color={couleurs.secondaire} />
                </View>
                <View style={s.queteInfo}>
                  <Text style={s.queteTitre} numberOfLines={1}>{prochaineQuete.titre}</Text>
                  <Text style={s.queteDescription} numberOfLines={1}>{prochaineQuete.description}</Text>
                </View>
                <View style={s.queteXpBadge}>
                  <Text style={s.queteXpText}>+{prochaineQuete.xp}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={couleurs.texteSecondaire} />
              </View>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// === STYLES ===

const s = StyleSheet.create({
  wrapper: {
    paddingHorizontal: espacements.md,
    marginBottom: espacements.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.sm,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.texte,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  card: {
    borderRadius: rayons.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: couleurs.fondElevated,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardInner: {
    padding: espacements.md,
  },

  // Skeleton
  skeletonLine: {
    backgroundColor: couleurs.fondCard,
    borderRadius: 4,
  },

  // Section 1: Progression
  progressSection: {},
  niveauRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  niveauBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  niveauInfo: {
    flex: 1,
  },
  niveauNom: {
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.texte,
  },
  niveauLabel: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
    marginTop: 1,
  },
  xpDisplay: {
    alignItems: 'flex-end',
  },
  xpCount: {
    fontSize: 18,
    fontWeight: '800',
    color: couleurs.texte,
  },
  xpLabel: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: couleurs.fondCard,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
  },
  progressNext: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    fontWeight: '600',
  },

  // Section 2: Defi
  defiSection: {},
  defiSeparator: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginVertical: 10,
  },
  defiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  defiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  defiIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defiTitleInfo: {
    flex: 1,
  },
  defiLabel: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  defiTitre: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
    marginTop: 1,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: couleurs.fondCard,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    fontWeight: '600',
  },
  defiProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  defiProgressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: couleurs.fondCard,
    borderRadius: 3,
    overflow: 'hidden',
  },
  defiProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  defiProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: couleurs.texte,
    minWidth: 30,
    textAlign: 'right',
  },
  defiStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  defiStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  defiStatText: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
  },

  // Section 3: Quete
  queteSection: {},
  queteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  queteIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: couleurs.secondaireLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queteInfo: {
    flex: 1,
  },
  queteTitre: {
    fontSize: 12,
    fontWeight: '600',
    color: couleurs.texte,
  },
  queteDescription: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    marginTop: 1,
  },
  queteXpBadge: {
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  queteXpText: {
    fontSize: 10,
    fontWeight: '700',
    color: couleurs.primaire,
  },
});

const ParcoursBatisseur = memo(ParcoursBatisseurComponent);
export default ParcoursBatisseur;
