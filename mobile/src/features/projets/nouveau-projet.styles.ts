import { StyleSheet } from 'react-native';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
  },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: couleurs.texte,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: couleurs.primaire,
  },
  progressDotText: {
    fontSize: 12,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
  },
  progressDotTextActive: {
    color: '#FFFFFF',
  },
  progressLine: {
    width: 20,
    height: 2,
    backgroundColor: couleurs.fondSecondaire,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: couleurs.primaire,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  etapeContent: {
    paddingHorizontal: espacements.lg,
    paddingTop: espacements.md,
  },
  etapeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  etapeDescription: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.xl,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: espacements.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  inputHint: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.sm,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.sm,
  },
  documentIcon: {
    width: 36,
    height: 36,
    borderRadius: rayons.sm,
    backgroundColor: couleurs.primaire + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: espacements.md,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: couleurs.texte,
  },
  documentRemove: {
    padding: espacements.xs,
  },
  input: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 16,
    color: couleurs.texte,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    textAlign: 'right',
    marginTop: 4,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.full,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: couleurs.primaire,
  },
  categoryChipText: {
    fontSize: 14,
    color: couleurs.texte,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  maturiteGrid: {
    gap: espacements.sm,
  },
  maturiteCard: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  maturiteCardActive: {
    borderColor: couleurs.primaire,
  },
  maturiteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: couleurs.texte,
  },
  maturiteLabelActive: {
    color: couleurs.primaire,
  },
  maturiteDescription: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  imagePickerBtn: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: couleurs.bordure,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
  },
  imagePicked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imagePickedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  comingSoon: {
    alignItems: 'center',
    paddingVertical: espacements.xl * 2,
  },
  comingSoonText: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginTop: espacements.md,
    lineHeight: 22,
  },
  comingSoonHint: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
    fontStyle: 'italic',
  },
  recapCard: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.lg,
    padding: espacements.lg,
    marginBottom: espacements.xl,
  },
  recapTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: couleurs.texte,
    marginBottom: espacements.xs,
  },
  recapPitch: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.md,
    lineHeight: 20,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: espacements.sm,
  },
  recapText: {
    fontSize: 14,
    color: couleurs.texte,
  },
  recapSection: {
    marginTop: espacements.md,
    paddingTop: espacements.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  recapSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: couleurs.texteSecondaire,
    marginBottom: espacements.xs,
  },
  recapSectionText: {
    fontSize: 14,
    color: couleurs.texte,
    lineHeight: 20,
  },
  publishBtn: {
    backgroundColor: couleurs.primaire,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: 8,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveDraftBtn: {
    alignItems: 'center',
    paddingVertical: espacements.md,
    marginTop: espacements.md,
  },
  saveDraftBtnText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    gap: espacements.md,
    borderTopWidth: 1,
    borderTopColor: couleurs.bordure,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnSecondary: {
    backgroundColor: couleurs.fondSecondaire,
  },
  footerBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  footerBtnPrimary: {
    backgroundColor: couleurs.primaire,
  },
  footerBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerBtnDisabled: {
    opacity: 0.6,
  },
  // Styles Equipe
  teamList: {
    marginBottom: espacements.lg,
  },
  teamListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.sm,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.fondSecondaire,
  },
  memberAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  memberInfo: {
    flex: 1,
    marginLeft: espacements.md,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  memberRole: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  memberRemoveBtn: {
    padding: espacements.xs,
  },
  addTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.primaire + '15',
    borderRadius: rayons.md,
    padding: espacements.md,
    gap: 8,
  },
  addTeamBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.primaire,
  },
  teamHint: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    textAlign: 'center',
    marginTop: espacements.md,
    fontStyle: 'italic',
  },
  noFriendsBox: {
    flexDirection: 'row',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginTop: espacements.md,
    gap: 8,
  },
  noFriendsText: {
    flex: 1,
    fontSize: 13,
    color: couleurs.texteSecondaire,
    lineHeight: 18,
  },
  // Styles Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: couleurs.fond,
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    padding: espacements.lg,
    maxHeight: '80%',
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
  modalSubtitle: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginBottom: espacements.lg,
  },
  modalLoading: {
    paddingVertical: espacements.xl * 2,
    alignItems: 'center',
  },
  modalEmpty: {
    paddingVertical: espacements.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    marginTop: espacements.md,
    textAlign: 'center',
  },
  modalEmptyHint: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
    textAlign: 'center',
    paddingHorizontal: espacements.lg,
  },
  friendsList: {
    maxHeight: 300,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: couleurs.bordure,
  },
  friendItemSelected: {
    backgroundColor: couleurs.primaire + '10',
    marginHorizontal: -espacements.md,
    paddingHorizontal: espacements.md,
    borderRadius: rayons.md,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.fondSecondaire,
  },
  friendAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: couleurs.bordure,
  },
  friendInfo: {
    flex: 1,
    marginLeft: espacements.md,
  },
  friendName: {
    fontSize: 15,
    fontWeight: '500',
    color: couleurs.texte,
  },
  friendStatus: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
  },
  friendCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: couleurs.bordure,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendCheckboxSelected: {
    backgroundColor: couleurs.primaire,
    borderColor: couleurs.primaire,
  },
  modalConfirmBtn: {
    backgroundColor: couleurs.primaire,
    flexDirection: 'row',
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacements.lg,
    gap: 8,
  },
  modalConfirmBtnDisabled: {
    opacity: 0.6,
  },
  modalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.sm,
    marginBottom: espacements.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.full,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: 6,
  },
  tagChipText: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
  },
  // Metriques
  metriqueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.sm,
  },
  metriqueIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: couleurs.primaire + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: espacements.md,
  },
  metriqueInfo: {
    flex: 1,
  },
  metriqueValeur: {
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.texte,
  },
  metriqueLabel: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  // Document visibility
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default createStyles;
