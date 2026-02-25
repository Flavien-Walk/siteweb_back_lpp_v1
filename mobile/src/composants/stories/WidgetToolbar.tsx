/**
 * WidgetToolbar - Barre d'outils pour ajouter des widgets sur les stories
 */

import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { espacements, rayons, typographie } from '../../constantes/theme';
import { useTheme, ThemeCouleurs } from '../../contexts/ThemeContext';
import { StoryWidgetType } from '../../types/storyWidgets';

interface WidgetOption {
  type: StoryWidgetType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const WIDGET_OPTIONS: WidgetOption[] = [
  { type: 'text', icon: 'text', label: 'Texte' },
  { type: 'link', icon: 'link', label: 'Lien' },
  { type: 'emoji', icon: 'happy-outline', label: 'Emoji' },
  { type: 'time', icon: 'time-outline', label: 'Heure' },
  { type: 'location', icon: 'location-outline', label: 'Lieu' },
  { type: 'mention', icon: 'at', label: 'Mention' },
];

interface WidgetToolbarProps {
  onAddWidget: (type: StoryWidgetType) => void;
  disabled?: boolean;
}

const WidgetToolbar: React.FC<WidgetToolbarProps> = ({ onAddWidget, disabled = false }) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name="add-circle-outline" size={18} color={couleurs.texteSecondaire} />
        <Text style={[styles.label, { color: couleurs.texteSecondaire }]}>
          Ajouter un element
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {WIDGET_OPTIONS.map((option) => (
          <Pressable
            key={option.type}
            style={[
              styles.button,
              {
                backgroundColor: couleurs.fondCard,
                borderColor: couleurs.bordure,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
            onPress={() => onAddWidget(option.type)}
            disabled={disabled}
          >
            <Ionicons name={option.icon} size={22} color={couleurs.primaire} />
            <Text style={[styles.buttonLabel, { color: couleurs.texte }]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
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
  scrollContent: {
    flexDirection: 'row',
    gap: espacements.sm,
    paddingRight: espacements.md,
  },
  button: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.md,
    borderWidth: 1,
    minWidth: 70,
    gap: 4,
  },
  buttonLabel: {
    fontSize: typographie.tailles.xs,
  },
});

export default WidgetToolbar;
