/**
 * BriefModal — Modal pour saisir le brief avant de commander
 * S'ouvre apres clic sur "Commander" dans ProductDetailSheet
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, Modal, StyleSheet, Platform, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';

interface BriefModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (brief: string) => Promise<void>;
  serviceName: string;
  couleurs: ThemeCouleurs;
}

export default function BriefModal({ visible, onClose, onSubmit, serviceName, couleurs }: BriefModalProps) {
  const insets = useSafeAreaInsets();
  const s = createStyles(couleurs, insets);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await onSubmit(message.trim());
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  }, [message, onSubmit]);

  const handleClose = useCallback(() => {
    setMessage('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.handle} />
            <Text style={s.title}>Decrivez votre besoin</Text>
            <Text style={s.subtitle}>Pour « {serviceName} »</Text>
          </View>

          {/* Brief input */}
          <View style={s.body}>
            <Text style={s.label}>Votre message au vendeur</Text>
            <TextInput
              style={s.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Decrivez votre projet, vos besoins, vos attentes..."
              placeholderTextColor={couleurs.texteMuted}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Text style={s.counter}>{message.length}/2000</Text>

            <View style={s.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color="#7C5CFF" />
              <Text style={s.infoText}>
                Le vendeur recevra votre demande et pourra l'accepter ou la refuser.
                Vous pourrez echanger via la messagerie.
              </Text>
            </View>
          </View>

          {/* CTA */}
          <View style={s.cta}>
            <Pressable style={s.cancelBtn} onPress={handleClose}>
              <Text style={s.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                  <Text style={s.submitText}>Envoyer la demande</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (couleurs: ThemeCouleurs, insets: { bottom: number }) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: couleurs.fondCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: Math.max(insets.bottom, espacements.lg),
      maxHeight: '85%',
    },
    header: {
      alignItems: 'center',
      paddingTop: espacements.md,
      paddingBottom: espacements.lg,
      borderBottomWidth: 1,
      borderBottomColor: couleurs.bordure,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: couleurs.bordure,
      marginBottom: espacements.md,
    },
    title: { fontSize: 18, fontWeight: '700', color: couleurs.texte },
    subtitle: { fontSize: 13, color: couleurs.texteMuted, marginTop: 4 },
    body: { padding: espacements.xl },
    label: { fontSize: 14, fontWeight: '600', color: couleurs.texte, marginBottom: 8 },
    input: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      borderWidth: 1,
      borderColor: couleurs.bordure,
      padding: espacements.lg,
      fontSize: 14,
      color: couleurs.texte,
      minHeight: 120,
      maxHeight: 200,
    },
    counter: { fontSize: 11, color: couleurs.texteMuted, textAlign: 'right', marginTop: 4 },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: espacements.sm,
      backgroundColor: 'rgba(124, 92, 255, 0.08)',
      borderRadius: rayons.md,
      padding: espacements.md,
      marginTop: espacements.lg,
    },
    infoText: { flex: 1, fontSize: 12, color: couleurs.texteSecondaire, lineHeight: 18 },
    cta: {
      flexDirection: 'row',
      gap: espacements.md,
      paddingHorizontal: espacements.xl,
    },
    cancelBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: rayons.full,
      borderWidth: 1.5,
      borderColor: couleurs.bordure,
    },
    cancelText: { fontSize: 15, fontWeight: '600', color: couleurs.texteSecondaire },
    submitBtn: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: espacements.sm,
      paddingVertical: 14,
      borderRadius: rayons.full,
      backgroundColor: '#7C5CFF',
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
