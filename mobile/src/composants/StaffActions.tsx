/**
 * Composant d'actions staff pour la modération
 * Affiche un bottom sheet avec les actions de modération disponibles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStaff } from '../hooks/useStaff';
import * as moderation from '../services/moderation';

// Types
type TargetType = 'user' | 'publication' | 'commentaire';

interface StaffActionsProps {
  visible: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  targetName?: string;
  onActionComplete?: () => void;
}

interface ActionButton {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  permission?: string;
  action: () => void;
}

export const StaffActions: React.FC<StaffActionsProps> = ({
  visible,
  onClose,
  targetType,
  targetId,
  targetName = '',
  onActionComplete,
}) => {
  const staff = useStaff();
  const [loading, setLoading] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(24);

  if (!staff.isStaff) return null;

  const handleAction = async (action: string) => {
    if (['warn', 'suspend', 'ban', 'hide', 'delete'].includes(action)) {
      setCurrentAction(action);
      setShowReasonInput(true);
      return;
    }

    // Actions sans raison obligatoire
    await executeAction(action);
  };

  const executeAction = async (action: string, providedReason?: string) => {
    const actionReason = providedReason || reason;

    if (['warn', 'suspend', 'ban', 'hide', 'delete'].includes(action) && !actionReason.trim()) {
      Alert.alert('Erreur', 'Une raison est requise pour cette action.');
      return;
    }

    setLoading(true);
    try {
      let result;

      switch (action) {
        // Actions utilisateur
        case 'warn':
          result = await moderation.warnUser(targetId, { reason: actionReason });
          break;
        case 'suspend':
          result = await moderation.suspendUser(targetId, {
            reason: actionReason,
            durationHours: selectedDuration,
          });
          break;
        case 'ban':
          result = await moderation.banUser(targetId, { reason: actionReason });
          break;
        case 'unban':
          result = await moderation.unbanUser(targetId);
          break;
        case 'unsuspend':
          result = await moderation.unsuspendUser(targetId);
          break;

        // Actions contenu
        case 'hide':
          result = await moderation.hidePublication(targetId, { reason: actionReason });
          break;
        case 'unhide':
          result = await moderation.unhidePublication(targetId);
          break;
        case 'delete':
          if (targetType === 'commentaire') {
            result = await moderation.deleteCommentaire(targetId, { reason: actionReason });
          } else {
            result = await moderation.deletePublication(targetId, { reason: actionReason });
          }
          break;
      }

      if (result?.succes) {
        Alert.alert('Succès', result.message || 'Action effectuée avec succès.');
        resetState();
        onClose();
        onActionComplete?.();
      } else {
        Alert.alert('Erreur', result?.message || 'Une erreur est survenue.');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setShowReasonInput(false);
    setCurrentAction(null);
    setReason('');
    setSelectedDuration(24);
  };

  const confirmAction = (action: string, message: string) => {
    Alert.alert(
      'Confirmation',
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: () => executeAction(action) },
      ]
    );
  };

  // Boutons d'action selon le type de cible
  const getUserActions = (): ActionButton[] => {
    const actions: ActionButton[] = [];

    if (staff.canWarnUsers) {
      actions.push({
        id: 'warn',
        label: 'Avertir',
        icon: 'warning-outline',
        color: '#f59e0b',
        action: () => handleAction('warn'),
      });
    }

    if (staff.canSuspendUsers) {
      actions.push({
        id: 'suspend',
        label: 'Suspendre',
        icon: 'time-outline',
        color: '#f97316',
        action: () => handleAction('suspend'),
      });
      actions.push({
        id: 'unsuspend',
        label: 'Lever suspension',
        icon: 'checkmark-circle-outline',
        color: '#22c55e',
        action: () => confirmAction('unsuspend', 'Lever la suspension de cet utilisateur ?'),
      });
    }

    if (staff.canBanUsers) {
      actions.push({
        id: 'ban',
        label: 'Bannir',
        icon: 'ban-outline',
        color: '#ef4444',
        action: () => handleAction('ban'),
      });
    }

    if (staff.canUnbanUsers) {
      actions.push({
        id: 'unban',
        label: 'Débannir',
        icon: 'shield-checkmark-outline',
        color: '#22c55e',
        action: () => confirmAction('unban', 'Débannir cet utilisateur ?'),
      });
    }

    return actions;
  };

  const getContentActions = (): ActionButton[] => {
    const actions: ActionButton[] = [];

    if (staff.canHideContent) {
      actions.push({
        id: 'hide',
        label: 'Masquer',
        icon: 'eye-off-outline',
        color: '#f59e0b',
        action: () => handleAction('hide'),
      });
      actions.push({
        id: 'unhide',
        label: 'Réafficher',
        icon: 'eye-outline',
        color: '#22c55e',
        action: () => confirmAction('unhide', 'Réafficher ce contenu ?'),
      });
    }

    if (staff.canDeleteContent) {
      actions.push({
        id: 'delete',
        label: 'Supprimer',
        icon: 'trash-outline',
        color: '#ef4444',
        action: () => handleAction('delete'),
      });
    }

    return actions;
  };

  const actions = targetType === 'user' ? getUserActions() : getContentActions();

  // Rendu de l'input de raison
  const renderReasonInput = () => (
    <View style={styles.reasonContainer}>
      <Text style={styles.reasonTitle}>
        {currentAction === 'warn' && 'Avertir l\'utilisateur'}
        {currentAction === 'suspend' && 'Suspendre l\'utilisateur'}
        {currentAction === 'ban' && 'Bannir l\'utilisateur'}
        {currentAction === 'hide' && 'Masquer le contenu'}
        {currentAction === 'delete' && 'Supprimer le contenu'}
      </Text>

      {currentAction === 'suspend' && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationLabel}>Durée de suspension :</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {moderation.SUSPENSION_DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.hours}
                style={[
                  styles.durationChip,
                  selectedDuration === d.hours && styles.durationChipActive,
                ]}
                onPress={() => setSelectedDuration(d.hours)}
              >
                <Text
                  style={[
                    styles.durationChipText,
                    selectedDuration === d.hours && styles.durationChipTextActive,
                  ]}
                >
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TextInput
        style={styles.reasonInput}
        placeholder="Raison de l'action (obligatoire)"
        placeholderTextColor="#9ca3af"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={styles.reasonActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={resetState}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.buttonDisabled]}
          onPress={() => executeAction(currentAction!)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirmer</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <Ionicons name="shield" size={16} color="#6366f1" />
              <Text style={styles.headerBadgeText}>MODÉRATION</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {targetName && (
            <Text style={styles.targetName} numberOfLines={1}>
              {targetType === 'user' ? 'Utilisateur' : 'Contenu'}: {targetName}
            </Text>
          )}

          {/* Contenu */}
          {showReasonInput ? (
            renderReasonInput()
          ) : (
            <View style={styles.actionsGrid}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionButton}
                  onPress={action.action}
                  disabled={loading}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
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
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  targetName: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 20,
    gap: 12,
  },
  actionButton: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    color: '#e5e7eb',
    fontSize: 12,
    textAlign: 'center',
  },
  reasonContainer: {
    paddingTop: 20,
  },
  reasonTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  durationContainer: {
    marginBottom: 16,
  },
  durationLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#374151',
    borderRadius: 20,
    marginRight: 8,
  },
  durationChipActive: {
    backgroundColor: '#6366f1',
  },
  durationChipText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  durationChipTextActive: {
    color: '#fff',
  },
  reasonInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
  },
  reasonActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#374151',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default StaffActions;
