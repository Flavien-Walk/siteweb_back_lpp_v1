/**
 * TextEditorSheet - Modal pour configurer un widget texte
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements, rayons, typographie } from '../../../constantes/theme';
import KeyboardView from '../../KeyboardView';
import { useTheme } from '../../../contexts/ThemeContext';
import { WIDGET_COLORS, TEXT_FONT_SIZES } from '../../../types/storyWidgets';

export interface TextEditorData {
  text: string;
  fontSize: 'small' | 'medium' | 'large';
  fontStyle: 'default' | 'serif' | 'mono' | 'handwritten';
  color: string;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right';
}

interface TextEditorSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: TextEditorData) => void;
  initialData?: Partial<TextEditorData>;
}

const FONT_STYLES: { value: TextEditorData['fontStyle']; label: string }[] = [
  { value: 'default', label: 'Normal' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
  { value: 'handwritten', label: 'Script' },
];

const FONT_SIZES: { value: TextEditorData['fontSize']; label: string }[] = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
];

const TEXT_ALIGNS: { value: TextEditorData['textAlign']; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'left', icon: 'reorder-three-outline' },
  { value: 'center', icon: 'menu-outline' },
  { value: 'right', icon: 'reorder-three-outline' },
];

const TextEditorSheet: React.FC<TextEditorSheetProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
}) => {
  const { couleurs: themeColors } = useTheme();
  const [text, setText] = useState(initialData?.text || '');
  const [fontSize, setFontSize] = useState<TextEditorData['fontSize']>(initialData?.fontSize || 'medium');
  const [fontStyle, setFontStyle] = useState<TextEditorData['fontStyle']>(initialData?.fontStyle || 'default');
  const [color, setColor] = useState(initialData?.color || '#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState(initialData?.backgroundColor || '');
  const [textAlign, setTextAlign] = useState<TextEditorData['textAlign']>(initialData?.textAlign || 'center');

  useEffect(() => {
    if (visible) {
      setText(initialData?.text || '');
      setFontSize(initialData?.fontSize || 'medium');
      setFontStyle(initialData?.fontStyle || 'default');
      setColor(initialData?.color || '#FFFFFF');
      setBackgroundColor(initialData?.backgroundColor || '');
      setTextAlign(initialData?.textAlign || 'center');
    }
  }, [visible, initialData]);

  const handleSave = () => {
    if (!text.trim()) return;

    onSave({
      text: text.trim(),
      fontSize,
      fontStyle,
      color,
      backgroundColor: backgroundColor || undefined,
      textAlign,
    });
  };

  const isValid = text.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardView style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: themeColors.fond }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.texte }]}>
              Ajouter du texte
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={themeColors.texte} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Text Input */}
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: themeColors.fondCard,
                    borderColor: themeColors.bordure,
                    color: themeColors.texte,
                    fontSize: TEXT_FONT_SIZES[fontSize],
                    textAlign,
                  },
                ]}
                placeholder="Votre texte..."
                placeholderTextColor={themeColors.texteSecondaire}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={100}
              />
            </View>

            {/* Font Size */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
                Taille
              </Text>
              <View style={styles.optionRow}>
                {FONT_SIZES.map((size) => (
                  <Pressable
                    key={size.value}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor:
                          fontSize === size.value
                            ? couleurs.primaire
                            : themeColors.fondCard,
                        borderColor:
                          fontSize === size.value
                            ? couleurs.primaire
                            : themeColors.bordure,
                      },
                    ]}
                    onPress={() => setFontSize(size.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: fontSize === size.value ? couleurs.blanc : themeColors.texte,
                        },
                      ]}
                    >
                      {size.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Font Style */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
                Style
              </Text>
              <View style={styles.optionRow}>
                {FONT_STYLES.map((style) => (
                  <Pressable
                    key={style.value}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor:
                          fontStyle === style.value
                            ? couleurs.primaire
                            : themeColors.fondCard,
                        borderColor:
                          fontStyle === style.value
                            ? couleurs.primaire
                            : themeColors.bordure,
                      },
                    ]}
                    onPress={() => setFontStyle(style.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: fontStyle === style.value ? couleurs.blanc : themeColors.texte,
                        },
                      ]}
                    >
                      {style.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Text Align */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
                Alignement
              </Text>
              <View style={styles.optionRow}>
                {TEXT_ALIGNS.map((align) => (
                  <Pressable
                    key={align.value}
                    style={[
                      styles.alignButton,
                      {
                        backgroundColor:
                          textAlign === align.value
                            ? couleurs.primaire
                            : themeColors.fondCard,
                        borderColor:
                          textAlign === align.value
                            ? couleurs.primaire
                            : themeColors.bordure,
                        transform: align.value === 'right' ? [{ scaleX: -1 }] : [],
                      },
                    ]}
                    onPress={() => setTextAlign(align.value)}
                  >
                    <Ionicons
                      name={align.icon}
                      size={20}
                      color={textAlign === align.value ? couleurs.blanc : themeColors.texte}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Text Color */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
                Couleur du texte
              </Text>
              <View style={styles.colorRow}>
                {WIDGET_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.colorButton,
                      { backgroundColor: c },
                      color === c && styles.colorButtonSelected,
                    ]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>
            </View>

            {/* Background Color */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
                Fond (optionnel)
              </Text>
              <View style={styles.colorRow}>
                <Pressable
                  style={[
                    styles.colorButton,
                    styles.noColorButton,
                    !backgroundColor && styles.colorButtonSelected,
                  ]}
                  onPress={() => setBackgroundColor('')}
                >
                  <Ionicons name="close" size={16} color={themeColors.texteSecondaire} />
                </Pressable>
                {WIDGET_COLORS.slice(0, 5).map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.colorButton,
                      { backgroundColor: c },
                      backgroundColor === c && styles.colorButtonSelected,
                    ]}
                    onPress={() => setBackgroundColor(c)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Pressable
              style={[
                styles.saveButton,
                { opacity: isValid ? 1 : 0.5 },
              ]}
              onPress={handleSave}
              disabled={!isValid}
            >
              <Text style={styles.saveButtonText}>Ajouter le texte</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: rayons.xl,
    borderTopRightRadius: rayons.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: typographie.tailles.lg,
    fontWeight: typographie.poids.semibold,
  },
  content: {
    padding: espacements.lg,
  },
  inputGroup: {
    marginBottom: espacements.lg,
  },
  label: {
    fontSize: typographie.tailles.sm,
    marginBottom: espacements.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
  alignButton: {
    flex: 1,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    gap: espacements.sm,
    flexWrap: 'wrap',
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  noColorButton: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: couleurs.primaire,
  },
  footer: {
    padding: espacements.lg,
    paddingBottom: espacements.xl,
  },
  saveButton: {
    backgroundColor: couleurs.primaire,
    paddingVertical: espacements.md,
    borderRadius: rayons.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.base,
    fontWeight: typographie.poids.semibold,
  },
});

export default TextEditorSheet;
