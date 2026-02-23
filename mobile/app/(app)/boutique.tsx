/**
 * Ecran Boutique — La Premiere Pierre
 * Navigation PagerView : Services LPP | Marketplace
 *
 * Services LPP : LPP+ hero, objectifs boost (flow multi-etapes), bundles
 * Marketplace : grille produits communautaires
 *
 * UX ethique : expliquer, pas vendre — aucun dark pattern
 * Paiement mock — pret pour backend
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  SafeAreaView,
  Platform,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReAnimated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import PagerView, {
  PagerViewOnPageSelectedEvent,
  PagerViewOnPageScrollEvent,
} from 'react-native-pager-view';

import { useTheme, ThemeCouleurs } from '../../src/contexts/ThemeContext';
import { useUser } from '../../src/contexts/UserContext';
import { espacements, rayons } from '../../src/constantes/theme';
import SwipeableScreen from '../../src/composants/SwipeableScreen';
import ShopBottomSheet from '../../src/composants/ShopBottomSheet';
import SubscriptionHeroCard from '../../src/composants/SubscriptionHeroCard';
import BoostGoalCard from '../../src/composants/BoostGoalCard';
import BundleCard from '../../src/composants/BundleCard';
import BoostFlowSheet from '../../src/composants/BoostFlowSheet';
import ProductDetailSheet from '../../src/composants/ProductDetailSheet';
import CategoryFilterBar from '../../src/composants/CategoryFilterBar';
import MarketplaceProductCard from '../../src/composants/MarketplaceProductCard';
import {
  CERTIFICATION_PLAN,
  BoostGoal,
  BoostBundle,
  BOOST_GOALS,
  BOOST_BUNDLES,
  MarketplaceProduct,
  MarketplaceCategory,
  MARKETPLACE_CATEGORIES,
  MOCK_MARKETPLACE_PRODUCTS,
  getMarketplaceProducts,
  formatPrice,
  calculateBundlePrice,
  subscribeCertification,
  purchaseBundle,
} from '../../src/services/boutique';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============ TABS CONFIG ============

const TABS_ENTREPRENEUR = [
  { key: 'services', label: 'Services LPP', icon: 'sparkles-outline' as const },
  { key: 'marketplace', label: 'Marketplace', icon: 'storefront-outline' as const },
];

// ============ ECRAN PRINCIPAL ============

export default function BoutiqueScreen() {
  const { couleurs } = useTheme();
  const { utilisateur, refreshUser } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = createStyles(couleurs);

  const [loading, setLoading] = useState(true);
  const isEntrepreneur = utilisateur?.statut === 'entrepreneur';
  const [activeTab, setActiveTab] = useState(0);

  // PagerView (uniquement pour entrepreneurs avec 2 tabs)
  const pagerRef = useRef<PagerView>(null);
  const tabIndicatorPosition = useRef(new Animated.Value(0)).current;

  // User state — LPP+ actif = abonnement actif OU resilie mais encore dans la periode
  const lppData = utilisateur?.lppPlus;
  const lppActive = lppData?.status === 'active';
  const lppCanceled = lppData?.status === 'canceled' && lppData?.cancelAtPeriodEnd === true;
  const lppWithinPeriod = lppData?.currentPeriodEnd ? new Date(lppData.currentPeriodEnd) > new Date() : false;
  const isLppPlus = lppActive || (lppCanceled && lppWithinPeriod);
  const isFirstBoost = true; // Mock: premier boost — a remplacer par API

  // Marketplace
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory>('tous');
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>(MOCK_MARKETPLACE_PRODUCTS);

  // Bottom sheet: Certification
  const [certSheetVisible, setCertSheetVisible] = useState(false);
  const [certPurchasing, setCertPurchasing] = useState(false);
  const [certResult, setCertResult] = useState<string | null>(null);
  const [certSuccess, setCertSuccess] = useState(false);

  // Boost flow sheet
  const [boostFlowVisible, setBoostFlowVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<BoostGoal | null>(null);

  // Bundle sheet
  const [bundleSheetVisible, setBundleSheetVisible] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<BoostBundle | null>(null);
  const [bundlePurchasing, setBundlePurchasing] = useState(false);
  const [bundleResult, setBundleResult] = useState<string | null>(null);

  // Bottom sheet: Product detail
  const [productSheetVisible, setProductSheetVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);

  // === TAB BAR ANIMATION (pattern accueil.tsx) ===

  const TAB_WIDTH = useMemo(
    () => (SCREEN_WIDTH - espacements.lg * 2) / TABS_ENTREPRENEUR.length,
    []
  );

  const indicatorTranslateX = useMemo(
    () =>
      tabIndicatorPosition.interpolate({
        inputRange: TABS_ENTREPRENEUR.map((_, i) => i),
        outputRange: TABS_ENTREPRENEUR.map((_, i) => i * TAB_WIDTH + 4),
        extrapolate: 'clamp',
      }),
    [TAB_WIDTH, tabIndicatorPosition]
  );

  const tabOpacities = useMemo(
    () =>
      TABS_ENTREPRENEUR.map((_, index) =>
        tabIndicatorPosition.interpolate({
          inputRange: [index - 1, index, index + 1],
          outputRange: [0.5, 1, 0.5],
          extrapolate: 'clamp',
        })
      ),
    [tabIndicatorPosition]
  );

  const handlePageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const { position } = event.nativeEvent;
      setActiveTab(position);

      if (Platform.OS === 'android') {
        Animated.spring(tabIndicatorPosition, {
          toValue: position,
          useNativeDriver: true,
          tension: 300,
          friction: 30,
        }).start();
      }
    },
    [tabIndicatorPosition]
  );

  const handlePageScroll = useCallback(
    (event: PagerViewOnPageScrollEvent) => {
      if (Platform.OS === 'ios') {
        const { position, offset } = event.nativeEvent;
        tabIndicatorPosition.setValue(position + offset);
      }
    },
    [tabIndicatorPosition]
  );

  const handleTabPress = useCallback(
    (index: number) => {
      Animated.spring(tabIndicatorPosition, {
        toValue: index,
        useNativeDriver: true,
        tension: 300,
        friction: 30,
      }).start();
      pagerRef.current?.setPage(index);
    },
    [tabIndicatorPosition]
  );

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // --- Marketplace Handlers ---

  const handleCategoryChange = useCallback((cat: MarketplaceCategory) => {
    setSelectedCategory(cat);
    setMarketplaceProducts(getMarketplaceProducts(cat));
  }, []);

  const handleOpenProduct = useCallback((product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setProductSheetVisible(true);
  }, []);

  const handleCloseProductSheet = useCallback(() => {
    setProductSheetVisible(false);
    setSelectedProduct(null);
  }, []);

  // --- Boost Goal Handlers ---

  const handleOpenGoal = useCallback((goal: BoostGoal) => {
    setSelectedGoal(goal);
    setBoostFlowVisible(true);
  }, []);

  const handleCloseBoostFlow = useCallback(() => {
    setBoostFlowVisible(false);
    setSelectedGoal(null);
  }, []);

  // --- Bundle Handlers ---

  const handleOpenBundle = useCallback((bundle: BoostBundle) => {
    setSelectedBundle(bundle);
    setBundleResult(null);
    setBundleSheetVisible(true);
  }, []);

  const handlePurchaseBundle = useCallback(async () => {
    if (!selectedBundle) return;
    setBundlePurchasing(true);
    const result = await purchaseBundle(selectedBundle.id);
    setBundlePurchasing(false);
    setBundleResult(result.message || 'Bientot disponible.');
  }, [selectedBundle]);

  const handleCloseBundleSheet = useCallback(() => {
    setBundleSheetVisible(false);
    setSelectedBundle(null);
    setBundleResult(null);
  }, []);

  // --- Certification Handlers ---

  const handleOpenCert = useCallback(() => {
    if (isLppPlus) {
      // Deja abonne → gerer l'abonnement
      router.push('/(app)/facturation');
      return;
    }
    setCertResult(null);
    setCertSuccess(false);
    setCertSheetVisible(true);
  }, [isLppPlus, router]);

  const handleSubscribe = useCallback(async () => {
    setCertPurchasing(true);
    const result = await subscribeCertification();
    setCertPurchasing(false);
    if (result.succes) {
      setCertSuccess(true);
      setCertResult('Votre abonnement LPP+ est actif !');
      refreshUser();
    } else {
      setCertSuccess(false);
      setCertResult(result.message || 'Erreur lors de l\'activation.');
    }
  }, [refreshUser]);

  const handleCloseCertSheet = useCallback(() => {
    setCertSheetVisible(false);
    setCertResult(null);
  }, []);

  // --- Render: Marketplace Tab ---

  const renderMarketplaceHeader = useCallback(
    () => (
      <View>
        <Pressable style={s.searchBar}>
          <Ionicons name="search-outline" size={18} color={couleurs.texteSecondaire} />
          <Text style={s.searchPlaceholder}>Rechercher produits, services...</Text>
        </Pressable>
        <CategoryFilterBar
          categories={MARKETPLACE_CATEGORIES}
          selected={selectedCategory}
          onSelect={handleCategoryChange}
        />
      </View>
    ),
    [selectedCategory, handleCategoryChange, couleurs, s]
  );

  const renderMarketplaceItem = useCallback(
    ({ item }: { item: MarketplaceProduct }) => (
      <View style={s.productGridItem}>
        <MarketplaceProductCard
          product={item}
          onPress={handleOpenProduct}
          couleurs={couleurs}
        />
      </View>
    ),
    [couleurs, handleOpenProduct, s.productGridItem]
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={s.emptyState}>
        <View style={s.emptyIcon}>
          <Ionicons name="storefront-outline" size={40} color={couleurs.texteMuted} />
        </View>
        <Text style={s.emptyTitle}>Aucun produit dans cette categorie</Text>
        <Text style={s.emptySubtitle}>
          Les entrepreneurs de la communaute proposeront bientot leurs produits et services ici.
        </Text>
      </View>
    ),
    [couleurs, s]
  );

  const renderMarketplaceFooter = useCallback(
    () => (
      <View style={s.marketplaceFooter}>
        <Ionicons name="information-circle-outline" size={13} color={couleurs.texteMuted} />
        <Text style={s.marketplaceFooterText}>
          Cet espace permet aux entrepreneurs de la communaute de proposer leurs produits et services. LPP ne prend aucune commission.
        </Text>
      </View>
    ),
    [couleurs, s]
  );

  const keyExtractor = useCallback((item: MarketplaceProduct) => item.id, []);

  // --- Loading Skeleton ---
  if (loading) {
    return (
      <SwipeableScreen edgeWidth={50}>
      <SafeAreaView style={s.container}>
        <View style={[s.header, { paddingTop: Platform.OS === 'android' ? insets.top + espacements.sm : espacements.sm }]}>
          <Pressable onPress={() => router.back()} style={s.backButton}>
            <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
          </Pressable>
          <Text style={s.headerTitle}>Boutique</Text>
          <View style={s.headerSpacer} />
        </View>
        {isEntrepreneur && (
          <View style={s.tabBar}>
            <View style={s.tabBarContent}>
              {TABS_ENTREPRENEUR.map((tab) => (
                <View key={tab.key} style={s.tabItem}>
                  <View style={s.skeletonTabLabel} />
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={s.skeletonContainer}>
          <ReAnimated.View entering={FadeIn.duration(300)} style={s.skeletonHero} />
          <ReAnimated.View entering={FadeIn.duration(300).delay(80)} style={s.skeletonGoal} />
          <ReAnimated.View entering={FadeIn.duration(300).delay(160)} style={s.skeletonGoal} />
          <ReAnimated.View entering={FadeIn.duration(300).delay(240)} style={s.skeletonGoal} />
        </View>
      </SafeAreaView>
      </SwipeableScreen>
    );
  }

  return (
    <SwipeableScreen edgeWidth={50} enabled={!isEntrepreneur || activeTab === 0}>
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Platform.OS === 'android' ? insets.top + espacements.sm : espacements.sm }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={s.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={couleurs.texte} />
        </Pressable>
        <Text style={s.headerTitle}>Boutique</Text>
        {isLppPlus ? (
          <Pressable
            onPress={() => router.push('/(app)/facturation')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={s.billingButton}
          >
            <Ionicons name="receipt-outline" size={20} color={couleurs.primaire} />
          </Pressable>
        ) : (
          <View style={s.headerSpacer} />
        )}
      </View>

      {isEntrepreneur ? (
        <>
          {/* Tab Bar (entrepreneurs uniquement) */}
          <View style={s.tabBar}>
            <View style={s.tabBarContent}>
              <Animated.View
                style={[
                  s.tabIndicator,
                  {
                    width: TAB_WIDTH - 8,
                    transform: [{ translateX: indicatorTranslateX }],
                  },
                ]}
              />
              {TABS_ENTREPRENEUR.map((tab, index) => (
                <Pressable
                  key={tab.key}
                  style={s.tabItem}
                  onPress={() => handleTabPress(index)}
                >
                  <Animated.View
                    style={[s.tabItemInner, { opacity: tabOpacities[index] }]}
                  >
                    <Ionicons name={tab.icon} size={16} color={couleurs.texte} />
                    <Text style={s.tabLabel}>{tab.label}</Text>
                  </Animated.View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* PagerView (entrepreneurs uniquement) */}
          <PagerView
            ref={pagerRef}
            style={s.pagerView}
            initialPage={0}
            onPageSelected={handlePageSelected}
            onPageScroll={handlePageScroll}
            overdrag={true}
            offscreenPageLimit={1}
          >
            {/* Page 0: Services LPP */}
            <View key="services" style={s.page}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.servicesContent}
              >
                {/* LPP+ Hero */}
                <ReAnimated.View entering={FadeInDown.duration(400).delay(50)}>
                  <SubscriptionHeroCard
                    plan={CERTIFICATION_PLAN}
                    isVerified={isLppPlus}
                    cancelAtPeriodEnd={lppData?.cancelAtPeriodEnd}
                    onPress={handleOpenCert}
                    couleurs={couleurs}
                  />
                </ReAnimated.View>

                {/* Welcome banner */}
                {isFirstBoost && (
                  <ReAnimated.View entering={FadeInDown.duration(400).delay(100)}>
                    <View style={s.welcomeBanner}>
                      <Ionicons name="gift-outline" size={16} color="#7C5CFF" />
                      <Text style={s.welcomeText}>
                        Premiere mise en avant ? Profitez de -50% sur votre premier boost
                      </Text>
                    </View>
                  </ReAnimated.View>
                )}

                {/* Section: Mise en avant */}
                <ReAnimated.View entering={FadeInDown.duration(400).delay(150)}>
                  <Text style={s.sectionTitle}>Mise en avant</Text>
                  <Text style={s.sectionSubtitle}>Donnez plus de visibilite a votre contenu</Text>
                </ReAnimated.View>

                {BOOST_GOALS.map((goal, index) => (
                  <ReAnimated.View
                    key={goal.id}
                    entering={FadeInDown.duration(350).delay(200 + index * 60)}
                  >
                    <BoostGoalCard
                      goal={goal}
                      onPress={handleOpenGoal}
                      couleurs={couleurs}
                    />
                  </ReAnimated.View>
                ))}

                {/* Section: Offres combinees */}
                <ReAnimated.View entering={FadeInDown.duration(400).delay(400)}>
                  <Text style={[s.sectionTitle, { marginTop: espacements.xl }]}>Offres combinees</Text>
                  <Text style={s.sectionSubtitle}>Maximisez votre visibilite avec un pack</Text>
                </ReAnimated.View>

                {BOOST_BUNDLES.map((bundle, index) => {
                  const bundlePrice = calculateBundlePrice(bundle, isLppPlus);
                  return (
                    <ReAnimated.View
                      key={bundle.id}
                      entering={FadeInDown.duration(350).delay(450 + index * 60)}
                    >
                      <BundleCard
                        bundle={bundle}
                        onPress={handleOpenBundle}
                        lppPlusPrice={isLppPlus ? bundlePrice.total : undefined}
                        couleurs={couleurs}
                      />
                    </ReAnimated.View>
                  );
                })}

                {/* Disclaimer */}
                <View style={s.boostDisclaimer}>
                  <Ionicons name="information-circle-outline" size={13} color={couleurs.texteMuted} />
                  <Text style={s.boostDisclaimerText}>
                    Achats ponctuels, sans engagement. Les estimations sont indicatives et ne constituent pas une garantie de resultats.
                  </Text>
                </View>

                {/* Reassurance */}
                <View style={s.reassurance}>
                  <Ionicons name="heart-outline" size={13} color={couleurs.texteMuted} />
                  <Text style={s.reassuranceText}>
                    Toutes les fonctionnalites essentielles de La Premiere Pierre sont et resteront accessibles gratuitement.
                  </Text>
                </View>
              </ScrollView>
            </View>

            {/* Page 1: Marketplace */}
            <View key="marketplace" style={s.page}>
              <FlatList
                data={marketplaceProducts}
                numColumns={2}
                keyExtractor={keyExtractor}
                columnWrapperStyle={s.productRow}
                contentContainerStyle={s.marketplaceContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderMarketplaceHeader}
                renderItem={renderMarketplaceItem}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={renderMarketplaceFooter}
              />
            </View>
          </PagerView>
        </>
      ) : (
        /* Visiteurs : Marketplace directement, sans tab bar ni PagerView */
        <FlatList
          data={marketplaceProducts}
          numColumns={2}
          keyExtractor={keyExtractor}
          columnWrapperStyle={s.productRow}
          contentContainerStyle={s.marketplaceContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderMarketplaceHeader}
          renderItem={renderMarketplaceItem}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderMarketplaceFooter}
        />
      )}

      {/* ====== BOTTOM SHEET: CERTIFICATION ====== */}
      <ShopBottomSheet visible={certSheetVisible} onClose={handleCloseCertSheet}>
        <View style={s.sheetBody}>
          {certResult ? (
            <View style={s.sheetResult}>
              <View style={[s.sheetResultIcon, { backgroundColor: certSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons
                  name={certSuccess ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={32}
                  color={certSuccess ? '#10B981' : '#EF4444'}
                />
              </View>
              <Text style={s.sheetResultTitle}>
                {certSuccess ? 'LPP+ active !' : 'Erreur'}
              </Text>
              <Text style={s.sheetResultMessage}>
                {certSuccess
                  ? 'Votre compte est desormais certifie. Profitez de vos avantages premium.'
                  : certResult}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  s.sheetCta,
                  s.sheetCtaFullWidth,
                  { backgroundColor: '#7C5CFF' },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleCloseCertSheet}
              >
                <Text style={s.sheetCtaText}>{certSuccess ? 'Parfait' : 'Compris'}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={s.sheetHeader}>
                <View style={[s.sheetIconCircle, { backgroundColor: 'rgba(124, 92, 255, 0.15)' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#7C5CFF" />
                </View>
                <View style={s.sheetHeaderInfo}>
                  <Text style={s.sheetTitle}>LPP+</Text>
                  <Text style={s.sheetSubtitle}>{formatPrice(CERTIFICATION_PLAN.price)} / mois</Text>
                </View>
              </View>

              <View style={s.certBenefits}>
                {CERTIFICATION_PLAN.benefits.map((b, i) => (
                  <View key={i} style={s.certBenefit}>
                    <Ionicons name={b.icon as any} size={16} color="#7C5CFF" />
                    <Text style={s.certBenefitText}>{b.text}</Text>
                  </View>
                ))}
              </View>

              <View style={s.certPrice}>
                <Text style={s.certPriceAmount}>{formatPrice(CERTIFICATION_PLAN.price)}</Text>
                <Text style={s.certPriceInterval}>par mois, annulable a tout moment</Text>
              </View>

              <View style={s.sheetDisclaimer}>
                <Text style={s.sheetDisclaimerText}>
                  Aucun effet sur l'algorithme. Votre contenu reste traite de la meme maniere, avec ou sans certification.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  s.sheetCta,
                  { backgroundColor: '#7C5CFF' },
                  pressed && { opacity: 0.85 },
                  certPurchasing && { opacity: 0.6 },
                ]}
                onPress={handleSubscribe}
                disabled={certPurchasing}
              >
                {certPurchasing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.sheetCtaText}>Activer LPP+</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </ShopBottomSheet>

      {/* ====== BOOST FLOW SHEET (multi-etapes) ====== */}
      <BoostFlowSheet
        visible={boostFlowVisible}
        goal={selectedGoal}
        isFirstBoost={isFirstBoost}
        isLppPlus={isLppPlus}
        onClose={handleCloseBoostFlow}
        couleurs={couleurs}
      />

      {/* ====== BOTTOM SHEET: BUNDLE ====== */}
      <ShopBottomSheet visible={bundleSheetVisible} onClose={handleCloseBundleSheet}>
        {selectedBundle && (
          <View style={s.sheetBody}>
            {bundleResult ? (
              <View style={s.sheetResult}>
                <View style={[s.sheetResultIcon, { backgroundColor: `${selectedBundle.color}15` }]}>
                  <Ionicons name="time-outline" size={32} color={selectedBundle.color} />
                </View>
                <Text style={s.sheetResultTitle}>Bientot disponible</Text>
                <Text style={s.sheetResultMessage}>{bundleResult}</Text>
                <Pressable
                  style={({ pressed }) => [
                    s.sheetCta,
                    s.sheetCtaFullWidth,
                    { backgroundColor: selectedBundle.color },
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={handleCloseBundleSheet}
                >
                  <Text style={s.sheetCtaText}>Compris</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={s.sheetHeader}>
                  <View style={[s.sheetIconCircle, { backgroundColor: `${selectedBundle.color}15` }]}>
                    <Ionicons name={selectedBundle.icon as any} size={24} color={selectedBundle.color} />
                  </View>
                  <View style={s.sheetHeaderInfo}>
                    <Text style={s.sheetTitle}>{selectedBundle.titre}</Text>
                    <Text style={s.sheetSubtitle}>{selectedBundle.description}</Text>
                  </View>
                </View>

                <View style={s.bundleContenu}>
                  {selectedBundle.contenu.map((item, i) => (
                    <View key={i} style={s.bundleContenuItem}>
                      <Ionicons name="checkmark-circle" size={16} color={selectedBundle.color} />
                      <Text style={s.bundleContenuText}>{item}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.bundlePriceSection}>
                  <View style={s.bundlePriceRow}>
                    <Text style={s.bundlePriceLabel}>Prix separe</Text>
                    <Text style={s.bundlePrixBarre}>{formatPrice(selectedBundle.prixSepare)}</Text>
                  </View>
                  {isLppPlus && (
                    <View style={s.bundlePriceRow}>
                      <View style={s.bundleDiscountRow}>
                        <Ionicons name="checkmark-circle" size={13} color="#7C5CFF" />
                        <Text style={s.bundleDiscountLabel}>Avantage LPP+</Text>
                      </View>
                      <Text style={s.bundleDiscountValue}>
                        -{formatPrice(calculateBundlePrice(selectedBundle, true).lppPlusDiscount)}
                      </Text>
                    </View>
                  )}
                  <View style={s.bundleTotalRow}>
                    <Text style={s.bundleTotalLabel}>Total</Text>
                    <Text style={[s.bundleTotalValue, { color: selectedBundle.color }]}>
                      {formatPrice(calculateBundlePrice(selectedBundle, isLppPlus).total)}
                    </Text>
                  </View>
                  <Text style={s.bundleEconomie}>
                    Vous economisez {selectedBundle.economie}%
                  </Text>
                </View>

                <View style={s.sheetDisclaimer}>
                  <Text style={s.sheetDisclaimerText}>
                    Achat ponctuel, sans engagement. N'affecte pas l'algorithme.
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    s.sheetCta,
                    { backgroundColor: selectedBundle.color },
                    pressed && { opacity: 0.85 },
                    bundlePurchasing && { opacity: 0.6 },
                  ]}
                  onPress={handlePurchaseBundle}
                  disabled={bundlePurchasing}
                >
                  {bundlePurchasing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.sheetCtaText}>
                      Activer le pack — {formatPrice(calculateBundlePrice(selectedBundle, isLppPlus).total)}
                    </Text>
                  )}
                </Pressable>

                {!isLppPlus && (
                  <Text style={s.lppCrossSell}>
                    Avec LPP+, ce pack vous reviendrait a {formatPrice(calculateBundlePrice(selectedBundle, true).total)}
                  </Text>
                )}
              </>
            )}
          </View>
        )}
      </ShopBottomSheet>

      {/* ====== BOTTOM SHEET: PRODUCT DETAIL ====== */}
      <ProductDetailSheet
        visible={productSheetVisible}
        product={selectedProduct}
        onClose={handleCloseProductSheet}
        couleurs={couleurs}
      />
    </SafeAreaView>
    </SwipeableScreen>
  );
}

// ============ STYLES ============

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },

    // === Header ===
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: espacements.lg,
      paddingBottom: espacements.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
      textAlign: 'center',
    },
    headerSpacer: { width: 40 },
    billingButton: {
      width: 40,
      height: 40,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },

    // === Tab Bar ===
    tabBar: {
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
      paddingHorizontal: espacements.lg,
    },
    tabBarContent: {
      flexDirection: 'row',
      position: 'relative',
    },
    tabIndicator: {
      position: 'absolute',
      bottom: 0,
      height: 3,
      backgroundColor: couleurs.primaire,
      borderRadius: 2,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: espacements.md,
    },
    tabItemInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tabLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texte,
    },

    // === PagerView ===
    pagerView: {
      flex: 1,
    },
    page: {
      flex: 1,
    },

    // === Services (ScrollView) ===
    servicesContent: {
      paddingHorizontal: espacements.lg,
      paddingTop: espacements.lg,
      paddingBottom: 60,
    },

    // Welcome banner
    welcomeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      backgroundColor: 'rgba(124, 92, 255, 0.08)',
      borderRadius: rayons.md,
      paddingVertical: espacements.md,
      paddingHorizontal: espacements.lg,
      marginBottom: espacements.xl,
    },
    welcomeText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#7C5CFF',
      flex: 1,
    },

    // Sections
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: couleurs.texte,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginBottom: espacements.lg,
    },
    boostDisclaimer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: espacements.sm,
      marginTop: espacements.lg,
      marginBottom: espacements.xl,
    },
    boostDisclaimerText: {
      fontSize: 11,
      color: couleurs.texteMuted,
      flex: 1,
      lineHeight: 16,
    },
    reassurance: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: espacements.sm,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      padding: espacements.md,
      marginBottom: espacements.xl,
    },
    reassuranceText: {
      fontSize: 12,
      color: couleurs.texteMuted,
      flex: 1,
      lineHeight: 17,
    },

    // === Marketplace (FlatList) ===
    marketplaceContent: {
      paddingHorizontal: espacements.lg,
      paddingTop: espacements.lg,
      paddingBottom: 40,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.full,
      paddingHorizontal: espacements.lg,
      paddingVertical: espacements.md,
      marginBottom: espacements.lg,
    },
    searchPlaceholder: {
      fontSize: 14,
      color: couleurs.texteMuted,
    },
    productRow: {
      gap: espacements.md,
      marginBottom: espacements.md,
    },
    productGridItem: {
      flex: 1,
    },

    // === Empty State ===
    emptyState: {
      alignItems: 'center',
      paddingVertical: espacements.xxl,
      paddingHorizontal: espacements.xl,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: couleurs.fondCard,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: espacements.lg,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: couleurs.texte,
      marginBottom: espacements.sm,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      lineHeight: 19,
    },

    // === Marketplace Footer ===
    marketplaceFooter: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: espacements.sm,
      paddingTop: espacements.md,
      paddingBottom: espacements.xl,
    },
    marketplaceFooterText: {
      fontSize: 11,
      color: couleurs.texteMuted,
      flex: 1,
      lineHeight: 16,
    },

    // === Bottom Sheet common ===
    sheetBody: {
      paddingHorizontal: espacements.xl,
      paddingBottom: espacements.md,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
      marginBottom: espacements.xl,
    },
    sheetIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheetHeaderInfo: {
      flex: 1,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
    },
    sheetSubtitle: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    sheetDisclaimer: {
      alignItems: 'center',
      paddingVertical: espacements.sm,
    },
    sheetDisclaimerText: {
      fontSize: 11,
      color: couleurs.texteMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
    sheetCta: {
      borderRadius: rayons.full,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: espacements.sm,
    },
    sheetCtaFullWidth: {
      alignSelf: 'stretch',
    },
    sheetCtaText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
    sheetResult: {
      alignItems: 'center',
      paddingVertical: espacements.xl,
    },
    sheetResultIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: espacements.lg,
    },
    sheetResultTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
      marginBottom: espacements.sm,
    },
    sheetResultMessage: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: espacements.xl,
      paddingHorizontal: espacements.lg,
    },

    // === Certification Sheet ===
    certBenefits: {
      gap: espacements.md,
      marginBottom: espacements.xl,
    },
    certBenefit: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
    },
    certBenefitText: {
      fontSize: 14,
      color: couleurs.texte,
      flex: 1,
    },
    certPrice: {
      alignItems: 'center',
      marginBottom: espacements.lg,
    },
    certPriceAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: couleurs.texte,
    },
    certPriceInterval: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },

    // === Bundle Sheet ===
    bundleContenu: {
      gap: espacements.sm,
      marginBottom: espacements.xl,
    },
    bundleContenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
    },
    bundleContenuText: {
      fontSize: 14,
      color: couleurs.texte,
      flex: 1,
    },
    bundlePriceSection: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.lg,
      marginBottom: espacements.md,
    },
    bundlePriceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: espacements.sm,
    },
    bundlePriceLabel: {
      fontSize: 14,
      color: couleurs.texte,
    },
    bundlePrixBarre: {
      fontSize: 14,
      color: couleurs.texteMuted,
      textDecorationLine: 'line-through',
    },
    bundleDiscountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    bundleDiscountLabel: {
      fontSize: 13,
      color: '#7C5CFF',
    },
    bundleDiscountValue: {
      fontSize: 13,
      color: '#7C5CFF',
      fontWeight: '600',
    },
    bundleTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
      paddingTop: espacements.sm,
    },
    bundleTotalLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: couleurs.texte,
    },
    bundleTotalValue: {
      fontSize: 20,
      fontWeight: '800',
    },
    bundleEconomie: {
      fontSize: 12,
      fontWeight: '600',
      color: '#10B981',
      textAlign: 'right',
      marginTop: 4,
    },
    lppCrossSell: {
      fontSize: 11,
      color: couleurs.texteMuted,
      textAlign: 'center',
      marginTop: espacements.md,
      lineHeight: 16,
    },

    // === Skeleton ===
    skeletonContainer: {
      flex: 1,
      paddingHorizontal: espacements.lg,
      paddingTop: espacements.lg,
      gap: espacements.md,
    },
    skeletonTabLabel: {
      width: 80,
      height: 14,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.sm,
    },
    skeletonHero: {
      height: 180,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.xl,
    },
    skeletonGoal: {
      height: 64,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
    },
  });
