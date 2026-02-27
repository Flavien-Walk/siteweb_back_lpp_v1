/**
 * BlocAvancement — Affiche les mises a jour d'avancement
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';
import type { OrderProgressUpdate } from '../../types/boutique';

interface Props {
  updates: OrderProgressUpdate[];
  couleurs: ThemeCouleurs;
}

function BlocAvancement({ updates, couleurs }: Props) {
  const s = createStyles(couleurs);

  if (!updates || updates.length === 0) return null;

  const dernierPercent = updates[updates.length - 1].percent;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="trending-up-outline" size={16} color="#3B82F6" />
        <Text style={s.title}>Avancement</Text>
        <Text style={s.percent}>{dernierPercent}%</Text>
      </View>

      {/* Progress bar */}
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${dernierPercent}%` }]} />
      </View>

      {/* Updates */}
      {updates.map((u, i) => (
        <View key={u._id || i} style={s.update}>
          <View style={s.dot} />
          <View style={s.updateContent}>
            <Text style={s.updateTitle}>{u.title}</Text>
            {!!u.message && <Text style={s.updateMessage}>{u.message}</Text>}
            <Text style={s.updateDate}>
              {new Date(u.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default memo(BlocAvancement);

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.lg,
      marginBottom: espacements.lg,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: espacements.md },
    title: { fontSize: 15, fontWeight: '700', color: couleurs.texte, flex: 1 },
    percent: { fontSize: 15, fontWeight: '800', color: '#3B82F6' },
    barBg: {
      height: 6, borderRadius: 3,
      backgroundColor: couleurs.bordure,
      marginBottom: espacements.lg,
    },
    barFill: { height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
    update: { flexDirection: 'row', gap: 10, marginBottom: espacements.md },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6', marginTop: 5 },
    updateContent: { flex: 1 },
    updateTitle: { fontSize: 13, fontWeight: '600', color: couleurs.texte },
    updateMessage: { fontSize: 12, color: couleurs.texteSecondaire, marginTop: 2 },
    updateDate: { fontSize: 11, color: couleurs.texteMuted, marginTop: 4 },
  });
