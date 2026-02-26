import { StyleSheet } from 'react-native';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    // === Layout ===
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

    // === Step Indicator ===
    stepIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      paddingVertical: espacements.md,
    },
    stepDot: {
      width: 32,
      height: 6,
      borderRadius: 3,
      backgroundColor: couleurs.fondCard,
    },
    stepDotActive: {
      backgroundColor: '#7C5CFF',
    },
    stepLabel: {
      fontSize: 12,
      color: couleurs.texteMuted,
      textAlign: 'center',
      marginTop: 4,
      marginBottom: espacements.sm,
    },

    // === Scroll Content ===
    scrollContent: {
      paddingHorizontal: espacements.lg,
      paddingTop: espacements.md,
      paddingBottom: espacements.xl,
    },

    // === Section ===
    section: {
      marginBottom: espacements.xl,
    },
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

    // === Inputs ===
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: couleurs.texte,
      marginBottom: 6,
    },
    input: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      paddingHorizontal: espacements.lg,
      paddingVertical: espacements.md,
      fontSize: 15,
      color: couleurs.texte,
      marginBottom: espacements.md,
    },
    inputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    inputHelper: {
      fontSize: 11,
      color: couleurs.texteMuted,
      marginTop: -8,
      marginBottom: espacements.md,
    },
    inputError: {
      borderColor: '#EF4444',
    },

    // === Category Chips ===
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.sm,
      marginBottom: espacements.md,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.full,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      paddingHorizontal: espacements.lg,
      paddingVertical: espacements.sm,
    },
    categoryChipSelected: {
      backgroundColor: 'rgba(124, 92, 255, 0.15)',
      borderColor: '#7C5CFF',
    },
    categoryChipIcon: {
      marginRight: 2,
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: couleurs.texteSecondaire,
    },

    // === Delai Row ===
    delaiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: espacements.md,
    },
    delaiInput: {
      width: 64,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      paddingHorizontal: espacements.sm,
      paddingVertical: espacements.md,
      fontSize: 15,
      fontWeight: '600' as const,
      color: couleurs.texte,
      textAlign: 'center' as const,
    },
    delaiChip: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      paddingVertical: espacements.md,
    },
    delaiChipSelected: {
      backgroundColor: 'rgba(124, 92, 255, 0.15)',
      borderColor: '#7C5CFF',
    },
    delaiChipText: {
      fontSize: 14,
      fontWeight: '500',
      color: couleurs.texteSecondaire,
    },
    delaiChipTextSelected: {
      color: '#7C5CFF',
      fontWeight: '600' as const,
    },

    // === Checkbox ===
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
      marginBottom: espacements.md,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: couleurs.bordure,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#7C5CFF',
      borderColor: '#7C5CFF',
    },
    checkboxLabel: {
      fontSize: 14,
      color: couleurs.texte,
    },

    // === Image Picker ===
    imagePickerBox: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: couleurs.bordure,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      marginBottom: espacements.md,
    },
    imagePickerPlaceholder: {
      alignItems: 'center',
      gap: espacements.sm,
    },
    imagePickerText: {
      fontSize: 13,
      color: couleurs.texteMuted,
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      borderRadius: rayons.lg,
    },
    imageRemoveBtn: {
      position: 'absolute',
      top: espacements.sm,
      right: espacements.sm,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    // === Gallery ===
    galleryRow: {
      flexDirection: 'row',
      gap: espacements.sm,
      marginBottom: espacements.md,
    },
    galleryItem: {
      width: 80,
      height: 80,
      borderRadius: rayons.md,
      overflow: 'hidden',
      position: 'relative',
    },
    galleryAdd: {
      width: 80,
      height: 80,
      borderRadius: rayons.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: couleurs.bordure,
      backgroundColor: couleurs.fondCard,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // === Tags ===
    tagInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      paddingHorizontal: espacements.lg,
      paddingVertical: espacements.sm,
      marginBottom: espacements.sm,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacements.sm,
      marginBottom: espacements.md,
    },
    tagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(124, 92, 255, 0.12)',
      borderRadius: rayons.full,
      paddingHorizontal: espacements.md,
      paddingVertical: 5,
    },
    tagChipText: {
      fontSize: 13,
      color: '#7C5CFF',
      fontWeight: '500',
    },
    tagRemoveBtn: {
      marginLeft: 2,
    },

    // === Options / FAQ Cards ===
    optionCard: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      padding: espacements.md,
      paddingTop: 40,
      marginBottom: espacements.sm,
      position: 'relative',
    },
    optionRemoveBtn: {
      position: 'absolute',
      top: espacements.sm,
      right: espacements.sm,
      zIndex: 10,
      padding: 4,
    },
    faqCard: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      padding: espacements.md,
      paddingTop: 40,
      marginBottom: espacements.sm,
      position: 'relative',
    },
    faqRemoveBtn: {
      position: 'absolute',
      top: espacements.sm,
      right: espacements.sm,
      zIndex: 10,
      padding: 4,
    },

    // === Add Button ===
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: '#7C5CFF',
      borderRadius: rayons.md,
      paddingVertical: espacements.md,
      marginBottom: espacements.md,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#7C5CFF',
    },

    // === Preview Summary ===
    previewCard: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      padding: espacements.lg,
      marginBottom: espacements.lg,
    },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: espacements.sm,
    },
    previewLabel: {
      fontSize: 13,
      color: couleurs.texteMuted,
    },
    previewValue: {
      fontSize: 13,
      fontWeight: '600',
      color: couleurs.texte,
      maxWidth: '60%',
      textAlign: 'right',
    },

    // === CTA Bar ===
    ctaBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: espacements.lg,
      paddingTop: espacements.md,
      paddingBottom: espacements.xl,
      backgroundColor: couleurs.fond,
      borderTopWidth: 1,
      borderTopColor: couleurs.bordure,
    },
    ctaButton: {
      flex: 1,
      backgroundColor: '#7C5CFF',
      borderRadius: rayons.full,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaButtonDisabled: {
      opacity: 0.5,
    },
    ctaButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#fff',
    },
    prevButton: {
      paddingHorizontal: espacements.md,
      paddingVertical: 14,
      marginRight: espacements.sm,
    },
    prevButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texteSecondaire,
    },
  });

export default createStyles;
