/**
 * LocationWidgetRenderer - Affiche un badge de lieu sur la story
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationWidget } from '../../../types/storyWidgets';
import { espacements, rayons, typographie } from '../../../constantes/theme';
import { useTheme, ThemeCouleurs } from '../../../contexts/ThemeContext';

interface LocationWidgetRendererProps {
  widget: LocationWidget;
}

const LocationWidgetRenderer: React.FC<LocationWidgetRendererProps> = ({ widget }) => {
  const { couleurs } = useTheme();
  const styles = useMemo(() => createStyles(couleurs), [couleurs]);

  return (
    <View style={styles.container}>
      <Ionicons name="location" size={14} color={couleurs.blanc} />
      <Text style={styles.label} numberOfLines={1}>
        {widget.data.label}
      </Text>
    </View>
  );
};

const createStyles = (couleurs: ThemeCouleurs) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.xl,
    gap: espacements.xs,
    maxWidth: 200,
  },
  label: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
});

export default LocationWidgetRenderer;
