/**
 * BoostOfferCard — Carte de mise en avant
 * Affiche une offre boost avec les 2 options de duree cote a cote
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import type { BoostOffer } from '../services/boutique';
import { formatPrice, formatEstimate } from '../services/boutique';

interface BoostOfferCardProps {
  offer: BoostOffer;
  onPress: (offer: BoostOffer) => void;
  couleurs: ThemeCouleurs;
}

export default memo(function BoostOfferCard({ offer, onPress, couleurs }: BoostOfferCardProps) {
  const s = createStyles(couleurs);

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
      onPress={() => onPress(offer)}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={[s.iconCircle, { backgroundColor: `${offer.color}12` }]}>
          <Ionicons name={offer.icon as any} size={20} color={offer.color} />
        </View>
        <View style={s.headerInfo}>
          <Text style={s.title}>{offer.titre}</Text>
          <Text style={s.subtitle}>{offer.sousTitre}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
      </View>

      {/* Duration options side by side */}
      <View style={s.durationsRow}>
        {offer.durations.map(dur => (
          <View key={dur.id} style={[s.durationOption, { borderColor: `${offer.color}25` }]}>
            <Text style={s.durationLabel}>{dur.label}</Text>
            <Text style={[s.durationPrice, { color: offer.color }]}>{formatPrice(dur.prix)}</Text>
            <Text style={s.durationEstimate}>
              {formatEstimate(dur.estimateMin, dur.estimateMax)} {dur.estimateUnit}
            </Text>
          </View>
        ))}
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
      marginBottom: espacements.md,
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
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: couleurs.texte,
    },
    subtitle: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
    durationsRow: {
      flexDirection: 'row',
      gap: espacements.md,
    },
    durationOption: {
      flex: 1,
      backgroundColor: couleurs.fond,
      borderRadius: rayons.md,
      borderWidth: 1,
      padding: espacements.md,
      alignItems: 'center',
    },
    durationLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: couleurs.texte,
      marginBottom: 4,
    },
    durationPrice: {
      fontSize: 17,
      fontWeight: '800',
      marginBottom: 4,
    },
    durationEstimate: {
      fontSize: 11,
      color: couleurs.texteMuted,
    },
  });
