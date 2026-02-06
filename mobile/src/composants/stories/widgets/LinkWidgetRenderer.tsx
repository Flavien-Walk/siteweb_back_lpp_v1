/**
 * LinkWidgetRenderer - Affiche un lien cliquable sur la story
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinkWidget } from '../../../types/storyWidgets';
import { couleurs, espacements, rayons, typographie } from '../../../constantes/theme';

interface LinkWidgetRendererProps {
  widget: LinkWidget;
  isEditing?: boolean;
  onPress?: (url: string) => void;
}

const LinkWidgetRenderer: React.FC<LinkWidgetRendererProps> = ({
  widget,
  isEditing = false,
  onPress,
}) => {
  const handlePress = async () => {
    if (isEditing) return;

    if (onPress) {
      onPress(widget.data.url);
    } else {
      try {
        await Linking.openURL(widget.data.url);
      } catch (error) {
        console.error('Erreur ouverture URL:', error);
      }
    }
  };

  const label = widget.data.label || 'Voir le lien';

  // Style Pill - bouton arrondi
  if (widget.data.style === 'pill') {
    return (
      <Pressable style={styles.pillContainer} onPress={handlePress}>
        <Ionicons name="link" size={16} color={couleurs.blanc} />
        <Text style={styles.pillText} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  }

  // Style Arrow - flèche vers le haut
  if (widget.data.style === 'arrow') {
    return (
      <Pressable style={styles.arrowContainer} onPress={handlePress}>
        <Ionicons name="chevron-up" size={20} color={couleurs.blanc} />
        <Text style={styles.arrowText}>{label}</Text>
      </Pressable>
    );
  }

  // Style Swipe - "swipe up" style Instagram
  if (widget.data.style === 'swipe') {
    return (
      <Pressable style={styles.swipeContainer} onPress={handlePress}>
        <Ionicons name="arrow-up-circle-outline" size={32} color={couleurs.blanc} />
        <Text style={styles.swipeText}>{label}</Text>
      </Pressable>
    );
  }

  // Default: pill
  return (
    <Pressable style={styles.pillContainer} onPress={handlePress}>
      <Ionicons name="link" size={16} color={couleurs.blanc} />
      <Text style={styles.pillText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Style Pill
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.xl,
    gap: espacements.xs,
    maxWidth: 200,
  },
  pillText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },

  // Style Arrow
  arrowContainer: {
    alignItems: 'center',
    gap: 2,
  },
  arrowText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Style Swipe
  swipeContainer: {
    alignItems: 'center',
    gap: 4,
  },
  swipeText: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default LinkWidgetRenderer;
