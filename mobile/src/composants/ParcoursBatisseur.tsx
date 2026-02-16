/**
 * ParcoursBatisseur - "Parcours du Batisseur"
 * Card hero gamifiee sur l'accueil : progression XP, streak, defi de la semaine, prochaine quete.
 * Design interactif avec animations, niveaux visuels, multiplicateur streak.
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

// === NIVEAUX CONFIG ===

const NIVEAUX = [
  { niveau: 1, nom: 'Curieux', icone: 'eye-outline' },
  { niveau: 2, nom: 'Explorateur', icone: 'compass-outline' },
  { niveau: 3, nom: 'Batisseur', icone: 'hammer-outline' },
  { niveau: 4, nom: 'Leader', icone: 'flag-outline' },
  { niveau: 5, nom: 'Legende', icone: 'diamond-outline' },
];

// === TYPES ===

interface ParcoursBatisseurProps {
  parcours: ParcoursData | null;
  defiActif: DefiActif | null;
  prochaineQuete: Quete | null;
  statutUtilisateur: 'visiteur' | 'entrepreneur';
  chargement: boolean;
  nbQuetesCompletees?: number;
  nbQuetesTotalesChapitre?: number;
  onQuetePress?: (quete: Quete) => void;
  onVoirToutesQuetes?: () => void;
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

// === SKELETON ===

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

// === MINI NIVEAUX TIMELINE ===

function NiveauxDots({ niveauActuel }: { niveauActuel: number }) {
  return (
    <View style={s.dotsRow}>
      {NIVEAUX.map((niv, i) => {
        const done = niv.niveau < niveauActuel;
        const active = niv.niveau === niveauActuel;
        return (
          <View key={niv.niveau} style={s.dotItem}>
            {i > 0 && (
              <View style={[s.dotConnector, done && s.dotConnectorDone]} />
            )}
            <View
              style={[
                s.dotCircle,
                done && s.dotCircleDone,
                active && s.dotCircleActive,
              ]}
            >
              <Ionicons
                name={niv.icone as any}
                size={10}
                color={done ? '#fff' : active ? couleurs.primaire : couleurs.texteMuted}
              />
            </View>
          </View>
        );
      })}
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
  onVoirToutesQuetes,
}: ParcoursBatisseurProps) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const defiProgressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const streakPulse = useRef(new Animated.Value(1)).current;
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

  // Streak pulse animation
  useEffect(() => {
    if (parcours && parcours.streak >= 3) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(streakPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(streakPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [parcours?.streak]);

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
  const progressPercent = parcours.xpTotalNiveau > 0
    ? Math.round((parcours.xpDansNiveau / parcours.xpTotalNiveau) * 100)
    : 100;

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeIn, transform: [{ scale: scaleIn }] }]}>
      {/* Header label */}
      <View style={s.labelRow}>
        <View style={s.labelBadge}>
          <Ionicons name="trophy" size={14} color={couleurs.accent} />
          <Text style={s.labelText}>Parcours du Batisseur</Text>
        </View>
        {onVoirToutesQuetes && (
          <Pressable onPress={onVoirToutesQuetes} style={s.voirToutBtn}>
            <Text style={s.voirToutText}>Voir tout</Text>
            <Ionicons name="chevron-forward" size={12} color={couleurs.primaire} />
          </Pressable>
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
          {/* === NIVEAUX DOTS === */}
          <NiveauxDots niveauActuel={parcours.niveau} />

          {/* === SECTION 1 : Progression === */}
          <View style={s.progressSection}>
            <View style={s.niveauRow}>
              <View style={[s.niveauBadge, { backgroundColor: isEntrepreneur ? 'rgba(255, 189, 89, 0.15)' : couleurs.primaireLight }]}>
                <Ionicons
                  name={(parcours.niveauIcone || 'eye-outline') as any}
                  size={18}
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
                <Text style={[s.progressPercent, { color: isEntrepreneur ? couleurs.accent : couleurs.primaire }]}>
                  {progressPercent}%
                </Text>
                <Text style={s.progressNext}>
                  {parcours.niveauSuivant !== 'Max' ? `→ ${parcours.niveauSuivant}` : 'Niveau Max !'}
                </Text>
              </View>
            </View>
          </View>

          {/* === SECTION STREAK === */}
          {parcours.streak > 0 && (
            <View style={s.streakSection}>
              <View style={s.defiSeparator} />
              <View style={s.streakRow}>
                <Animated.View style={[s.streakFireBadge, { transform: [{ scale: streakPulse }] }]}>
                  <Ionicons name="flame" size={16} color="#FF6B35" />
                </Animated.View>
                <View style={s.streakInfo}>
                  <Text style={s.streakDays}>
                    {parcours.streak} jour{parcours.streak > 1 ? 's' : ''} de suite
                  </Text>
                  <Text style={s.streakSubtext}>
                    {parcours.streak >= 30
                      ? 'Inarretable !'
                      : parcours.streak >= 7
                      ? 'Belle serie ! Continue !'
                      : 'Continue comme ca !'}
                  </Text>
                </View>
                {parcours.streakMultiplier && parcours.streakMultiplier > 1 && (
                  <View style={s.multiplierBadge}>
                    <Text style={s.multiplierText}>x{parcours.streakMultiplier}</Text>
                    <Text style={s.multiplierLabel}>XP</Text>
                  </View>
                )}
                {parcours.streakEnDanger && (
                  <View style={s.dangerBadge}>
                    <Ionicons name="warning" size={12} color={couleurs.danger} />
                    <Text style={s.dangerText}>Joue !</Text>
                  </View>
                )}
              </View>
            </View>
          )}

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
                    <Text style={s.defiLabel}>DEFI DE LA SEMAINE</Text>
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
                <Text style={[s.defiProgressText, defiActif.complete && { color: couleurs.succes }]}>
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
              style={({ pressed }) => [s.queteSection, pressed && s.queteSectionPressed]}
              onPress={() => onQuetePress?.(prochaineQuete)}
            >
              <View style={s.defiSeparator} />
              <View style={s.queteLabelRow}>
                <Text style={s.queteSectionLabel}>PROCHAINE MISSION</Text>
                {prochaineQuete.chapitre && (
                  <Text style={s.chapitreTag}>
                    Ch.{prochaineQuete.niveauRequis}
                  </Text>
                )}
              </View>
              <View style={s.queteRow}>
                <View style={[s.queteIconBadge, { backgroundColor: isEntrepreneur ? 'rgba(255, 189, 89, 0.15)' : couleurs.secondaireLight }]}>
                  <Ionicons name={(prochaineQuete.icone || 'flag-outline') as any} size={14} color={isEntrepreneur ? couleurs.accent : couleurs.secondaire} />
                </View>
                <View style={s.queteInfo}>
                  <Text style={s.queteTitre} numberOfLines={1}>{prochaineQuete.titre}</Text>
                  <Text style={s.queteDescription} numberOfLines={1}>{prochaineQuete.description}</Text>
                </View>
                <View style={s.queteRight}>
                  <View style={s.queteXpBadge}>
                    <Text style={s.queteXpText}>+{prochaineQuete.xp}</Text>
                  </View>
                  <View style={s.queteGoBtn}>
                    <Ionicons name="arrow-forward" size={12} color="#fff" />
                  </View>
                </View>
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
  voirToutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: couleurs.primaireLight,
    borderRadius: 12,
  },
  voirToutText: {
    fontSize: 11,
    fontWeight: '600',
    color: couleurs.primaire,
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

  // Niveaux dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 0,
  },
  dotItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotConnector: {
    width: 24,
    height: 2,
    backgroundColor: couleurs.fondCard,
    marginHorizontal: 2,
  },
  dotConnectorDone: {
    backgroundColor: couleurs.succes,
  },
  dotCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: couleurs.bordure,
  },
  dotCircleDone: {
    backgroundColor: couleurs.succes,
    borderColor: couleurs.succes,
  },
  dotCircleActive: {
    backgroundColor: couleurs.primaireLight,
    borderColor: couleurs.primaire,
    borderWidth: 2,
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
    width: 38,
    height: 38,
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
    fontSize: 20,
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
    height: 7,
    backgroundColor: couleurs.fondCard,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
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
  progressPercent: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressNext: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    fontWeight: '600',
  },

  // Streak section
  streakSection: {},
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  streakFireBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: {
    flex: 1,
  },
  streakDays: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  streakSubtext: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    marginTop: 1,
  },
  multiplierBadge: {
    backgroundColor: 'rgba(255, 189, 89, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 189, 89, 0.4)',
  },
  multiplierText: {
    fontSize: 14,
    fontWeight: '800',
    color: couleurs.accent,
  },
  multiplierLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: couleurs.accent,
    marginTop: -1,
  },
  dangerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: couleurs.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.3)',
  },
  dangerText: {
    fontSize: 10,
    fontWeight: '700',
    color: couleurs.danger,
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
    fontSize: 9,
    color: couleurs.texteSecondaire,
    fontWeight: '700',
    letterSpacing: 0.8,
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
  queteSection: {
    borderRadius: 8,
  },
  queteSectionPressed: {
    backgroundColor: 'rgba(124, 92, 255, 0.05)',
  },
  queteLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingTop: 2,
  },
  queteSectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: couleurs.texteSecondaire,
    letterSpacing: 0.8,
  },
  chapitreTag: {
    fontSize: 9,
    fontWeight: '700',
    color: couleurs.primaire,
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  queteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queteIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queteInfo: {
    flex: 1,
  },
  queteTitre: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
  },
  queteDescription: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
    marginTop: 1,
  },
  queteRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  queteGoBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const ParcoursBatisseur = memo(ParcoursBatisseurComponent);
export default ParcoursBatisseur;
