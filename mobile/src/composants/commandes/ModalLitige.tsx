/**
 * ModalLitige — Bottom sheet pour saisir la raison du litige
 * Pattern identique a ModalProlongation
 */
import React, { memo, useState, useCallback } from 'react';
import {
  View, Text, Pressable, TextInput, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (raison: string) => Promise<void>;
  couleurs: ThemeCouleurs;
}

function ModalLitige({ visible, onClose, onConfirm, couleurs }: Props) {
  const [raison, setRaison] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setRaison('');
    setLoading(false);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleConfirm = useCallback(async () => {
    if (raison.trim().length < 10) {
      setError('Decrivez le probleme en au moins 10 caracteres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onConfirm(raison.trim());
      handleClose();
    } catch {
      setError("Erreur lors de l'ouverture du litige");
      setLoading(false);
    }
  }, [raison, onConfirm, handleClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable style={[styles.sheet, { backgroundColor: couleurs.fondCard }]} onPress={e => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={[styles.handle, { backgroundColor: couleurs.bordure }]} />

            {/* Icon */}
            <View style={styles.iconRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
              </View>
            </View>

            <Text style={[styles.title, { color: couleurs.texte }]}>Signaler un probleme</Text>
            <Text style={[styles.subtitle, { color: couleurs.texteMuted }]}>
              Expliquez le probleme rencontre. Un moderateur LPP interviendra pour trouver une solution.
            </Text>

            {/* Raison */}
            <TextInput
              style={[styles.reasonInput, {
                color: couleurs.texte,
                borderColor: error ? '#EF4444' : couleurs.bordure,
                backgroundColor: couleurs.fond,
              }]}
              value={raison}
              onChangeText={(t) => { setRaison(t); if (error) setError(''); }}
              placeholder="Decrivez le probleme en detail..."
              placeholderTextColor={couleurs.texteMuted}
              maxLength={500}
              multiline
              textAlignVertical="top"
              editable={!loading}
            />

            <Text style={[styles.charCount, { color: couleurs.texteMuted }]}>
              {raison.length}/500
            </Text>

            {/* Error */}
            {!!error && (
              <Text style={styles.error}>{error}</Text>
            )}

            {/* Buttons */}
            <View style={styles.buttonsRow}>
              <Pressable
                style={[styles.cancelBtn, { borderColor: couleurs.bordure }]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={[styles.cancelText, { color: couleurs.texteMuted }]}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, (raison.trim().length < 10 || loading) && { opacity: 0.5 }]}
                onPress={handleConfirm}
                disabled={raison.trim().length < 10 || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-half-outline" size={16} color="#fff" />
                    <Text style={styles.confirmText}>Ouvrir le litige</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export default memo(ModalLitige);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: espacements.lg,
    paddingBottom: 40,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: espacements.md,
  },
  iconRow: {
    alignItems: 'center', marginBottom: espacements.sm,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EF444415',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, marginBottom: espacements.md, textAlign: 'center', lineHeight: 18 },
  reasonInput: {
    borderWidth: 1, borderRadius: rayons.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4, marginBottom: espacements.sm },
  error: { color: '#EF4444', fontSize: 12, marginBottom: espacements.sm },
  buttonsRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderRadius: rayons.md,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 1, backgroundColor: '#EF4444', borderRadius: rayons.md,
    paddingVertical: 12, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
