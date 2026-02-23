/**
 * BoostGoalCard — Carte objectif de mise en avant
 * Design epure : icone + titre + sous-titre + chevron
 * Pas de prix visible — le prix apparait dans le flow
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import type { BoostGoal } from '../services/boutique';

interface BoostGoalCardProps {
  goal: BoostGoal;
  onPress: (goal: BoostGoal) => void;
  couleurs: ThemeCouleurs;
}

export default memo(function BoostGoalCard({ goal, onPress, couleurs }: BoostGoalCardProps) {
  const s = createStyles(couleurs);

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
      onPress={() => onPress(goal)}
    >
      <View style={[s.iconCircle, { backgroundColor: `${goal.color}12` }]}>
        <Ionicons name={goal.icon as any} size={22} color={goal.color} />
      </View>
      <View style={s.info}>
        <Text style={s.titre}>{goal.titre}</Text>
        <Text style={s.sousTitre}>{goal.sousTitre}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
    </Pressable>
  );
});

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      padding: espacements.lg,
      marginBottom: espacements.sm,
      gap: espacements.md,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
    },
    titre: {
      fontSize: 15,
      fontWeight: '600',
      color: couleurs.texte,
    },
    sousTitre: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 2,
    },
  });
