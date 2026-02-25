import { StyleSheet, Platform, Dimensions } from 'react-native';
import { espacements, rayons, typographie } from '../../constantes/theme';
import { ThemeCouleurs } from '../../contexts/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
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
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
    backgroundColor: couleurs.fond,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginHorizontal: espacements.sm,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: espacements.xxl,
  },
  errorIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: couleurs.fondCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacements.lg,
  },
  errorTitle: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  errorText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginBottom: espacements.xl,
  },
  errorButton: {
    paddingHorizontal: espacements.xl,
    paddingVertical: espacements.md,
    backgroundColor: couleurs.primaire,
    borderRadius: rayons.md,
  },
  errorButtonText: {
    color: couleurs.blanc,
    fontWeight: typographie.poids.semibold,
    fontSize: typographie.tailles.sm,
  },

  // Scroll
  scrollContent: {
    paddingBottom: espacements.xxxl,
  },

  // Profil Header - Layout Instagram
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
  avatarNoStory: {
    borderWidth: 3,
    borderColor: couleurs.bordure,
    backgroundColor: 'transparent',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statItemClickable: {
    paddingHorizontal: espacements.sm,
    paddingVertical: espacements.xs,
    borderRadius: rayons.sm,
  },
  statItemPressed: {
    backgroundColor: couleurs.fondCard,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: typographie.poids.bold,
    color: couleurs.texte,
  },
  statLockIcon: {
    marginTop: 2,
  },
  statLabel: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },

  // Info Section
  infoSection: {
    paddingHorizontal: espacements.lg,
    paddingBottom: espacements.md,
  },
  nomComplet: {
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: espacements.xs,
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    paddingHorizontal: espacements.sm,
    paddingVertical: 4,
    borderRadius: rayons.sm,
  },
  statutText: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
  },
  // Section Description
  descriptionSection: {
    marginTop: espacements.sm,
    marginBottom: espacements.sm,
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.md,
    padding: espacements.md,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  descriptionLabel: {
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texteSecondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: espacements.xs,
  },
  descriptionText: {
    fontSize: typographie.tailles.sm,
    color: couleurs.texte,
    lineHeight: 22,
  },
  dateInscription: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },

  // Stories Section
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

  // Actions Section
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
  actionBtnPrimary: {
    backgroundColor: couleurs.primaire,
  },
  actionBtnSuccess: {
    backgroundColor: couleurs.succes,
  },
  actionBtnOutline: {
    backgroundColor: couleurs.fondCard,
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  actionBtnStaff: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    width: 44,
    flex: 0,
    paddingHorizontal: 0,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.blanc,
  },
  actionBtnTextDark: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
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
    fontSize: typographie.tailles.sm,
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
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  emptyText: {
    fontSize: typographie.tailles.sm,
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
    backgroundColor: couleurs.fondCard,
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
    fontWeight: typographie.poids.semibold,
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
  // MODALS MEDIA (image)
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  mediaModalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },

  // ========== LECTEUR VIDEO - Style Instagram/LinkedIn ==========
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoTouchArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  videoGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  videoGradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 160 : 200,
  },
  videoCloseContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 44,
    left: 16,
    zIndex: 10,
  },
  videoCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCenterControl: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCenterBtn: {
    padding: 8,
  },
  videoCenterBtnInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  videoBottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 72,
  },
  videoProgressBar: {
    height: 24,
    justifyContent: 'center',
    marginBottom: 8,
  },
  videoProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: couleurs.primaire,
    borderRadius: 1.5,
  },
  videoControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoTimeText: {
    fontSize: 13,
    color: couleurs.blanc,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  videoTimeSeparator: {
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  videoRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  videoSmallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default createStyles;
