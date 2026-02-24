import { StyleSheet, Platform } from 'react-native';
import { espacements, rayons, typographie } from '../../constantes/theme';

// Fonction pour creer les styles dynamiques
const createStyles = (couleurs: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: couleurs.fond,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: rayons.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabContainer: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.md,
    paddingBottom: espacements.sm,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: 4,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: espacements.sm + 2,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  tabTextActive: {
    color: couleurs.primaire,
  },
  tabIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    backgroundColor: couleurs.fond,
    borderRadius: rayons.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Message
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: espacements.lg,
    marginTop: espacements.sm,
    padding: espacements.md,
    borderRadius: rayons.md,
    gap: espacements.sm,
  },
  messageSucces: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  messageErreur: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
  },
  messageTextSucces: {
    color: couleurs.succes,
  },
  messageTextErreur: {
    color: couleurs.erreur,
  },

  // =====================
  // PROFIL PUBLIC STYLES
  // =====================
  profilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.xl,
  },
  avatarSection: {
    marginRight: espacements.xl,
  },
  avatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 45,
    backgroundColor: couleurs.fond,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
  avatarNoStory: {
    borderWidth: 3,
    borderColor: couleurs.bordure,
    backgroundColor: 'transparent',
  },
  storyAddBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: couleurs.secondaire,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  statLabel: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  infoSection: {
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.md,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  nomComplet: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
    flexShrink: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  xpBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    backgroundColor: couleurs.primaireLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: rayons.full,
  },
  xpBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: couleurs.primaire,
  },
  // Section Description
  descriptionSection: {
    marginBottom: espacements.lg,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.sm,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modifierDescriptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: rayons.sm,
    backgroundColor: `${couleurs.primaire}15`,
  },
  modifierDescriptionBtnPressed: {
    opacity: 0.7,
  },
  modifierDescriptionText: {
    fontSize: 12,
    color: couleurs.primaire,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 22,
  },
  descriptionPlaceholder: {
    fontSize: 14,
    color: couleurs.texteMuted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  secondaryInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
  },
  infoItemText: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: espacements.sm,
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.sm + 2,
    borderRadius: rayons.md,
    gap: espacements.xs,
  },
  actionBtnOutline: {
    backgroundColor: couleurs.fondSecondaire,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnTextDark: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
  },

  // =====================
  // SECTION MES STORIES
  // =====================
  storiesSection: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    marginTop: espacements.sm,
  },
  storiesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: espacements.md,
  },
  storiesSectionTitle: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
  },
  storiesCount: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
  },
  storiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.lg,
  },
  noStoriesHint: {
    flex: 1,
  },
  noStoriesText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.sm,
  },
  addStoryBtn: {
    borderRadius: rayons.full,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  addStoryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.xs + 2,
    gap: espacements.xs,
  },
  addStoryBtnText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
  },

  // =====================
  // SECTION ACTIVITE / PUBLICATIONS
  // =====================
  activitySection: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
    marginTop: espacements.md,
  },
  activityTab: {
    flex: 1,
    paddingVertical: espacements.md,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    marginTop: -1,
  },
  activityTabActive: {
    borderTopColor: couleurs.primaire,
  },
  activitySeparator: {
    height: 1,
    backgroundColor: couleurs.bordure,
    marginBottom: 1,
  },
  loadingActivity: {
    alignItems: 'center',
    paddingVertical: espacements.xxxl,
    gap: espacements.md,
  },
  loadingText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: espacements.xxxl,
    paddingHorizontal: espacements.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: couleurs.texteSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  emptyIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  emptyText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    lineHeight: 20,
  },
  publicationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  publicationItem: {
    // width et height definis dynamiquement via gridItemWidth
    backgroundColor: couleurs.fondSecondaire,
    marginBottom: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  publicationItemMargin: {
    marginRight: 1,
  },
  publicationItemPressed: {
    opacity: 0.7,
  },
  publicationMediaContainer: {
    flex: 1,
    position: 'relative',
  },
  publicationImage: {
    width: '100%',
    height: '100%',
    backgroundColor: couleurs.fondTertiaire,
  },
  videoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiMediaBadge: {
    position: 'absolute',
    top: espacements.xs,
    right: espacements.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: rayons.xs,
    padding: 4,
  },
  publicationItemOverlay: {
    position: 'absolute',
    bottom: espacements.xs,
    right: espacements.xs,
  },
  publicationItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: espacements.xs,
    paddingVertical: 2,
    borderRadius: rayons.xs,
    gap: 4,
  },
  publicationItemStatText: {
    fontSize: 11,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  // Styles pour les projets suivis
  projetOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: espacements.xs,
  },
  projetName: {
    fontSize: 11,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
    marginBottom: 2,
  },
  projetStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  projetFollowers: {
    fontSize: 10,
    color: couleurs.blanc,
  },
  publicationTextOnly: {
    flex: 1,
    padding: espacements.sm,
    paddingLeft: espacements.md,
    backgroundColor: couleurs.fondCard,
    justifyContent: 'center',
    borderLeftWidth: 3,
    borderLeftColor: couleurs.primaire,
  },
  textQuoteIcon: {
    position: 'absolute',
    top: 5,
    right: 5,
    opacity: 0.25,
  },
  textContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: espacements.sm,
  },
  publicationTextContent: {
    fontSize: 13,
    color: couleurs.texte,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  publicationTextStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: espacements.sm,
  },
  textStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${couleurs.primaire}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  publicationTextStatValue: {
    fontSize: 10,
    fontWeight: '600',
    color: couleurs.primaire,
  },

  // =====================
  // MODALS MEDIA
  // =====================
  mediaModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaModalCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mediaModalImage: {
    width: '100%',
    height: '80%',
  },
  // =====================
  // PARAMETRES STYLES
  // =====================
  menu: {
    marginHorizontal: espacements.lg,
    marginVertical: espacements.md,
    gap: espacements.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: espacements.md,
  },
  menuItemActive: {
    borderColor: couleurs.primaire,
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.08)',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: rayons.md,
    backgroundColor: couleurs.fondTertiaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconActive: {
    backgroundColor: couleurs.primaire,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  menuLabelActive: {
    color: couleurs.primaire,
  },
  menuDescription: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },

  // Styles pour carte et badge d'avertissements
  warningCard: {
    marginHorizontal: espacements.lg,
    marginBottom: espacements.md,
    padding: espacements.md,
    borderRadius: rayons.lg,
    borderWidth: 1,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningCount: {
    fontSize: 28,
    fontWeight: '800',
  },
  warningText: {
    fontSize: 12,
    flex: 1,
    marginLeft: espacements.md,
    textAlign: 'right',
  },
  warningBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rayons.full,
    marginRight: espacements.sm,
  },
  warningBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  sectionCard: {
    marginHorizontal: espacements.lg,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.xl,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  parametresContent: {
    padding: espacements.lg,
  },
  parametresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  parametresDescription: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
    marginBottom: espacements.lg,
  },

  // Theme styles
  themeCard: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    marginBottom: espacements.md,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.lg,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: espacements.md,
    marginBottom: espacements.lg,
  },
  themeOption: {
    flex: 1,
    borderRadius: rayons.lg,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    overflow: 'hidden',
  },
  themeOptionActive: {
    borderColor: couleurs.primaire,
  },
  themePreview: {
    height: 80,
    padding: espacements.sm,
  },
  themePreviewDark: {
    backgroundColor: '#0F0F14',
  },
  themePreviewLight: {
    backgroundColor: '#F1F5F9',
  },
  themePreviewHeader: {
    height: 12,
    backgroundColor: '#252532',
    borderRadius: 4,
    marginBottom: espacements.xs,
  },
  themePreviewContent: {
    flex: 1,
    gap: espacements.xs,
  },
  themePreviewCard: {
    flex: 1,
    borderRadius: 4,
  },
  themeOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: espacements.md,
    backgroundColor: couleurs.fondSecondaire,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  themeOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  themeOptionLabelActive: {
    color: couleurs.primaire,
  },
  themeActiveBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: couleurs.fondSecondaire,
    padding: espacements.md,
    borderRadius: rayons.md,
  },
  quickToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  quickToggleText: {
    fontSize: 14,
    color: couleurs.texte,
  },

  // Inputs
  inputGroup: {
    marginBottom: espacements.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  input: {
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 15,
    color: couleurs.texte,
  },
  inputBio: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputPassword: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fond,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
  },
  inputPasswordField: {
    flex: 1,
    paddingVertical: espacements.md,
    fontSize: 15,
    color: couleurs.texte,
  },

  // Buttons
  btnPrimary: {
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacements.md,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  btnDanger: {
    backgroundColor: couleurs.erreur,
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacements.sm,
    marginTop: espacements.md,
  },
  btnDangerText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // RGPD Card
  rgpdCard: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.md,
    padding: espacements.lg,
    marginBottom: espacements.lg,
  },
  rgpdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.md,
  },
  rgpdTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  rgpdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  rgpdText: {
    fontSize: 13,
    color: couleurs.texte,
  },

  // Danger Zone
  dangerZone: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: rayons.md,
    padding: espacements.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
    marginBottom: espacements.md,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.erreur,
  },
  dangerDescription: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
    marginBottom: espacements.lg,
  },

  // Modal Avatar
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: couleurs.fondSecondaire,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.xxl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espacements.lg,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    marginBottom: espacements.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: couleurs.texte,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: espacements.xxl,
    gap: espacements.md,
  },
  modalLoadingText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espacements.md,
    paddingVertical: espacements.md,
  },
  avatarOption: {
    alignItems: 'center',
    gap: espacements.xs,
    padding: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: couleurs.primaire,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  avatarOptionImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarOptionInitiales: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: couleurs.primaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionInitialesText: {
    fontSize: 20,
    fontWeight: '600',
    color: couleurs.blanc,
  },
  avatarOptionLabel: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.fond,
    borderWidth: 2,
    borderColor: couleurs.primaire,
    borderStyle: 'dashed',
    borderRadius: rayons.lg,
    paddingVertical: espacements.lg,
    marginBottom: espacements.lg,
    gap: espacements.sm,
  },
  galleryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.primaire,
  },
  avatarSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    marginBottom: espacements.md,
    textAlign: 'center',
  },

  // Statut switcher
  statutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: rayons.md,
    borderWidth: 1.5,
    backgroundColor: couleurs.fond,
  },
  statutCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },

  // Boutons secondaires (modale)
  btnSecondary: {
    backgroundColor: couleurs.fond,
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
});

export default createStyles;
