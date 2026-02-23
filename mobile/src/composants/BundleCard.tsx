/**
 * BundleCard — Carte pack combine
 * Affiche le contenu du pack, prix barre, prix pack, badge economie
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import type { BoostBundle } from '../services/boutique';
import { formatPrice } from '../services/boutique';

interface BundleCardProps {
  bundle: BoostBundle;
  onPress: (bundle: BoostBundle) => void;
  lppPlusPrice?: number;
  couleurs: ThemeCouleurs;
}

export default memo(function BundleCard({ bundle, onPress, lppPlusPrice, couleurs }: BundleCardProps) {
  const s = createStyles(couleurs);

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
      onPress={() => onPress(bundle)}
    >
      <View style={s.header}>
        <View style={[s.iconCircle, { backgroundColor: `${bundle.color}12` }]}>
          <Ionicons name={bundle.icon as any} size={20} color={bundle.color} />
        </View>
        <View style={s.headerInfo}>
          <Text style={s.titre}>{bundle.titre}</Text>
          <Text style={s.description}>{bundle.description}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: `${bundle.color}15` }]}>
          <Text style={[s.badgeText, { color: bundle.color }]}>-{bundle.economie}%</Text>
        </View>
      </View>

      <View style={s.contenuList}>
        {bundle.contenu.map((item, i) => (
          <View key={i} style={s.contenuItem}>
            <Ionicons name="checkmark" size={14} color={bundle.color} />
            <Text style={s.contenuText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={s.priceRow}>
        <Text style={s.prixBarre}>{formatPrice(bundle.prixSepare)}</Text>
        <Text style={[s.prixPack, { color: bundle.color }]}>{formatPrice(lppPlusPrice ?? bundle.prixPack)}</Text>
      </View>
    </Pressable>
  );
});

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    card: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      padding: espacements.lg,
      marginBottom: espacements.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
      marginBottom: espacements.md,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerInfo: {
      flex: 1,
    },
    titre: {
      fontSize: 15,
      fontWeight: '700',
      color: couleurs.texte,
    },
    description: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 1,
    },
    badge: {
      borderRadius: rayons.full,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    contenuList: {
      gap: 6,
      marginBottom: espacements.md,
    },
    contenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
    },
    contenuText: {
      fontSize: 13,
      color: couleurs.texteSecondaire,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: espacements.sm,
    },
    prixBarre: {
      fontSize: 14,
      color: couleurs.texteMuted,
      textDecorationLine: 'line-through',
    },
    prixPack: {
      fontSize: 18,
      fontWeight: '800',
    },
  });
