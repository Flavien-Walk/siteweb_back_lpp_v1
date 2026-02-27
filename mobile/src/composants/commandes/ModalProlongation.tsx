/**
 * ModalProlongation — Bottom sheet pour prolonger la deadline
 * Choix rapides (1j, 2j, 3j) + custom + raison optionnelle
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
  onConfirm: (secondsAdded: number, reason?: string) => Promise<void>;
  couleurs: ThemeCouleurs;
}

const CHOIX_RAPIDES = [
  { label: '+1 jour', seconds: 86400 },
  { label: '+2 jours', seconds: 172800 },
  { label: '+3 jours', seconds: 259200 },
];

function ModalProlongation({ visible, onClose, onConfirm, couleurs }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [customJours, setCustomJours] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setSelected(null);
    setCustomJours('');
    setIsCustom(false);
    setReason('');
    setLoading(false);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const getSeconds = (): number | null => {
    if (isCustom) {
      const jours = parseFloat(customJours);
      if (isNaN(jours) || jours < 0.04 || jours > 7) return null; // min ~1h
      return Math.round(jours * 86400);
    }
    return selected;
  };

  const handleConfirm = useCallback(async () => {
    const seconds = getSeconds();
    if (!seconds) {
      setError(isCustom ? 'Entrez un nombre entre 1 et 7 jours' : 'Selectionnez une duree');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onConfirm(seconds, reason.trim() || undefined);
      handleClose();
    } catch {
      setError('Erreur lors de la prolongation');
      setLoading(false);
    }
  }, [selected, customJours, isCustom, reason, onConfirm, handleClose]);

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

            <Text style={[styles.title, { color: couleurs.texte }]}>Prolonger le delai</Text>
            <Text style={[styles.subtitle, { color: couleurs.texteMuted }]}>
              Choisissez la duree supplementaire
            </Text>

            {/* Choix rapides */}
            <View style={styles.choixRow}>
              {CHOIX_RAPIDES.map(c => (
                <Pressable
                  key={c.seconds}
                  style={[
                    styles.choixChip,
                    { borderColor: couleurs.bordure },
                    !isCustom && selected === c.seconds && styles.choixChipActive,
                  ]}
                  onPress={() => { setSelected(c.seconds); setIsCustom(false); setError(''); }}
                >
                  <Text style={[
                    styles.choixText,
                    { color: couleurs.texteMuted },
                    !isCustom && selected === c.seconds && styles.choixTextActive,
                  ]}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={[
                  styles.choixChip,
                  { borderColor: couleurs.bordure },
                  isCustom && styles.choixChipActive,
                ]}
                onPress={() => { setIsCustom(true); setSelected(null); setError(''); }}
              >
                <Text style={[
                  styles.choixText,
                  { color: couleurs.texteMuted },
                  isCustom && styles.choixTextActive,
                ]}>
                  Autre
                </Text>
              </Pressable>
            </View>

            {/* Input custom */}
            {isCustom && (
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.customInput, { color: couleurs.texte, borderColor: couleurs.bordure, backgroundColor: couleurs.fond }]}
                  value={customJours}
                  onChangeText={t => { setCustomJours(t); setError(''); }}
                  placeholder="Nombre de jours (1-7)"
                  placeholderTextColor={couleurs.texteMuted}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            )}

            {/* Raison */}
            <TextInput
              style={[styles.reasonInput, { color: couleurs.texte, borderColor: couleurs.bordure, backgroundColor: couleurs.fond }]}
              value={reason}
              onChangeText={setReason}
              placeholder="Raison (optionnel)"
              placeholderTextColor={couleurs.texteMuted}
              maxLength={200}
              multiline
            />

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
                style={[styles.confirmBtn, loading && { opacity: 0.6 }]}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="timer-outline" size={16} color="#fff" />
                    <Text style={styles.confirmText}>Prolonger</Text>
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

export default memo(ModalProlongation);

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
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: espacements.md },
  choixRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, marginBottom: espacements.md,
  },
  choixChip: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: rayons.full, borderWidth: 1,
  },
  choixChipActive: { backgroundColor: 'rgba(124,92,255,0.15)', borderColor: '#7C5CFF' },
  choixText: { fontSize: 13, fontWeight: '500' },
  choixTextActive: { color: '#7C5CFF', fontWeight: '600' },
  customRow: { marginBottom: espacements.md },
  customInput: {
    borderWidth: 1, borderRadius: rayons.md,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14,
  },
  reasonInput: {
    borderWidth: 1, borderRadius: rayons.md,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: espacements.md,
  },
  error: { color: '#EF4444', fontSize: 12, marginBottom: espacements.sm },
  buttonsRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderRadius: rayons.md,
    paddingVertical: 12, alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 1, backgroundColor: '#7C5CFF', borderRadius: rayons.md,
    paddingVertical: 12, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
