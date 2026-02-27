/**
 * BlocDeadline — Countdown live + historique extensions
 * 3 etats visuels : normal (bleu), urgent <24h (orange), en retard (rouge)
 */
import React, { memo, useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';
import type { OrderDeadline } from '../../types/boutique';

interface Props {
  deadline: OrderDeadline;
  isVendeur: boolean;
  onProlonger?: () => void;
  couleurs: ThemeCouleurs;
}

const SEUIL_URGENT = 24 * 3600; // 24h en secondes

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0h 00m';
  const jours = Math.floor(totalSeconds / 86400);
  const heures = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (jours > 0) return `${jours}j ${heures}h`;
  if (heures > 0) return `${heures}h ${String(minutes).padStart(2, '0')}m`;
  const secs = totalSeconds % 60;
  return `${minutes}m ${String(secs).padStart(2, '0')}s`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDureeExtension(seconds: number): string {
  if (seconds >= 86400) {
    const jours = Math.round(seconds / 86400);
    return `+${jours}j`;
  }
  const heures = Math.round(seconds / 3600);
  return `+${heures}h`;
}

function BlocDeadline({ deadline, isVendeur, onProlonger, couleurs }: Props) {
  const [remaining, setRemaining] = useState(deadline.remainingSeconds);
  const [showHistory, setShowHistory] = useState(false);

  // Countdown live
  useEffect(() => {
    setRemaining(deadline.remainingSeconds);
    if (!deadline.deadlineActive) return;

    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline.remainingSeconds, deadline.deadlineActive]);

  const isLate = deadline.isLate || remaining <= 0;
  const isUrgent = !isLate && remaining > 0 && remaining < SEUIL_URGENT;

  // Couleurs selon etat
  const accent = isLate ? '#EF4444' : isUrgent ? '#F59E0B' : '#3B82F6';
  const bgAccent = isLate ? '#EF444415' : isUrgent ? '#F59E0B15' : '#3B82F615';
  const iconName = isLate ? 'alert-circle' : isUrgent ? 'warning-outline' : 'timer-outline';

  const extensions = deadline.extensions || [];
  const history = deadline.deadlineHistory || [];

  return (
    <View style={[styles.container, { backgroundColor: couleurs.fondCard, borderColor: accent + '30' }]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: bgAccent }]}>
          <Ionicons name={iconName as any} size={18} color={accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.label, { color: couleurs.texteMuted }]}>
            {isLate ? 'En retard' : deadline.deadlineActive ? 'Delai de livraison' : 'Delai termine'}
          </Text>
          {deadline.deadlineActive ? (
            <Text style={[styles.countdown, { color: accent }]}>
              {isLate ? 'Depasse' : formatCountdown(remaining)}
            </Text>
          ) : (
            <Text style={[styles.countdown, { color: couleurs.texteMuted }]}>
              {isLate ? 'Depasse' : 'Livre'}
            </Text>
          )}
        </View>
        {isVendeur && deadline.deadlineActive && onProlonger && (
          <Pressable
            style={[styles.prolongerBtn, { borderColor: accent + '40' }]}
            onPress={onProlonger}
          >
            <Ionicons name="add-circle-outline" size={14} color={accent} />
            <Text style={[styles.prolongerText, { color: accent }]}>Prolonger</Text>
          </Pressable>
        )}
      </View>

      {/* Date deadline */}
      {deadline.currentDeadlineAt && (
        <Text style={[styles.deadlineDate, { color: couleurs.texteMuted }]}>
          Deadline : {formatDate(deadline.currentDeadlineAt)}
        </Text>
      )}

      {/* Historique extensions */}
      {history.length > 0 && (
        <>
          <Pressable
            style={styles.historyToggle}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Text style={[styles.historyToggleText, { color: couleurs.texteMuted }]}>
              {extensions.length} extension{extensions.length > 1 ? 's' : ''}
            </Text>
            <Ionicons
              name={showHistory ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={couleurs.texteMuted}
            />
          </Pressable>
          {showHistory && history.map((h, i) => (
            <View key={i} style={[styles.historyItem, { borderTopColor: couleurs.bordure }]}>
              <Text style={[styles.historyText, { color: couleurs.texteMuted }]}>
                {formatDureeExtension(extensions[i]?.secondsAdded || 0)} — {formatDate(h.createdAt)}
              </Text>
              {h.reason && (
                <Text style={[styles.historyReason, { color: couleurs.texteMuted }]}>{h.reason}</Text>
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export default memo(BlocDeadline);

const styles = StyleSheet.create({
  container: {
    borderRadius: rayons.lg,
    padding: espacements.md,
    marginBottom: espacements.md,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.sm,
  },
  iconWrap: {
    width: 32, height: 32,
    borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1 },
  label: { fontSize: 12, fontWeight: '500' },
  countdown: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  prolongerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: rayons.sm,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  prolongerText: { fontSize: 12, fontWeight: '600' },
  deadlineDate: { fontSize: 12, marginTop: 8 },
  historyToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: espacements.sm,
  },
  historyToggleText: { fontSize: 12, fontWeight: '500' },
  historyItem: {
    paddingTop: 6, marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  historyText: { fontSize: 11 },
  historyReason: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
});
