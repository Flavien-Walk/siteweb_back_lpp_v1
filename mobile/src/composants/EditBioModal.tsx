/**
 * EditBioModal - Bottom-sheet de modification de bio
 *
 * Bottom-sheet colle en bas de l'ecran :
 * - L'overlay (KAV) est flex:1 + justifyContent:'flex-end' → la card est poussee en bas
 * - Le paddingBottom (insets.bottom) est DANS la card, pas sur l'overlay,
 *   pour que la card touche le bord inferieur sans flotter
 * - behavior="height" (Android) reduit la hauteur du KAV quand le clavier s'ouvre,
 *   ce qui remonte la card au-dessus du clavier
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';

const MAX_BIO_LENGTH = 150;

interface EditBioModalProps {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (bio: string) => void;
  loading?: boolean;
}

export default function EditBioModal({
  visible,
  initialValue,
  onClose,
  onSave,
  loading = false,
}: EditBioModalProps) {
  const { couleurs } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    if (visible) {
      setText(initialValue);
    }
  }, [visible, initialValue]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* KAV : flex-end colle la card en bas, behavior height remonte au clavier */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop plein ecran */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Bottom-sheet : touche le bas de l'ecran, padding interne pour nav bar */}
        <View
          style={[
            styles.sheet,
            { backgroundColor: couleurs.fondSecondaire },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: couleurs.bordure }]}>
            <Text style={[styles.title, { color: couleurs.texte }]}>
              Modifier la bio
            </Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={couleurs.texte} />
            </Pressable>
          </View>

          {/* Contenu scrollable */}
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.description, { color: couleurs.texteSecondaire }]}>
              Decrivez-vous en quelques mots pour que les autres membres puissent
              mieux vous connaitre.
            </Text>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: couleurs.fond,
                  borderColor: couleurs.bordure,
                  color: couleurs.texte,
                },
              ]}
              value={text}
              onChangeText={setText}
              placeholder="Votre bio..."
              placeholderTextColor={couleurs.texteSecondaire}
              multiline
              numberOfLines={4}
              maxLength={MAX_BIO_LENGTH}
            />

            <Text style={[styles.charCount, { color: couleurs.texteSecondaire }]}>
              {text.length}/{MAX_BIO_LENGTH} caracteres
            </Text>
          </ScrollView>

          {/* Footer : bouton au-dessus de la nav bar, fond du sheet colle au bord */}
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: couleurs.primaire,
                marginBottom: Math.max(insets.bottom, espacements.md),
              },
              loading && styles.buttonDisabled,
            ]}
            onPress={() => onSave(text)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={couleurs.blanc} />
            ) : (
              <Text style={[styles.buttonText, { color: couleurs.blanc }]}>
                Enregistrer
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    paddingHorizontal: espacements.lg,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: espacements.lg,
    borderBottomWidth: 1,
    marginBottom: espacements.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: espacements.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: rayons.md,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.md,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: espacements.xs,
    marginBottom: espacements.sm,
  },
  button: {
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacements.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
