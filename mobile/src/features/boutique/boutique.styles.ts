import { StyleSheet } from 'react-native';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';

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

export default createStyles;
