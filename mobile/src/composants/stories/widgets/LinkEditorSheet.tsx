/**
 * LinkEditorSheet - Modal pour configurer un widget lien
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements, rayons, typographie } from '../../../constantes/theme';
import { useTheme } from '../../../contexts/ThemeContext';

export interface LinkEditorData {
  url: string;
  label: string;
  style: 'pill' | 'arrow' | 'swipe';
}

interface LinkEditorSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: LinkEditorData) => void;
  initialData?: Partial<LinkEditorData>;
}

const STYLE_OPTIONS: { value: 'pill' | 'arrow' | 'swipe'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'pill', label: 'Bouton', icon: 'ellipse-outline' },
  { value: 'arrow', label: 'Fleche', icon: 'chevron-up' },
  { value: 'swipe', label: 'Swipe', icon: 'arrow-up-circle-outline' },
];

const LinkEditorSheet: React.FC<LinkEditorSheetProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
}) => {
  const { couleurs: themeColors } = useTheme();
  const [url, setUrl] = useState(initialData?.url || '');
  const [label, setLabel] = useState(initialData?.label || '');
  const [style, setStyle] = useState<'pill' | 'arrow' | 'swipe'>(initialData?.style || 'pill');

  useEffect(() => {
    if (visible) {
      setUrl(initialData?.url || '');
      setLabel(initialData?.label || '');
      setStyle(initialData?.style || 'pill');
    }
  }, [visible, initialData]);

  const handleSave = () => {
    if (!url.trim()) return;

    // Ajouter https:// si pas de protocole
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    onSave({
      url: finalUrl,
      label: label.trim() || 'Voir le lien',
      style,
    });
  };

  const isValid = url.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: themeColors.fond }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.texte }]}>
              Ajouter un lien
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={themeColors.texte} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* URL Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
                URL du lien
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.fondCard,
                    borderColor: themeColors.bordure,
                    color: themeColors.texte,
                  },
                ]}
                placeholder="https://exemple.com"
                placeholderTextColor={themeColors.texteSecondaire}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {/* Label Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
                Texte du bouton (optionnel)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.fondCard,
                    borderColor: themeColors.bordure,
                    color: themeColors.texte,
                  },
                ]}
                placeholder="Voir le lien"
                placeholderTextColor={themeColors.texteSecondaire}
                value={label}
                onChangeText={setLabel}
                maxLength={30}
              />
            </View>

            {/* Style Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
                Style d'affichage
              </Text>
              <View style={styles.styleOptions}>
                {STYLE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.styleOption,
                      {
                        backgroundColor:
                          style === option.value
                            ? couleurs.primaire
                            : themeColors.fondCard,
                        borderColor:
                          style === option.value
                            ? couleurs.primaire
                            : themeColors.bordure,
                      },
                    ]}
                    onPress={() => setStyle(option.value)}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={style === option.value ? couleurs.blanc : themeColors.texte}
                    />
                    <Text
                      style={[
                        styles.styleLabel,
                        {
                          color: style === option.value ? couleurs.blanc : themeColors.texte,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
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
              <Text style={styles.saveButtonText}>Ajouter le lien</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '80%',
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
  input: {
    borderWidth: 1,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    fontSize: typographie.tailles.md,
  },
  styleOptions: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  styleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacements.md,
    borderRadius: rayons.md,
    borderWidth: 1,
    gap: espacements.xs,
  },
  styleLabel: {
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
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
    fontSize: typographie.tailles.md,
    fontWeight: typographie.poids.semibold,
  },
});

export default LinkEditorSheet;
