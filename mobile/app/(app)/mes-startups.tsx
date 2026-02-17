/**
 * Ecran Mes Startups - Projets suivis par l'utilisateur
 * Cards compactes, filtres categories, tri, unfollow optimistic.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  RefreshControl,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { couleurs, espacements, rayons } from '../../src/constantes/theme';
import { useGamification } from '../../src/contexts/GamificationContext';
import { SwipeableScreen } from '../../src/composants';
import { SkeletonList } from '../../src/composants/SkeletonLoader';
import {
  Projet,
  CategorieProjet,
  getMesProjets,
  toggleSuivreProjet,
} from '../../src/services/projets';

// === CONSTANTES ===

const CATEGORIES: { value: CategorieProjet | 'all'; label: string; icon: string; color: string }[] = [
  { value: 'all', label: 'Tout', icon: 'apps', color: couleurs.primaire },
  { value: 'tech', label: 'Tech', icon: 'hardware-chip', color: '#3B82F6' },
  { value: 'food', label: 'Food', icon: 'restaurant', color: '#F97316' },
  { value: 'sante', label: 'Sante', icon: 'medkit', color: '#EF4444' },
  { value: 'education', label: 'Education', icon: 'school', color: '#8B5CF6' },
  { value: 'energie', label: 'Energie', icon: 'flash', color: '#F59E0B' },
  { value: 'culture', label: 'Culture', icon: 'color-palette', color: '#EC4899' },
  { value: 'environnement', label: 'Eco', icon: 'leaf', color: '#10B981' },
];

const MATURITE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  idee: { label: 'Idee', color: '#9CA3AF', icon: 'bulb-outline' },
  prototype: { label: 'Prototype', color: '#F59E0B', icon: 'construct-outline' },
  lancement: { label: 'Lancement', color: '#3B82F6', icon: 'rocket-outline' },
  croissance: { label: 'Croissance', color: '#10B981', icon: 'trending-up-outline' },
};

const SORT_OPTIONS = [
  { key: 'recent' as const, label: 'Recents', icon: 'time-outline' },
  { key: 'followers' as const, label: 'Populaires', icon: 'people-outline' },
  { key: 'alpha' as const, label: 'A-Z', icon: 'text-outline' },
];
type SortKey = typeof SORT_OPTIONS[number]['key'];

// === STATS HEADER ===

const StatsHeader = memo(({ projets }: { projets: Projet[] }) => {
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    projets.forEach(p => { counts[p.categorie] = (counts[p.categorie] || 0) + 1; });
    return CATEGORIES.filter(c => c.value !== 'all' && counts[c.value as string])
      .map(c => ({ ...c, count: counts[c.value as string] || 0 }));
  }, [projets]);

  return (
    <View style={s.statsCard}>
      <LinearGradient
        colors={['rgba(124, 92, 255, 0.12)', 'rgba(45, 226, 230, 0.06)', 'transparent']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.statsRow}>
        <View style={s.statsIconBg}>
          <Ionicons name="rocket" size={24} color={couleurs.primaire} />
        </View>
        <View style={s.statsInfo}>
          <Text style={s.statsCount}>
            {projets.length} startup{projets.length !== 1 ? 's' : ''} suivie{projets.length !== 1 ? 's' : ''}
          </Text>
          <Text style={s.statsSubtext}>Ton portefeuille de veille</Text>
        </View>
      </View>
      {categoryBreakdown.length > 0 && (
        <View style={s.statsDots}>
          {categoryBreakdown.map(cat => (
            <View key={cat.value} style={s.statsDotItem}>
              <View style={[s.statsDot, { backgroundColor: cat.color }]} />
              <Text style={s.statsDotText}>{cat.count} {cat.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// === EMPTY STATE ===

const EmptyState = memo(({ onDiscover }: { onDiscover: () => void }) => (
  <View style={s.emptyContainer}>
    <View style={s.emptyIconWrap}>
      <LinearGradient colors={[couleurs.primaire, couleurs.secondaire]} style={s.emptyIconGradient}>
        <Ionicons name="rocket-outline" size={48} color="#fff" />
      </LinearGradient>
    </View>
    <Text style={s.emptyTitle}>Tu ne suis aucune startup</Text>
    <Text style={s.emptySubtext}>
      Decouvre des projets innovants et suis ceux qui t'inspirent pour rester informe de leur evolution !
    </Text>
    <Pressable onPress={onDiscover} style={s.emptyCta}>
      <LinearGradient colors={[couleurs.primaire, couleurs.secondaire]} style={s.emptyCtaGradient}>
        <Ionicons name="compass-outline" size={18} color="#fff" />
        <Text style={s.emptyCtaText}>Decouvrir des startups</Text>
      </LinearGradient>
    </Pressable>
  </View>
));

// === PROJET CARD ===

const ProjetCardCompact = memo(({
  projet,
  index,
  onUnfollow,
  onNavigate,
}: {
  projet: Projet;
  index: number;
  onUnfollow: (id: string) => void;
  onNavigate: (id: string) => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, index * 60);
    return () => clearTimeout(timer);
  }, []);

  const mat = MATURITE_CONFIG[projet.maturite] || MATURITE_CONFIG.idee;
  const catConf = CATEGORIES.find(c => c.value === projet.categorie);
  const fundingPercent = projet.objectifFinancement && projet.objectifFinancement > 0
    ? Math.min(Math.round(((projet.montantLeve || 0) / projet.objectifFinancement) * 100), 100)
    : null;

  const handleUnfollow = () => {
    Alert.alert(
      'Ne plus suivre ?',
      `Tu ne suivras plus ${projet.nom}. Tu pourras toujours la retrouver dans Decouvrir.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ne plus suivre', style: 'destructive', onPress: () => onUnfollow(projet._id) },
      ]
    );
  };

  return (
    <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Pressable
        style={({ pressed }) => [s.cardPressable, pressed && { opacity: 0.85 }]}
        onPress={() => onNavigate(projet._id)}
      >
        {/* Image */}
        <View style={s.cardImageWrap}>
          {projet.image ? (
            <Image source={{ uri: projet.image }} style={s.cardImage} />
          ) : (
            <View style={[s.cardImage, s.cardImagePlaceholder]}>
              <Ionicons name="business-outline" size={28} color={couleurs.texteMuted} />
            </View>
          )}
          {projet.logo ? (
            <View style={s.cardLogoWrap}>
              <Image source={{ uri: projet.logo }} style={s.cardLogo} />
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <View style={s.cardNameRow}>
            <Text style={s.cardName} numberOfLines={1}>{projet.nom}</Text>
            {catConf && (
              <View style={[s.cardCatBadge, { backgroundColor: catConf.color + '20' }]}>
                <Ionicons name={catConf.icon as any} size={10} color={catConf.color} />
              </View>
            )}
          </View>

          {projet.localisation?.ville ? (
            <View style={s.cardLocationRow}>
              <Ionicons name="location-outline" size={10} color={couleurs.texteSecondaire} />
              <Text style={s.cardLocation}>{projet.localisation.ville}</Text>
            </View>
          ) : null}

          <Text style={s.cardPitch} numberOfLines={2}>
            {projet.pitch || projet.description}
          </Text>

          <View style={s.cardMetaRow}>
            <View style={[s.cardMatBadge, { backgroundColor: mat.color + '15' }]}>
              <Ionicons name={mat.icon as any} size={10} color={mat.color} />
              <Text style={[s.cardMatText, { color: mat.color }]}>{mat.label}</Text>
            </View>
            <View style={s.cardFollowers}>
              <Ionicons name="people" size={10} color={couleurs.texteSecondaire} />
              <Text style={s.cardFollowersText}>{projet.nbFollowers}</Text>
            </View>
            {fundingPercent !== null && (
              <View style={s.cardFunding}>
                <View style={s.cardFundingBarBg}>
                  <View style={[s.cardFundingBarFill, { width: `${fundingPercent}%` }]} />
                </View>
                <Text style={s.cardFundingText}>{fundingPercent}%</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {/* Actions bar */}
      <View style={s.cardActions}>
        <Pressable
          style={({ pressed }) => [s.cardActionBtn, pressed && { opacity: 0.6 }]}
          onPress={() => onNavigate(projet._id)}
        >
          <Ionicons name="eye-outline" size={15} color={couleurs.texteSecondaire} />
          <Text style={s.cardActionText}>Voir</Text>
        </Pressable>
        <View style={s.cardActionDivider} />
        <Pressable
          style={({ pressed }) => [s.cardActionBtn, pressed && { opacity: 0.6 }]}
          onPress={() => onNavigate(projet._id)}
        >
          <Ionicons name="chatbubble-outline" size={15} color={couleurs.texteSecondaire} />
          <Text style={s.cardActionText}>Contacter</Text>
        </Pressable>
        <View style={s.cardActionDivider} />
        <Pressable
          style={({ pressed }) => [s.cardActionBtn, pressed && { opacity: 0.6 }]}
          onPress={handleUnfollow}
        >
          <Ionicons name="heart-dislike-outline" size={15} color={couleurs.danger} />
          <Text style={[s.cardActionText, { color: couleurs.danger }]}>Retirer</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

// === ECRAN PRINCIPAL ===

export default function MesStartupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { applyDelta } = useGamification();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [projets, setProjets] = useState<Projet[]>([]);
  const [chargement, setChargement] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categorieFiltre, setCategorieFiltre] = useState<CategorieProjet | 'all'>('all');
  const [tri, setTri] = useState<SortKey>('recent');

  const chargerDonnees = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setChargement(true);
      const res = await getMesProjets();
      if (res.succes && res.data) {
        setProjets(res.data.projets);
      }
    } catch (err) {
      console.warn('[MesStartups] Erreur chargement:', err);
    } finally {
      setChargement(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { chargerDonnees(); }, []);

  // Re-fetch quand on revient sur l'ecran (sync apres unfollow depuis detail)
  useFocusEffect(
    useCallback(() => {
      if (!chargement) chargerDonnees(true);
    }, [chargement])
  );

  // Fade in apres chargement
  useEffect(() => {
    if (!chargement && projets.length > 0) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [chargement]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    chargerDonnees(true);
  }, [chargerDonnees]);

  // Filtrage + tri client-side
  const projetsFiltres = useMemo(() => {
    let result = [...projets];

    if (categorieFiltre !== 'all') {
      result = result.filter(p => p.categorie === categorieFiltre);
    }

    switch (tri) {
      case 'followers':
        result.sort((a, b) => (b.nbFollowers || 0) - (a.nbFollowers || 0));
        break;
      case 'alpha':
        result.sort((a, b) => a.nom.localeCompare(b.nom));
        break;
      case 'recent':
      default:
        result.sort((a, b) =>
          new Date(b.dateMiseAJour || b.dateCreation).getTime() -
          new Date(a.dateMiseAJour || a.dateCreation).getTime()
        );
        break;
    }

    return result;
  }, [projets, categorieFiltre, tri]);

  // Unfollow optimistic
  const handleUnfollow = useCallback(async (projetId: string) => {
    const prev = projets;
    setProjets(p => p.filter(pr => pr._id !== projetId));

    try {
      const res = await toggleSuivreProjet(projetId);
      if (!res.succes) {
        setProjets(prev);
      } else if (res.gamification) {
        applyDelta(res.gamification);
      }
    } catch {
      setProjets(prev);
    }
  }, [projets]);

  const handleNavigate = useCallback((projetId: string) => {
    router.push({ pathname: '/(app)/projet/[id]', params: { id: projetId } });
  }, [router]);

  const handleDecouvrir = useCallback(() => {
    router.back();
  }, [router]);

  const content = (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
        </Pressable>
        <Text style={s.headerTitle}>Mes Startups</Text>
        <View style={s.headerRight}>
          {projets.length > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{projets.length}</Text>
            </View>
          )}
        </View>
      </View>

      {chargement ? (
        <View style={s.loadingWrap}>
          <SkeletonList type="post" count={4} />
        </View>
      ) : projets.length === 0 ? (
        <EmptyState onDiscover={handleDecouvrir} />
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            style={s.scroll}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 20 }]}
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
            {/* Stats */}
            <StatsHeader projets={projets} />

            {/* Category filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.filtersRow}
            >
              {CATEGORIES.map(cat => {
                const isActive = categorieFiltre === cat.value;
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => setCategorieFiltre(cat.value)}
                    style={[
                      s.filterChip,
                      isActive
                        ? { backgroundColor: cat.color + '20', borderColor: cat.color }
                        : { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={12}
                      color={isActive ? cat.color : couleurs.texteMuted}
                    />
                    <Text style={[s.filterChipText, { color: isActive ? cat.color : couleurs.texteMuted }]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Sort bar */}
            <View style={s.sortBar}>
              <Text style={s.resultCount}>
                {projetsFiltres.length} resultat{projetsFiltres.length !== 1 ? 's' : ''}
              </Text>
              <View style={s.sortOptions}>
                {SORT_OPTIONS.map(opt => {
                  const isActive = tri === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setTri(opt.key)}
                      style={[s.sortChip, isActive && s.sortChipActive]}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={11}
                        color={isActive ? couleurs.primaire : couleurs.texteMuted}
                      />
                      <Text style={[s.sortChipText, isActive && s.sortChipTextActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Projet cards */}
            {projetsFiltres.length === 0 ? (
              <View style={s.noResults}>
                <Ionicons name="filter-outline" size={32} color={couleurs.texteMuted} />
                <Text style={s.noResultsText}>Aucun projet dans cette categorie</Text>
                <Pressable onPress={() => setCategorieFiltre('all')}>
                  <Text style={s.clearFilter}>Voir tout</Text>
                </Pressable>
              </View>
            ) : (
              projetsFiltres.map((projet, index) => (
                <ProjetCardCompact
                  key={projet._id}
                  projet={projet}
                  index={index}
                  onUnfollow={handleUnfollow}
                  onNavigate={handleNavigate}
                />
              ))
            )}
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

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  headerRight: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: couleurs.primaire,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    padding: espacements.lg,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: espacements.lg,
  },

  // Stats header
  statsCard: {
    borderRadius: rayons.lg,
    overflow: 'hidden',
    backgroundColor: couleurs.fondElevated,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    padding: espacements.lg,
    marginBottom: espacements.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: couleurs.primaireLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsInfo: {
    flex: 1,
  },
  statsCount: {
    fontSize: 18,
    fontWeight: '800',
    color: couleurs.texte,
  },
  statsSubtext: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  statsDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  statsDotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsDotText: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
    fontWeight: '500',
  },

  // Filter chips
  filtersRow: {
    gap: 8,
    paddingBottom: espacements.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Sort bar
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espacements.sm,
  },
  resultCount: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sortChipActive: {
    backgroundColor: couleurs.primaireLight,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: couleurs.texteMuted,
  },
  sortChipTextActive: {
    color: couleurs.primaire,
    fontWeight: '600',
  },

  // No results
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginTop: 8,
  },
  clearFilter: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.primaire,
    marginTop: 12,
  },

  // Card
  card: {
    backgroundColor: couleurs.fondElevated,
    borderRadius: rayons.lg,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
    marginBottom: espacements.md,
  },
  cardPressable: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  cardImageWrap: {
    position: 'relative',
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: rayons.md,
  },
  cardImagePlaceholder: {
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLogoWrap: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: couleurs.fond,
    padding: 2,
  },
  cardLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: couleurs.texte,
    flex: 1,
  },
  cardCatBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardLocation: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },
  cardPitch: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    lineHeight: 16,
    marginTop: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  cardMatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardMatText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFollowers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardFollowersText: {
    fontSize: 10,
    color: couleurs.texteSecondaire,
  },
  cardFunding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFundingBarBg: {
    width: 30,
    height: 3,
    backgroundColor: couleurs.fondCard,
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardFundingBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: couleurs.succes,
  },
  cardFundingText: {
    fontSize: 9,
    fontWeight: '600',
    color: couleurs.succes,
  },

  // Card actions
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  cardActionText: {
    fontSize: 11,
    fontWeight: '500',
    color: couleurs.texteSecondaire,
  },
  cardActionDivider: {
    width: 1,
    backgroundColor: couleurs.bordure,
    marginVertical: 8,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 24,
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: couleurs.texte,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 24,
    borderRadius: rayons.md,
    overflow: 'hidden',
  },
  emptyCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyCtaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
