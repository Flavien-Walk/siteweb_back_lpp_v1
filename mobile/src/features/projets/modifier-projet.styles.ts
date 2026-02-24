import { StyleSheet } from 'react-native';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: couleurs.texteSecondaire,
    marginTop: espacements.md,
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
    width: 16,
    height: 2,
    backgroundColor: couleurs.fondSecondaire,
    marginHorizontal: 2,
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
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: rayons.md,
    marginTop: espacements.md,
  },
  // Liens
  linksList: {
    marginBottom: espacements.lg,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    padding: espacements.md,
    marginBottom: espacements.sm,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.primaire + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {
    flex: 1,
    marginLeft: espacements.md,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.texte,
  },
  linkUrl: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  linkRemoveBtn: {
    padding: espacements.xs,
  },
  noLinksBox: {
    alignItems: 'center',
    paddingVertical: espacements.xl,
    marginBottom: espacements.lg,
  },
  noLinksText: {
    fontSize: 15,
    color: couleurs.texteSecondaire,
    marginTop: espacements.sm,
  },
  noLinksHint: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: espacements.xs,
    textAlign: 'center',
    paddingHorizontal: espacements.lg,
  },
  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: couleurs.primaire + '15',
    borderRadius: rayons.md,
    padding: espacements.md,
    gap: 8,
  },
  addLinkBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: couleurs.primaire,
  },
  // Recap
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
  saveBtn: {
    backgroundColor: couleurs.primaire,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    gap: 8,
    marginTop: espacements.md,
    backgroundColor: couleurs.primaire + '15',
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: espacements.md,
    marginTop: espacements.sm,
  },
  cancelBtnText: {
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
  // Modal
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
    marginBottom: espacements.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: couleurs.texte,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  linkTypesScroll: {
    marginBottom: espacements.lg,
  },
  linkTypesRow: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  linkTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.full,
    gap: 6,
  },
  linkTypeChipActive: {
    backgroundColor: couleurs.primaire,
  },
  linkTypeChipText: {
    fontSize: 13,
    color: couleurs.texte,
  },
  linkTypeChipTextActive: {
    color: '#FFFFFF',
  },
  modalInputGroup: {
    marginBottom: espacements.lg,
  },
  modalInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: couleurs.texte,
    marginBottom: espacements.sm,
  },
  modalInput: {
    backgroundColor: couleurs.fondSecondaire,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 16,
    color: couleurs.texte,
  },
  modalConfirmBtn: {
    backgroundColor: couleurs.primaire,
    flexDirection: 'row',
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    borderRadius: rayons.full,
    paddingHorizontal: espacements.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: couleurs.bordure,
    gap: 6,
  },
  tagChipText: {
    fontSize: 13,
    color: couleurs.texte,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: couleurs.primaire + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metriqueInfo: {
    flex: 1,
    marginLeft: espacements.md,
  },
  metriqueValeur: {
    fontSize: 16,
    fontWeight: '700',
    color: couleurs.texte,
  },
  metriqueLabel: {
    fontSize: 13,
    color: couleurs.texteSecondaire,
    marginTop: 2,
  },
  metriqueIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: couleurs.fondSecondaire,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metriqueIconBtnActive: {
    backgroundColor: couleurs.primaire,
  },
  inputHint: {
    fontSize: 12,
    color: couleurs.texteSecondaire,
    marginTop: 4,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: espacements.sm,
    paddingVertical: 4,
    borderRadius: rayons.full,
    backgroundColor: couleurs.fondSecondaire,
  },
  visibilityText: {
    fontSize: 11,
    color: couleurs.texteSecondaire,
  },
});

export default createStyles;
