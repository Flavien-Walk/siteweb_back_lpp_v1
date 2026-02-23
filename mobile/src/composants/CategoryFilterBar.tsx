/**
 * CategoryFilterBar — Barre horizontale de filtres par categorie
 * Utilise dans l'onglet Explorer de la Marketplace
 */

import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import type { MarketplaceCategoryItem, MarketplaceCategory } from '../services/boutique';

interface CategoryFilterBarProps {
  categories: MarketplaceCategoryItem[];
  selected: MarketplaceCategory;
  onSelect: (category: MarketplaceCategory) => void;
}

export default function CategoryFilterBar({ categories, selected, onSelect }: CategoryFilterBarProps) {
  const { couleurs } = useTheme();
  const s = createStyles(couleurs);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.container}
      style={s.scroll}
    >
      {categories.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <Pressable
            key={cat.id}
            style={[s.pill, isActive && s.pillActive]}
            onPress={() => onSelect(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={isActive ? '#fff' : couleurs.texteSecondaire}
            />
            <Text style={[s.pillText, isActive && s.pillTextActive]}>
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    scroll: {
      marginBottom: espacements.lg,
    },
    container: {
      gap: espacements.sm,
      paddingRight: espacements.sm,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.full,
      paddingVertical: 8,
      paddingHorizontal: espacements.md,
    },
    pillActive: {
      backgroundColor: '#7C5CFF',
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: couleurs.texteSecondaire,
    },
    pillTextActive: {
      color: '#fff',
    },
  });
