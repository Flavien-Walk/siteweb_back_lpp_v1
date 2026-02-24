import { StyleSheet, Dimensions } from 'react-native';
import { espacements, rayons, ombres } from '../../constantes/theme';
import { ThemeCouleurs } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 280;

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: couleurs.fond,
    },
    centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    errorText: {
      fontSize: 16,
      color: couleurs.texteSecondaire,
      marginTop: espacements.md,
    },
    retourBtn: {
      marginTop: espacements.lg,
      paddingHorizontal: espacements.xl,
      paddingVertical: espacements.md,
      backgroundColor: couleurs.primaire,
      borderRadius: rayons.md,
    },
    retourBtnText: {
      color: '#fff',
      fontWeight: '600',
    },

    // Header
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      overflow: 'hidden',
      zIndex: 10,
    },
    headerImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: HEADER_MAX_HEIGHT + 50,
      width: '100%',
      resizeMode: 'cover',
    },
    headerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    headerNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: espacements.md,
      zIndex: 2,
    },
    navButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      overflow: 'hidden',
    },
    blurButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    headerTitleContainer: {
      flex: 1,
      marginHorizontal: espacements.md,
    },
    headerTitleSmall: {
      fontSize: 17,
      fontWeight: '600',
      color: '#fff',
      textAlign: 'center',
    },
    headerContent: {
      position: 'absolute',
      bottom: espacements.xl,
      left: espacements.lg,
      right: espacements.lg,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    logoWrapper: {
      width: 64,
      height: 64,
      borderRadius: rayons.md,
      backgroundColor: couleurs.fond,
      padding: 3,
      marginRight: espacements.md,
      ...ombres.md,
    },
    logoImage: {
      width: '100%',
      height: '100%',
      borderRadius: rayons.sm,
    },
    headerInfo: {
      flex: 1,
    },
    projectName: {
      fontSize: 22,
      fontWeight: '700',
      color: '#fff',
      marginBottom: espacements.xs,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    locationText: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.85)',
    },

    // Content card
    contentCard: {
      backgroundColor: couleurs.fond,
      borderTopLeftRadius: rayons.xl + 4,
      borderTopRightRadius: rayons.xl + 4,
      marginTop: -rayons.xl,
      paddingTop: espacements.xxl,
    },

    // Quick stats
    quickStatsContainer: {
      flexDirection: 'row',
      marginHorizontal: espacements.lg,
      marginTop: espacements.sm,
      marginBottom: espacements.lg,
      padding: espacements.md,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
    },
    quickStatItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
    },
    quickStatIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickStatTextContainer: {
      flex: 1,
    },
    quickStatValue: {
      fontSize: 12,
      fontWeight: '700',
      color: couleurs.texte,
    },
    quickStatLabel: {
      fontSize: 10,
      color: couleurs.texteSecondaire,
      marginTop: 1,
    },
    quickStatDivider: {
      width: 1,
      height: 32,
      backgroundColor: couleurs.bordure,
      marginHorizontal: espacements.sm,
    },

    // Progress bar
    progressSection: {
      marginHorizontal: espacements.lg,
      marginBottom: espacements.lg,
      padding: espacements.lg,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: espacements.md,
    },
    progressAmountContainer: {
      flex: 1,
    },
    progressAmount: {
      fontSize: 26,
      fontWeight: '700',
      color: couleurs.texte,
    },
    progressLabel: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    progressPercentContainer: {
      backgroundColor: couleurs.primaire + '20',
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderRadius: rayons.md,
    },
    progressPercent: {
      fontSize: 15,
      fontWeight: '700',
      color: couleurs.primaire,
    },
    progressBarContainer: {
      height: 10,
      backgroundColor: couleurs.fond,
      borderRadius: rayons.full,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: rayons.full,
      overflow: 'hidden',
    },
    progressMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
      marginTop: espacements.md,
    },
    progressMetaText: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
    },

    // Actions
    actionsContainer: {
      flexDirection: 'row',
      gap: espacements.md,
      marginHorizontal: espacements.lg,
      marginBottom: espacements.lg,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      paddingVertical: espacements.md + 2,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
    },
    actionButtonActive: {
      backgroundColor: couleurs.primaire + '12',
      borderColor: couleurs.primaire,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    actionButtonTextActive: {
      color: couleurs.primaire,
    },
    actionButtonPrimary: {
      flex: 1,
      borderRadius: rayons.md,
      overflow: 'hidden',
    },
    actionButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      paddingVertical: espacements.md + 2,
    },
    actionButtonPrimaryText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },

    // Show more button
    showMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.xs,
      marginHorizontal: espacements.lg,
      marginBottom: espacements.lg,
      paddingVertical: espacements.md,
      backgroundColor: couleurs.primaire + '10',
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.primaire + '30',
    },
    showMoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.primaire,
    },

    // Tabs
    tabsContainer: {
      flexDirection: 'row',
      marginHorizontal: espacements.lg,
      marginBottom: espacements.md,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.md,
      padding: espacements.xs,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.xs,
      paddingVertical: espacements.sm,
      borderRadius: rayons.sm,
    },
    tabActive: {
      backgroundColor: couleurs.fond,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '500',
      color: couleurs.texteSecondaire,
    },
    tabTextActive: {
      color: couleurs.primaire,
      fontWeight: '600',
    },

    // Details content
    detailsContent: {
      paddingTop: espacements.md,
    },

    // Sections
    section: {
      paddingHorizontal: espacements.lg,
      paddingBottom: espacements.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      marginBottom: espacements.md,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: couleurs.texte,
    },
    sectionText: {
      fontSize: 15,
      color: couleurs.texteSecondaire,
      lineHeight: 23,
    },

    // Value cards
    valueCard: {
      flexDirection: 'row',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.md + 2,
      marginBottom: espacements.sm,
    },
    valueIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: espacements.md,
    },
    valueContent: {
      flex: 1,
      justifyContent: 'center',
    },
    valueLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: couleurs.texteSecondaire,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    valueText: {
      fontSize: 14,
      color: couleurs.texte,
      lineHeight: 20,
    },

    // Cible card
    cibleCard: {
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.lg,
    },

    // Team
    teamScroll: {
      marginHorizontal: -espacements.lg,
    },
    teamScrollContent: {
      paddingHorizontal: espacements.lg,
    },
    teamCard: {
      width: 100,
      alignItems: 'center',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      paddingVertical: espacements.md,
      paddingHorizontal: espacements.sm,
      marginRight: espacements.md,
    },
    teamAvatarContainer: {
      position: 'relative',
      marginBottom: espacements.sm,
    },
    founderBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: couleurs.primaire,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: couleurs.fondSecondaire,
    },
    teamName: {
      fontSize: 13,
      fontWeight: '600',
      color: couleurs.texte,
      textAlign: 'center',
    },
    teamLastName: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      marginBottom: espacements.xs,
    },
    teamRoleBadge: {
      marginTop: espacements.xs,
      backgroundColor: couleurs.primaire,
      paddingHorizontal: espacements.sm,
      paddingVertical: 3,
      borderRadius: rayons.full,
    },
    teamRoleBadgeMember: {
      backgroundColor: couleurs.fondTertiaire,
    },
    teamRoleText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#fff',
    },
    teamRoleTextMember: {
      color: couleurs.texteSecondaire,
    },

    // Tags
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.sm,
    },
    tag: {
      backgroundColor: couleurs.fondSecondaire,
      paddingHorizontal: espacements.md,
      paddingVertical: espacements.sm,
      borderRadius: rayons.full,
      borderWidth: 1,
      borderColor: couleurs.bordure,
    },
    tagText: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
    },

    // Links section (top of page - horizontal chips)
    linksSection: {
      marginHorizontal: espacements.lg,
      marginBottom: espacements.lg,
    },
    linksSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.xs,
      marginBottom: espacements.sm,
    },
    linksSectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texte,
    },
    linksScrollContent: {
      gap: espacements.sm,
    },
    linkChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.full,
      paddingVertical: espacements.sm,
      paddingHorizontal: espacements.md,
      gap: espacements.xs,
      borderWidth: 1,
      borderColor: couleurs.bordure,
    },
    linkChipIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
    },
    linkChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: couleurs.texte,
      maxWidth: 120,
    },

    // KPIs
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.md,
    },
    kpiCard: {
      width: (SCREEN_WIDTH - espacements.lg * 2 - espacements.md) / 2,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.lg,
      alignItems: 'center',
    },
    kpiIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: couleurs.primaire + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: espacements.sm,
    },
    kpiValue: {
      fontSize: 22,
      fontWeight: '700',
      color: couleurs.texte,
    },
    kpiLabel: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 4,
      textAlign: 'center',
    },

    // Business model
    businessModelCard: {
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.lg,
    },

    // Gallery
    galleryScrollContent: {
      paddingRight: espacements.lg,
    },
    galleryImageContainer: {
      borderRadius: rayons.lg,
      overflow: 'hidden',
      marginRight: espacements.md,
    },
    galleryImage: {
      width: 180,
      height: 130,
      borderRadius: rayons.lg,
    },

    // Documents
    videoCard: {
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      overflow: 'hidden',
    },
    videoPlaceholder: {
      height: 160,
      backgroundColor: couleurs.fond,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: couleurs.primaire,
      justifyContent: 'center',
      alignItems: 'center',
      paddingLeft: 3,
    },
    videoLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texte,
      textAlign: 'center',
      padding: espacements.md,
    },
    documentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.md,
      marginBottom: espacements.sm,
    },
    documentIcon: {
      width: 46,
      height: 46,
      borderRadius: rayons.md,
      backgroundColor: couleurs.primaire + '12',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: espacements.md,
    },
    documentInfo: {
      flex: 1,
    },
    documentName: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    documentMeta: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 3,
    },
    downloadButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: couleurs.primaire + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    privateDocsNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      backgroundColor: couleurs.fondSecondaire,
      borderRadius: rayons.lg,
      padding: espacements.md,
      marginTop: espacements.sm,
    },
    privateDocsText: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      flex: 1,
    },

    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingVertical: espacements.xxxl,
      paddingHorizontal: espacements.xl,
    },
    emptyStateIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: couleurs.fondSecondaire,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: espacements.lg,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: couleurs.texte,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      marginTop: espacements.sm,
      textAlign: 'center',
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      flex: 1,
    },
    modalContent: {
      backgroundColor: couleurs.fond,
      borderTopLeftRadius: rayons.xl + 4,
      borderTopRightRadius: rayons.xl + 4,
      padding: espacements.lg,
      maxHeight: '75%',
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: couleurs.bordure,
      alignSelf: 'center',
      marginBottom: espacements.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: espacements.sm,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: couleurs.texte,
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: couleurs.fondSecondaire,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalSubtitle: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      marginBottom: espacements.lg,
    },
    noRepresentantsContainer: {
      alignItems: 'center',
      paddingVertical: espacements.xxl,
    },
    noRepresentants: {
      fontSize: 14,
      color: couleurs.texteSecondaire,
      textAlign: 'center',
      marginTop: espacements.md,
    },
    representantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: espacements.md,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    representantInfo: {
      flex: 1,
      marginLeft: espacements.md,
    },
    representantName: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    representantRole: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    representantAction: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: couleurs.primaire + '12',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default createStyles;
