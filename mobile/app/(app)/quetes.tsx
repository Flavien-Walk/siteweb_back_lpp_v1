/**
 * Ecran Quetes - Parcours interactif par chapitre
 * Hero level display, chapitres expand/collapse animes, quetes avec XP.
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { couleurs, espacements, rayons } from '../../src/constantes/theme';
import { SwipeableScreen } from '../../src/composants';
import { useUser } from '../../src/contexts/UserContext';
import { getQuetes, getMonParcours } from '../../src/services/parcours';
import type { Quete, ParcoursData } from '../../src/services/parcours';

// === TYPES ===

interface QueteAvecStatut extends Quete {
  completee: boolean;
}

interface ChapitreData {
  nom: string;
  niveauRequis: number;
  quetes: QueteAvecStatut[];
  completees: number;
  total: number;
  debloque: boolean;
}

// Config chapitres
const CHAPITRES = [
  { nom: 'Decouverte', niveau: 1, icone: 'compass-outline', couleur: '#2DE2E6', emoji: '1', description: 'Apprendre les bases' },
  { nom: 'Engagement', niveau: 2, icone: 'flame-outline', couleur: '#FFBD59', emoji: '2', description: 'Participer activement' },
  { nom: 'Connexion', niveau: 3, icone: 'people-outline', couleur: '#7C5CFF', emoji: '3', description: 'Tisser des liens' },
  { nom: 'Contribution', niveau: 4, icone: 'trending-up-outline', couleur: '#00D68F', emoji: '4', description: 'Laisser sa marque' },
  { nom: 'Maitrise', niveau: 5, icone: 'diamond-outline', couleur: '#FF4D6D', emoji: '5', description: 'Inspirer les autres' },
];

// === NIVEAUX TIMELINE ===

const NiveauxTimeline = memo(({ niveauActuel, parcours }: { niveauActuel: number; parcours: ParcoursData | null }) => {
  const niveaux = [
    { n: 1, nom: 'Curieux', xp: 0, icone: 'eye-outline' },
    { n: 2, nom: 'Explorateur', xp: 100, icone: 'compass-outline' },
    { n: 3, nom: 'Batisseur', xp: 300, icone: 'hammer-outline' },
    { n: 4, nom: 'Architecte', xp: 700, icone: 'construct-outline' },
    { n: 5, nom: 'Legende', xp: 1500, icone: 'diamond-outline' },
  ];

  return (
    <View style={st.timelineContainer}>
      <View style={st.timelineLine} />
      {niveaux.map((niv, i) => {
        const isActive = niv.n === niveauActuel;
        const isDone = niv.n < niveauActuel;
        const isLocked = niv.n > niveauActuel;

        return (
          <View key={niv.n} style={st.timelineNode}>
            <View style={[
              st.timelineCircle,
              isActive && st.timelineCircleActive,
              isDone && st.timelineCircleDone,
              isLocked && st.timelineCircleLocked,
            ]}>
              {isDone ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Ionicons name={niv.icone as any} size={isActive ? 16 : 12} color={isActive ? '#fff' : couleurs.texteMuted} />
              )}
            </View>
            <Text style={[
              st.timelineLabel,
              isActive && st.timelineLabelActive,
              isDone && st.timelineLabelDone,
            ]} numberOfLines={1}>
              {niv.nom}
            </Text>
            <Text style={st.timelineXp}>{niv.xp} XP</Text>
          </View>
        );
      })}
    </View>
  );
});

// === QUETE CARD ===

const QueteCard = memo(({ quete, debloque, delay }: { quete: QueteAvecStatut; debloque: boolean; delay: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const isCompleted = quete.completee;
  const isLocked = !debloque;

  return (
    <Animated.View style={[
      st.queteCard,
      isLocked && st.queteCardLocked,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
    ]}>
      {/* Left: Status icon */}
      <View style={[
        st.queteIcon,
        isCompleted && { backgroundColor: couleurs.succes },
        isLocked && { backgroundColor: couleurs.fondCard },
      ]}>
        {isCompleted ? (
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
        ) : isLocked ? (
          <Ionicons name="lock-closed" size={14} color={couleurs.texteMuted} />
        ) : (
          <Ionicons name={(quete.icone || 'flag-outline') as any} size={16} color={couleurs.texte} />
        )}
      </View>

      {/* Center: Info */}
      <View style={st.queteInfo}>
        <View style={st.queteTitleRow}>
          <Text style={[st.queteTitre, isLocked && st.textMuted, isCompleted && st.textCompleted]} numberOfLines={1}>
            {quete.titre}
          </Text>
          {quete.type === 'entrepreneur' && (
            <View style={st.entrepreneurTag}>
              <Ionicons name="briefcase" size={8} color={couleurs.accent} />
            </View>
          )}
        </View>
        <Text style={[st.queteDesc, isLocked && st.textMuted]} numberOfLines={1}>
          {quete.description}
        </Text>
      </View>

      {/* Right: XP badge */}
      <View style={[st.xpBadge, isCompleted && st.xpBadgeDone]}>
        {isCompleted ? (
          <Ionicons name="checkmark" size={12} color={couleurs.succes} />
        ) : (
          <Text style={st.xpText}>+{quete.xp}</Text>
        )}
      </View>
    </Animated.View>
  );
});

// === CHAPITRE SECTION ===

const ChapitreSection = memo(({
  chapitre,
  config,
  niveauActuel,
}: {
  chapitre: ChapitreData;
  config: typeof CHAPITRES[0];
  niveauActuel: number;
}) => {
  const [expanded, setExpanded] = useState(chapitre.debloque && chapitre.completees < chapitre.total);
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const contentHeight = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  const toggleExpand = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    Animated.parallel([
      Animated.spring(rotateAnim, { toValue: next ? 1 : 0, friction: 10, useNativeDriver: true }),
      Animated.spring(contentHeight, { toValue: next ? 1 : 0, friction: 10, useNativeDriver: false }),
    ]).start();
  }, [expanded]);

  const progress = chapitre.total > 0 ? chapitre.completees / chapitre.total : 0;
  const isFullyDone = chapitre.completees === chapitre.total && chapitre.total > 0;
  const isNextToUnlock = !chapitre.debloque && config.niveau === niveauActuel + 1;

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[
      st.chapSection,
      isNextToUnlock && st.chapSectionNext,
      isFullyDone && { borderColor: config.couleur + '40' },
    ]}>
      {/* Header */}
      <Pressable style={st.chapHeader} onPress={chapitre.debloque ? toggleExpand : undefined}>
        {/* Numero cercle */}
        <View style={[
          st.chapCircle,
          chapitre.debloque
            ? { backgroundColor: config.couleur + '20', borderColor: config.couleur + '40' }
            : { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure },
        ]}>
          {isFullyDone ? (
            <Ionicons name="checkmark-circle" size={22} color={config.couleur} />
          ) : chapitre.debloque ? (
            <Text style={[st.chapCircleNum, { color: config.couleur }]}>{config.niveau}</Text>
          ) : (
            <Ionicons name="lock-closed" size={16} color={couleurs.texteMuted} />
          )}
        </View>

        {/* Infos */}
        <View style={st.chapInfo}>
          <View style={st.chapTitleRow}>
            <Text style={[st.chapNom, !chapitre.debloque && st.textMuted]}>
              {config.nom}
            </Text>
            {isFullyDone && (
              <View style={[st.doneTag, { backgroundColor: config.couleur + '20' }]}>
                <Ionicons name="checkmark" size={10} color={config.couleur} />
                <Text style={[st.doneTagText, { color: config.couleur }]}>Termine</Text>
              </View>
            )}
            {isNextToUnlock && (
              <View style={[st.doneTag, { backgroundColor: couleurs.accentLight }]}>
                <Ionicons name="lock-open-outline" size={10} color={couleurs.accent} />
                <Text style={[st.doneTagText, { color: couleurs.accent }]}>Bientot</Text>
              </View>
            )}
          </View>
          <Text style={st.chapDesc}>{config.description}</Text>

          {/* Progress bar */}
          {chapitre.debloque && (
            <View style={st.chapProgressRow}>
              <View style={st.chapProgressBg}>
                <Animated.View style={[st.chapProgressFill, {
                  width: `${Math.min(progress * 100, 100)}%`,
                  backgroundColor: config.couleur,
                }]} />
              </View>
              <Text style={[st.chapProgressText, { color: config.couleur }]}>
                {chapitre.completees}/{chapitre.total}
              </Text>
            </View>
          )}
        </View>

        {/* Chevron */}
        {chapitre.debloque && (
          <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
            <Ionicons name="chevron-down" size={18} color={couleurs.texteSecondaire} />
          </Animated.View>
        )}
      </Pressable>

      {/* Quetes list */}
      {expanded && (
        <View style={st.quetesList}>
          {chapitre.quetes.map((quete, idx) => (
            <QueteCard key={quete.id} quete={quete} debloque={chapitre.debloque} delay={idx * 50} />
          ))}
          {/* XP total du chapitre */}
          <View style={st.chapXpTotal}>
            <Ionicons name="star" size={12} color={config.couleur} />
            <Text style={[st.chapXpTotalText, { color: config.couleur }]}>
              {chapitre.quetes.reduce((acc, q) => acc + q.xp, 0)} XP disponibles dans ce chapitre
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});

// === ECRAN PRINCIPAL ===

export default function QuetesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [chapitres, setChapitres] = useState<ChapitreData[]>([]);
  const [parcours, setParcours] = useState<ParcoursData | null>(null);
  const [chargement, setChargement] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const chargerDonnees = useCallback(async () => {
    try {
      const [quetesRes, parcoursRes] = await Promise.all([
        getQuetes(),
        getMonParcours(),
      ]);

      if (parcoursRes.succes && parcoursRes.data) {
        setParcours(parcoursRes.data.parcours);
      }

      const niveauActuel = parcoursRes.data?.parcours?.niveau ?? 1;

      if (quetesRes.succes && quetesRes.data) {
        const toutesQuetes = quetesRes.data.quetes;

        const chapitresMap: ChapitreData[] = CHAPITRES.map((config) => {
          const quetesChapitre = toutesQuetes
            .filter((q: QueteAvecStatut) => q.chapitre === config.nom)
            .filter((q: QueteAvecStatut) => q.type === 'tous' || q.type === (user?.statut || 'visiteur'));

          const completees = quetesChapitre.filter((q: QueteAvecStatut) => q.completee).length;

          return {
            nom: config.nom,
            niveauRequis: config.niveau,
            quetes: quetesChapitre,
            completees,
            total: quetesChapitre.length,
            debloque: niveauActuel >= config.niveau,
          };
        });

        setChapitres(chapitresMap);
      }
    } catch (err) {
      console.warn('[Quetes] Erreur chargement:', err);
    } finally {
      setChargement(false);
      setRefreshing(false);
    }
  }, [user?.statut]);

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    if (!chargement) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [chargement]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    chargerDonnees();
  }, [chargerDonnees]);

  const totalQuetes = chapitres.reduce((acc, c) => acc + c.total, 0);
  const totalCompletees = chapitres.reduce((acc, c) => acc + c.completees, 0);
  const niveauActuel = parcours?.niveau ?? 1;

  const content = (
    <View style={[st.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={st.header}>
        <Pressable onPress={() => router.back()} style={st.backBtn}>
          <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
        </Pressable>
        <Text style={st.headerTitle}>Quetes</Text>
        <View style={st.headerRight}>
          {parcours && (
            <View style={st.headerXp}>
              <Ionicons name="star" size={14} color={couleurs.primaire} />
              <Text style={st.headerXpText}>{parcours.xp}</Text>
            </View>
          )}
        </View>
      </View>

      {chargement ? (
        <View style={st.loading}>
          <ActivityIndicator size="large" color={couleurs.primaire} />
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={st.scroll}
            contentContainerStyle={st.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={couleurs.primaire}
                colors={[couleurs.primaire]}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Hero card */}
            <View style={st.heroCard}>
              <LinearGradient
                colors={['rgba(124, 92, 255, 0.15)', 'rgba(45, 226, 230, 0.05)', 'transparent']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {/* Niveau actuel */}
              <View style={st.heroRow}>
                <View style={st.heroIconBg}>
                  <Ionicons name={(parcours?.niveauIcone || 'eye-outline') as any} size={28} color={couleurs.primaire} />
                </View>
                <View style={st.heroInfo}>
                  <Text style={st.heroNom}>{parcours?.niveauNom || 'Curieux'}</Text>
                  <Text style={st.heroSub}>Niveau {niveauActuel} · {parcours?.xp ?? 0} XP</Text>
                </View>
                {parcours && parcours.streak > 0 && (
                  <View style={st.heroStreak}>
                    <Ionicons name="flame" size={16} color="#FF6B35" />
                    <Text style={st.heroStreakText}>{parcours.streak}j</Text>
                  </View>
                )}
              </View>

              {/* Progression vers prochain niveau */}
              {parcours && parcours.xpTotalNiveau > 0 && (
                <View style={st.heroProgress}>
                  <View style={st.heroProgressBg}>
                    <View style={[st.heroProgressFill, {
                      width: `${Math.min((parcours.xpDansNiveau / parcours.xpTotalNiveau) * 100, 100)}%`,
                    }]} />
                  </View>
                  <Text style={st.heroProgressText}>
                    {parcours.xpDansNiveau}/{parcours.xpTotalNiveau} XP vers {parcours.niveauSuivant}
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={st.heroStats}>
                <View style={st.heroStat}>
                  <Text style={st.heroStatNum}>{totalCompletees}</Text>
                  <Text style={st.heroStatLabel}>Terminees</Text>
                </View>
                <View style={st.heroStatDivider} />
                <View style={st.heroStat}>
                  <Text style={st.heroStatNum}>{totalQuetes - totalCompletees}</Text>
                  <Text style={st.heroStatLabel}>Restantes</Text>
                </View>
                <View style={st.heroStatDivider} />
                <View style={st.heroStat}>
                  <Text style={st.heroStatNum}>{Math.round((totalCompletees / Math.max(totalQuetes, 1)) * 100)}%</Text>
                  <Text style={st.heroStatLabel}>Progression</Text>
                </View>
              </View>
            </View>

            {/* Niveaux timeline */}
            <NiveauxTimeline niveauActuel={niveauActuel} parcours={parcours} />

            {/* Chapitres */}
            {chapitres.map((chapitre, index) => (
              <ChapitreSection
                key={chapitre.nom}
                chapitre={chapitre}
                config={CHAPITRES[index]}
                niveauActuel={niveauActuel}
              />
            ))}

            {/* Footer legende */}
            <View style={st.footer}>
              <View style={st.legendeRow}>
                <Ionicons name="briefcase" size={10} color={couleurs.accent} />
                <Text style={st.legendeText}>Entrepreneur uniquement</Text>
              </View>
              <View style={st.legendeRow}>
                <View style={[st.legendeDot, { backgroundColor: couleurs.succes }]} />
                <Text style={st.legendeText}>Quete terminee</Text>
              </View>
              <View style={st.legendeRow}>
                <Ionicons name="lock-closed" size={10} color={couleurs.texteMuted} />
                <Text style={st.legendeText}>Niveau requis non atteint</Text>
              </View>
            </View>

            <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );

  return Platform.OS === 'android' ? (
    <SwipeableScreen>{content}</SwipeableScreen>
  ) : content;
}

// === STYLES ===

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: couleurs.fond },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: espacements.lg, paddingVertical: espacements.md,
    borderBottomWidth: 1, borderBottomColor: couleurs.bordure,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: couleurs.texte },
  headerRight: { minWidth: 60, alignItems: 'flex-end' },
  headerXp: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: couleurs.primaireLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  headerXpText: { fontSize: 13, fontWeight: '700', color: couleurs.primaire },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: espacements.lg, gap: 14 },

  // Hero
  heroCard: {
    backgroundColor: couleurs.fondElevated, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: couleurs.bordure, overflow: 'hidden',
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  heroIconBg: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: couleurs.primaireLight, alignItems: 'center', justifyContent: 'center',
  },
  heroInfo: { flex: 1 },
  heroNom: { fontSize: 20, fontWeight: '800', color: couleurs.texte },
  heroSub: { fontSize: 12, color: couleurs.texteSecondaire, marginTop: 2 },
  heroStreak: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(255, 107, 53, 0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  heroStreakText: { fontSize: 13, fontWeight: '700', color: '#FF6B35' },
  heroProgress: { marginBottom: 14 },
  heroProgressBg: { height: 6, backgroundColor: couleurs.fondCard, borderRadius: 3, overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 3, backgroundColor: couleurs.primaire },
  heroProgressText: { fontSize: 10, color: couleurs.texteSecondaire, marginTop: 4 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  heroStat: { alignItems: 'center' },
  heroStatNum: { fontSize: 20, fontWeight: '800', color: couleurs.texte },
  heroStatLabel: { fontSize: 10, color: couleurs.texteSecondaire, marginTop: 2 },
  heroStatDivider: { width: 1, height: 24, backgroundColor: couleurs.bordure },

  // Timeline
  timelineContainer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 12, position: 'relative',
  },
  timelineLine: {
    position: 'absolute', top: 26, left: 30, right: 30, height: 2,
    backgroundColor: couleurs.bordure,
  },
  timelineNode: { alignItems: 'center', width: 56 },
  timelineCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', backgroundColor: couleurs.fondCard,
    borderWidth: 2, borderColor: couleurs.bordure, zIndex: 1,
  },
  timelineCircleActive: {
    backgroundColor: couleurs.primaire, borderColor: couleurs.primaire, width: 32, height: 32, borderRadius: 16,
  },
  timelineCircleDone: { backgroundColor: couleurs.succes, borderColor: couleurs.succes },
  timelineCircleLocked: { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure },
  timelineLabel: { fontSize: 9, color: couleurs.texteMuted, marginTop: 4, textAlign: 'center' },
  timelineLabelActive: { color: couleurs.primaire, fontWeight: '700', fontSize: 10 },
  timelineLabelDone: { color: couleurs.succes, fontWeight: '600' },
  timelineXp: { fontSize: 8, color: couleurs.texteMuted, marginTop: 1 },

  // Chapitre
  chapSection: {
    backgroundColor: couleurs.fondElevated, borderRadius: 16,
    borderWidth: 1, borderColor: couleurs.bordure, overflow: 'hidden',
  },
  chapSectionNext: { borderColor: 'rgba(255, 189, 89, 0.3)', borderStyle: 'dashed' },
  chapHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  chapCircle: {
    width: 42, height: 42, borderRadius: 12, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  chapCircleNum: { fontSize: 18, fontWeight: '800' },
  chapInfo: { flex: 1 },
  chapTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chapNom: { fontSize: 15, fontWeight: '700', color: couleurs.texte },
  chapDesc: { fontSize: 11, color: couleurs.texteSecondaire, marginTop: 2 },
  doneTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  doneTagText: { fontSize: 9, fontWeight: '700' },
  chapProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  chapProgressBg: { flex: 1, height: 4, backgroundColor: couleurs.fondCard, borderRadius: 2, overflow: 'hidden' },
  chapProgressFill: { height: '100%', borderRadius: 2 },
  chapProgressText: { fontSize: 10, fontWeight: '700', minWidth: 24 },

  // Quetes
  quetesList: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  queteCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: couleurs.fondCard, borderRadius: 12, padding: 10, gap: 10,
  },
  queteCardLocked: { opacity: 0.4 },
  queteIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: couleurs.fondElevated, alignItems: 'center', justifyContent: 'center',
  },
  queteInfo: { flex: 1 },
  queteTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  queteTitre: { fontSize: 13, fontWeight: '600', color: couleurs.texte, flex: 1 },
  queteDesc: { fontSize: 10, color: couleurs.texteSecondaire, marginTop: 1 },
  textMuted: { color: couleurs.texteMuted },
  textCompleted: { textDecorationLine: 'line-through', color: couleurs.texteSecondaire },
  entrepreneurTag: {
    backgroundColor: couleurs.accentLight, width: 16, height: 16, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  xpBadge: {
    backgroundColor: couleurs.primaireLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    minWidth: 36, alignItems: 'center',
  },
  xpBadgeDone: { backgroundColor: couleurs.succesLight },
  xpText: { fontSize: 11, fontWeight: '700', color: couleurs.primaire },
  chapXpTotal: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: couleurs.bordure, marginTop: 4,
  },
  chapXpTotalText: { fontSize: 10, fontWeight: '600' },

  // Footer
  footer: { gap: 6, paddingVertical: 8 },
  legendeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendeDot: { width: 8, height: 8, borderRadius: 4 },
  legendeText: { fontSize: 10, color: couleurs.texteMuted },
});
