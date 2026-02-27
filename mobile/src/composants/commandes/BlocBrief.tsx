/**
 * BlocBrief — Affiche le brief de l'acheteur dans le detail commande
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../../contexts/ThemeContext';
import { espacements, rayons } from '../../constantes/theme';
import type { OrderBuyerBrief } from '../../types/boutique';

interface Props {
  brief: OrderBuyerBrief;
  couleurs: ThemeCouleurs;
}

function BlocBrief({ brief, couleurs }: Props) {
  const s = createStyles(couleurs);

  if (!brief?.message) return null;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Ionicons name="document-text-outline" size={16} color="#7C5CFF" />
        <Text style={s.title}>Brief acheteur</Text>
      </View>
      <Text style={s.message}>{brief.message}</Text>
      {brief.attachments?.length > 0 && (
        <View style={s.attachments}>
          {brief.attachments.map((a, i) => (
            <View key={i} style={s.attachment}>
              <Ionicons name="attach" size={14} color={couleurs.texteSecondaire} />
              <Text style={s.attachmentName} numberOfLines={1}>{a.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default memo(BlocBrief);

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    container: {
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      padding: espacements.lg,
      marginBottom: espacements.lg,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: espacements.md },
    title: { fontSize: 15, fontWeight: '700', color: couleurs.texte },
    message: { fontSize: 14, color: couleurs.texte, lineHeight: 22 },
    attachments: { marginTop: espacements.md, gap: 6 },
    attachment: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: couleurs.fondCard, borderRadius: rayons.sm,
      padding: espacements.sm,
    },
    attachmentName: { fontSize: 12, color: couleurs.texteSecondaire, flex: 1 },
  });
