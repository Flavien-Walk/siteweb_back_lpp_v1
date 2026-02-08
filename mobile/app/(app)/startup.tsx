/**
 * Startup Radar - Decouverte de startups/projets
 * Page style Product Hunt avec filtres, trending et hero card
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  ScrollView,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, ThemeCouleurs } from '../../src/contexts/ThemeContext';
import { espacements, rayons } from '../../src/constantes/theme';
import { Avatar, SwipeableScreen } from '../../src/composants';
import {
  Projet,
  CategorieProjet,
  getProjets,
  getProjetsTendance,
  toggleSuivreProjet,
} from '../../src/services/projets';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Categories avec icones et couleurs
const CATEGORIES: { value: CategorieProjet | 'all'; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'all', label: 'Tout', icon: 'apps', color: '#6366F1' },
  { value: 'tech', label: 'Tech', icon: 'hardware-chip', color: '#3B82F6' },
  { value: 'food', label: 'Food', icon: 'restaurant', color: '#F97316' },
  { value: 'sante', label: 'Sante', icon: 'medkit', color: '#EF4444' },
  { value: 'education', label: 'Education', icon: 'school', color: '#8B5CF6' },
  { value: 'energie', label: 'Energie', icon: 'flash', color: '#F59E0B' },
  { value: 'culture', label: 'Culture', icon: 'color-palette', color: '#EC4899' },
  { value: 'environnement', label: 'Eco', icon: 'leaf', color: '#10B981' },
];

const MATURITE_CONFIG: Record<string, { label: string; color: string }> = {
  idee: { label: 'Idee', color: '#9CA3AF' },
  prototype: { label: 'Prototype', color: '#F59E0B' },
  lancement: { label: 'Lancement', color: '#3B82F6' },
  croissance: { label: 'Croissance', color: '#10B981' },
};

export default function StartupRadar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { couleurs } = useTheme();
  const styles = createStyles(couleurs);

  const [projets, setProjets] = useState<Projet[]>([]);
  const [trending, setTrending] = useState<Projet[]>([]);
  const [chargement, setChargement] = useState(true);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [categorieActive, setCategorieActive] = useState<CategorieProjet | 'all'>('all');
  const [recherche, setRecherche] = useState('');
  const [rechercheVisible, setRechercheVisible] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  const chargerDonnees = useCallback(async (estRefresh = false) => {
    if (!estRefresh) setChargement(true);
    else setRafraichissement(true);

    try {
      const filtres: Record<string, string> = {};
      if (categorieActive !== 'all') filtres.categorie = categorieActive;
      if (recherche.trim()) filtres.q = recherche.trim();

      const [projetsRes, trendingRes] = await Promise.all([
        getProjets({ ...filtres, limit: 20 }),
        !estRefresh ? getProjetsTendance(5) : Promise.resolve(null),
      ]);

      if (projetsRes.succes && projetsRes.data) {
        setProjets(projetsRes.data.projets);
      }
      if (trendingRes?.succes && trendingRes.data) {
        setTrending(trendingRes.data.projets);
      }
    } catch (error) {
      if (__DEV__) console.error('[STARTUP] Erreur chargement:', error);
    } finally {
      setChargement(false);
      setRafraichissement(false);
    }
  }, [categorieActive, recherche]);

  useEffect(() => {
    chargerDonnees();
  }, [chargerDonnees]);

  // Animation entree
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleRecherche = () => {
    const visible = !rechercheVisible;
    setRechercheVisible(visible);
    Animated.spring(searchAnim, {
      toValue: visible ? 1 : 0,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
    if (!visible) {
      setRecherche('');
    }
  };

  const handleToggleSuivre = async (projetId: string) => {
    try {
      const res = await toggleSuivreProjet(projetId);
      if (res.succes && res.data) {
        const update = (list: Projet[]) =>
          list.map(p =>
            p._id === projetId
              ? { ...p, estSuivi: res.data!.estSuivi, nbFollowers: res.data!.nbFollowers }
              : p
          );
        setProjets(update);
        setTrending(update);
      }
    } catch (error) {
      if (__DEV__) console.error('[STARTUP] Erreur follow:', error);
    }
  };

  const ouvrirProjet = (id: string) => {
    router.push({ pathname: '/(app)/projet/[id]', params: { id } });
  };

  // === HERO CARD (Featured startup) ===
  const renderHeroCard = () => {
    if (trending.length === 0) return null;
    const hero = trending[0];
    const maturite = MATURITE_CONFIG[hero.maturite] || MATURITE_CONFIG.idee;

    return (
      <Pressable onPress={() => ouvrirProjet(hero._id)} style={styles.heroCard}>
        <LinearGradient
          colors={[couleurs.primaire + '30', couleurs.primaireDark + '10', couleurs.fond]}
          style={styles.heroGradient}
        >
          {/* Image de couverture */}
          {hero.image ? (
            <Image source={{ uri: hero.image }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImagePlaceholder, { backgroundColor: couleurs.primaire + '20' }]}>
              <Ionicons name="rocket" size={48} color={couleurs.primaire} />
            </View>
          )}

          {/* Badge Trending */}
          <View style={styles.heroBadge}>
            <Ionicons name="trending-up" size={12} color="#FFF" />
            <Text style={styles.heroBadgeText}>Trending #1</Text>
          </View>

          {/* Contenu */}
          <View style={styles.heroContent}>
            <View style={styles.heroMeta}>
              <View style={[styles.maturiteBadge, { backgroundColor: maturite.color + '20' }]}>
                <Text style={[styles.maturiteText, { color: maturite.color }]}>{maturite.label}</Text>
              </View>
              <Text style={[styles.heroCategorie, { color: couleurs.texteSecondaire }]}>
                {CATEGORIES.find(c => c.value === hero.categorie)?.label || hero.categorie}
              </Text>
            </View>

            <Text style={[styles.heroNom, { color: couleurs.texte }]} numberOfLines={1}>
              {hero.nom}
            </Text>
            <Text style={[styles.heroPitch, { color: couleurs.texteSecondaire }]} numberOfLines={2}>
              {hero.pitch}
            </Text>

            {/* Footer hero */}
            <View style={styles.heroFooter}>
              <View style={styles.heroPorteur}>
                {hero.porteur && (
                  <Avatar
                    uri={hero.porteur.avatar}
                    prenom={hero.porteur.prenom}
                    nom={hero.porteur.nom}
                    taille={28}
                  />
                )}
                <Text style={[styles.heroPorteurNom, { color: couleurs.texteSecondaire }]} numberOfLines={1}>
                  {hero.porteur?.prenom} {hero.porteur?.nom}
                </Text>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Ionicons name="people-outline" size={14} color={couleurs.texteSecondaire} />
                  <Text style={[styles.heroStatText, { color: couleurs.texteSecondaire }]}>
                    {hero.nbFollowers}
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); handleToggleSuivre(hero._id); }}
                  style={[
                    styles.followBtn,
                    hero.estSuivi
                      ? { backgroundColor: couleurs.fondTertiaire }
                      : { backgroundColor: couleurs.primaire },
                  ]}
                >
                  <Ionicons
                    name={hero.estSuivi ? 'checkmark' : 'add'}
                    size={16}
                    color={hero.estSuivi ? couleurs.texteSecondaire : '#FFF'}
                  />
                  <Text style={[
                    styles.followBtnText,
                    { color: hero.estSuivi ? couleurs.texteSecondaire : '#FFF' },
                  ]}>
                    {hero.estSuivi ? 'Suivi' : 'Suivre'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  // === TRENDING SECTION ===
  const renderTrendingSection = () => {
    if (trending.length <= 1) return null;
    const trendingRest = trending.slice(1);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flame" size={20} color="#F59E0B" />
          <Text style={[styles.sectionTitle, { color: couleurs.texte }]}>En ce moment</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingScroll}>
          {trendingRest.map((projet, index) => {
            const maturite = MATURITE_CONFIG[projet.maturite] || MATURITE_CONFIG.idee;
            return (
              <Pressable
                key={projet._id}
                style={[styles.trendingCard, { backgroundColor: couleurs.fondCard }]}
                onPress={() => ouvrirProjet(projet._id)}
              >
                {projet.image ? (
                  <Image source={{ uri: projet.image }} style={styles.trendingImage} />
                ) : (
                  <View style={[styles.trendingImagePlaceholder, { backgroundColor: couleurs.primaire + '15' }]}>
                    <Ionicons name="rocket-outline" size={24} color={couleurs.primaire} />
                  </View>
                )}
                <View style={styles.trendingContent}>
                  <View style={styles.trendingRank}>
                    <Text style={[styles.trendingRankText, { color: couleurs.accent }]}>#{index + 2}</Text>
                  </View>
                  <Text style={[styles.trendingNom, { color: couleurs.texte }]} numberOfLines={1}>
                    {projet.nom}
                  </Text>
                  <Text style={[styles.trendingPitch, { color: couleurs.texteSecondaire }]} numberOfLines={2}>
                    {projet.pitch}
                  </Text>
                  <View style={styles.trendingFooter}>
                    <View style={[styles.maturiteBadgeSmall, { backgroundColor: maturite.color + '20' }]}>
                      <Text style={[styles.maturiteTextSmall, { color: maturite.color }]}>{maturite.label}</Text>
                    </View>
                    <View style={styles.trendingStat}>
                      <Ionicons name="people-outline" size={12} color={couleurs.texteMuted} />
                      <Text style={[styles.trendingStatText, { color: couleurs.texteMuted }]}>
                        {projet.nbFollowers}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // === PROJET CARD (dans la grille) ===
  const renderProjetCard = ({ item }: { item: Projet }) => {
    const maturite = MATURITE_CONFIG[item.maturite] || MATURITE_CONFIG.idee;
    const catConfig = CATEGORIES.find(c => c.value === item.categorie);

    return (
      <Pressable
        style={[styles.projetCard, { backgroundColor: couleurs.fondCard }]}
        onPress={() => ouvrirProjet(item._id)}
      >
        {/* En-tete avec logo/image */}
        <View style={styles.projetHeader}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.projetLogo} />
          ) : item.image ? (
            <Image source={{ uri: item.image }} style={styles.projetLogo} />
          ) : (
            <View style={[styles.projetLogoPlaceholder, { backgroundColor: (catConfig?.color || couleurs.primaire) + '20' }]}>
              <Ionicons name={catConfig?.icon || 'rocket'} size={22} color={catConfig?.color || couleurs.primaire} />
            </View>
          )}

          <View style={styles.projetInfo}>
            <Text style={[styles.projetNom, { color: couleurs.texte }]} numberOfLines={1}>
              {item.nom}
            </Text>
            <Text style={[styles.projetPitch, { color: couleurs.texteSecondaire }]} numberOfLines={2}>
              {item.pitch}
            </Text>
          </View>
        </View>

        {/* Tags */}
        <View style={styles.projetTags}>
          <View style={[styles.maturiteBadgeSmall, { backgroundColor: maturite.color + '20' }]}>
            <Text style={[styles.maturiteTextSmall, { color: maturite.color }]}>{maturite.label}</Text>
          </View>
          {catConfig && (
            <View style={[styles.categorieBadge, { backgroundColor: catConfig.color + '15' }]}>
              <Ionicons name={catConfig.icon} size={10} color={catConfig.color} />
              <Text style={[styles.categorieText, { color: catConfig.color }]}>{catConfig.label}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.projetFooter}>
          <View style={styles.projetPorteur}>
            {item.porteur && (
              <Avatar
                uri={item.porteur.avatar}
                prenom={item.porteur.prenom}
                nom={item.porteur.nom}
                taille={22}
              />
            )}
            <Text style={[styles.projetPorteurNom, { color: couleurs.texteMuted }]} numberOfLines={1}>
              {item.porteur?.prenom}
            </Text>
          </View>

          <Pressable
            onPress={() => handleToggleSuivre(item._id)}
            style={[
              styles.followBtnSmall,
              item.estSuivi
                ? { backgroundColor: couleurs.fondTertiaire, borderColor: couleurs.bordure, borderWidth: 1 }
                : { backgroundColor: couleurs.primaire },
            ]}
          >
            <Ionicons
              name={item.estSuivi ? 'checkmark' : 'add'}
              size={14}
              color={item.estSuivi ? couleurs.texteSecondaire : '#FFF'}
            />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  // === EMPTY STATE ===
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBg, { backgroundColor: couleurs.primaire + '15' }]}>
        <Ionicons name="rocket-outline" size={48} color={couleurs.primaire} />
      </View>
      <Text style={[styles.emptyTitle, { color: couleurs.texte }]}>Aucun projet trouve</Text>
      <Text style={[styles.emptySubtitle, { color: couleurs.texteSecondaire }]}>
        {recherche
          ? `Aucun resultat pour "${recherche}"`
          : 'Aucun projet dans cette categorie pour le moment'}
      </Text>
      {recherche ? (
        <Pressable
          style={[styles.emptyBtn, { backgroundColor: couleurs.primaire }]}
          onPress={() => { setRecherche(''); setRechercheVisible(false); }}
        >
          <Text style={styles.emptyBtnText}>Effacer la recherche</Text>
        </Pressable>
      ) : null}
    </View>
  );

  // === HEADER LIST (hero + trending + filtres) ===
  const renderListHeader = () => (
    <View>
      {/* Hero */}
      {renderHeroCard()}

      {/* Trending */}
      {renderTrendingSection()}

      {/* Section titre */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="compass" size={20} color={couleurs.primaire} />
          <Text style={[styles.sectionTitle, { color: couleurs.texte }]}>Explorer</Text>
          <Text style={[styles.sectionCount, { color: couleurs.texteMuted }]}>
            {projets.length} projet{projets.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </View>
  );

  const searchHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });

  return (
    <SwipeableScreen>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <Pressable onPress={() => router.back()} style={[styles.headerBtn, { backgroundColor: couleurs.fondCard }]}>
            <Ionicons name="arrow-back" size={22} color={couleurs.texte} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Ionicons name="rocket" size={20} color={couleurs.accent} />
            <Text style={[styles.headerTitle, { color: couleurs.texte }]}>Startup Radar</Text>
          </View>

          <Pressable
            onPress={toggleRecherche}
            style={[styles.headerBtn, { backgroundColor: rechercheVisible ? couleurs.primaire + '20' : couleurs.fondCard }]}
          >
            <Ionicons name={rechercheVisible ? 'close' : 'search'} size={20} color={rechercheVisible ? couleurs.primaire : couleurs.texte} />
          </Pressable>
        </Animated.View>

        {/* Barre de recherche animee */}
        <Animated.View style={[styles.searchContainer, { height: searchHeight, opacity: searchAnim }]}>
          <View style={[styles.searchBar, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
            <Ionicons name="search" size={16} color={couleurs.texteMuted} />
            <TextInput
              style={[styles.searchInput, { color: couleurs.texte }]}
              placeholder="Rechercher un projet..."
              placeholderTextColor={couleurs.texteMuted}
              value={recherche}
              onChangeText={setRecherche}
              onSubmitEditing={() => chargerDonnees()}
              returnKeyType="search"
            />
            {recherche.length > 0 && (
              <Pressable onPress={() => setRecherche('')}>
                <Ionicons name="close-circle" size={18} color={couleurs.texteMuted} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Filtres categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = categorieActive === cat.value;
            return (
              <Pressable
                key={cat.value}
                onPress={() => setCategorieActive(cat.value)}
                style={[
                  styles.categorieChip,
                  isActive
                    ? { backgroundColor: cat.color + '20', borderColor: cat.color }
                    : { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={isActive ? cat.color : couleurs.texteMuted}
                />
                <Text style={[
                  styles.categorieChipText,
                  { color: isActive ? cat.color : couleurs.texteSecondaire },
                ]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Contenu principal */}
        {chargement ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={couleurs.primaire} />
            <Text style={[styles.loadingText, { color: couleurs.texteSecondaire }]}>
              Scan en cours...
            </Text>
          </View>
        ) : (
          <FlatList
            data={projets}
            renderItem={renderProjetCard}
            keyExtractor={(item) => item._id}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={rafraichissement}
                onRefresh={() => chargerDonnees(true)}
                tintColor={couleurs.primaire}
                colors={[couleurs.primaire]}
              />
            }
          />
        )}
      </View>
    </SwipeableScreen>
  );
}

// ======================== STYLES ========================
const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: rayons.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    // Search
    searchContainer: {
      paddingHorizontal: espacements.md,
      overflow: 'hidden',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: rayons.md,
      borderWidth: 1,
      paddingHorizontal: 12,
      height: 42,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      paddingVertical: 0,
    },
    // Categories
    categoriesScroll: {
      maxHeight: 46,
    },
    categoriesContainer: {
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.xs,
      gap: 8,
    },
    categorieChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      gap: 6,
    },
    categorieChipText: {
      fontSize: 13,
      fontWeight: '500',
    },
    // Sections
    section: {
      paddingHorizontal: espacements.md,
      paddingTop: espacements.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: espacements.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      flex: 1,
    },
    sectionCount: {
      fontSize: 13,
    },
    // Hero Card
    heroCard: {
      marginHorizontal: espacements.md,
      marginTop: espacements.md,
      borderRadius: rayons.lg,
      overflow: 'hidden',
    },
    heroGradient: {
      borderRadius: rayons.lg,
    },
    heroImage: {
      width: '100%',
      height: 160,
      borderTopLeftRadius: rayons.lg,
      borderTopRightRadius: rayons.lg,
    },
    heroImagePlaceholder: {
      width: '100%',
      height: 160,
      borderTopLeftRadius: rayons.lg,
      borderTopRightRadius: rayons.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F59E0B',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    heroBadgeText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '700',
    },
    heroContent: {
      padding: espacements.md,
    },
    heroMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    heroCategorie: {
      fontSize: 12,
      fontWeight: '500',
    },
    heroNom: {
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 4,
    },
    heroPitch: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroPorteur: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    heroPorteurNom: {
      fontSize: 13,
      fontWeight: '500',
    },
    heroStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    heroStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    heroStatText: {
      fontSize: 13,
      fontWeight: '500',
    },
    // Follow button
    followBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      gap: 4,
    },
    followBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },
    followBtnSmall: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Maturite badges
    maturiteBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    maturiteText: {
      fontSize: 11,
      fontWeight: '600',
    },
    maturiteBadgeSmall: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    maturiteTextSmall: {
      fontSize: 10,
      fontWeight: '600',
    },
    // Trending
    trendingScroll: {
      paddingLeft: espacements.md,
      paddingRight: espacements.sm,
      gap: 12,
    },
    trendingCard: {
      width: SCREEN_WIDTH * 0.55,
      borderRadius: rayons.md,
      overflow: 'hidden',
    },
    trendingImage: {
      width: '100%',
      height: 90,
    },
    trendingImagePlaceholder: {
      width: '100%',
      height: 90,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trendingContent: {
      padding: 10,
    },
    trendingRank: {
      marginBottom: 4,
    },
    trendingRankText: {
      fontSize: 11,
      fontWeight: '800',
    },
    trendingNom: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    trendingPitch: {
      fontSize: 11,
      lineHeight: 16,
      marginBottom: 8,
    },
    trendingFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    trendingStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    trendingStatText: {
      fontSize: 11,
    },
    // Projet Card
    projetCard: {
      marginHorizontal: espacements.md,
      marginBottom: espacements.sm,
      borderRadius: rayons.md,
      padding: espacements.md,
    },
    projetHeader: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
    },
    projetLogo: {
      width: 48,
      height: 48,
      borderRadius: rayons.md,
    },
    projetLogoPlaceholder: {
      width: 48,
      height: 48,
      borderRadius: rayons.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    projetInfo: {
      flex: 1,
    },
    projetNom: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 2,
    },
    projetPitch: {
      fontSize: 13,
      lineHeight: 18,
    },
    projetTags: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 10,
    },
    categorieBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      gap: 4,
    },
    categorieText: {
      fontSize: 10,
      fontWeight: '600',
    },
    projetFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    projetPorteur: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    projetPorteurNom: {
      fontSize: 12,
      fontWeight: '500',
    },
    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
    },
    // Empty
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
      paddingHorizontal: espacements.xl,
    },
    emptyIconBg: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    emptyBtn: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    emptyBtnText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
    },
    // List
    listContent: {
      paddingBottom: 40,
    },
  });
