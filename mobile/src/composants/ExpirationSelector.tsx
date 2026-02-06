/**
 * ExpirationSelector - Selecteur de duree de vie pour stories
 * Pills horizontaux pour choisir combien de temps la story reste en ligne
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements, typographie, rayons } from '../constantes/theme';
import { useTheme } from '../contexts/ThemeContext';

// Durees disponibles en minutes
export type ExpirationMinutes = 7 | 15 | 60 | 360 | 1440;

interface ExpirationOption {
  value: ExpirationMinutes;
  label: string;
  description: string;
}

const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { value: 7, label: '7 min', description: 'Ephemere' },
  { value: 15, label: '15 min', description: 'Court' },
  { value: 60, label: '1h', description: 'Moyen' },
  { value: 360, label: '6h', description: 'Long' },
  { value: 1440, label: '24h', description: 'Standard' },
];

interface ExpirationSelectorProps {
  value: ExpirationMinutes;
  onChange: (minutes: ExpirationMinutes) => void;
}

const ExpirationSelector: React.FC<ExpirationSelectorProps> = ({ value, onChange }) => {
  const { couleurs: themeColors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name="time-outline" size={18} color={themeColors.texteSecondaire} />
        <Text style={[styles.label, { color: themeColors.texteSecondaire }]}>
          Duree de vie
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsContainer}
      >
        {EXPIRATION_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected
                    ? couleurs.primaire
                    : themeColors.fondCard,
                  borderColor: isSelected
                    ? couleurs.primaire
                    : themeColors.bordure,
                },
              ]}
              onPress={() => onChange(option.value)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected ? couleurs.blanc : themeColors.texte,
                    fontWeight: isSelected
                      ? typographie.poids.bold
                      : typographie.poids.medium,
                  },
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.optionDescription,
                  {
                    color: isSelected ? 'rgba(255,255,255,0.8)' : themeColors.texteSecondaire,
                  },
                ]}
              >
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: espacements.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    marginBottom: espacements.sm,
    marginLeft: espacements.xs,
  },
  label: {
    fontSize: typographie.tailles.sm,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: espacements.sm,
    paddingRight: espacements.md,
  },
  option: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    borderRadius: rayons.lg,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: typographie.tailles.sm,
  },
  optionDescription: {
    fontSize: typographie.tailles.xs,
    marginTop: 2,
  },
});

export default ExpirationSelector;
