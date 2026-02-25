/**
 * DurationSelector - Sélecteur de durée pour stories
 * Pills horizontaux pour choisir la durée d'affichage (5s/7s/10s/15s)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { espacements, typographie, rayons } from '../constantes/theme';
import { useTheme, ThemeCouleurs } from '../contexts/ThemeContext';

export type StoryDuration = 5 | 7 | 10 | 15;

const DURATIONS: StoryDuration[] = [5, 7, 10, 15];

interface DurationSelectorProps {
  value: StoryDuration;
  onChange: (duration: StoryDuration) => void;
}

const DurationSelector: React.FC<DurationSelectorProps> = ({ value, onChange }) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: couleurs.texteSecondaire }]}>
        Durée d'affichage
      </Text>
      <View style={styles.pillsContainer}>
        {DURATIONS.map((duration) => {
          const isSelected = value === duration;
          return (
            <Pressable
              key={duration}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected
                    ? couleurs.primaire
                    : couleurs.fondCard,
                  borderColor: isSelected
                    ? couleurs.primaire
                    : couleurs.bordure,
                },
              ]}
              onPress={() => onChange(duration)}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isSelected ? couleurs.blanc : couleurs.texte,
                    fontWeight: isSelected
                      ? typographie.poids.semibold
                      : typographie.poids.normal,
                  },
                ]}
              >
                {duration}s
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    marginVertical: espacements.md,
  },
  label: {
    fontSize: typographie.tailles.sm,
    marginBottom: espacements.sm,
    marginLeft: espacements.xs,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: espacements.sm,
  },
  pill: {
    paddingHorizontal: espacements.lg,
    paddingVertical: espacements.sm,
    borderRadius: rayons.full,
    borderWidth: 1,
    minWidth: 52,
    alignItems: 'center',
  },
  pillText: {
    fontSize: typographie.tailles.sm,
  },
});

export default DurationSelector;
