/**
 * MentionWidgetRenderer - Affiche une mention @utilisateur sur la story
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MentionWidget } from '../../../types/storyWidgets';
import { couleurs, espacements, rayons, typographie } from '../../../constantes/theme';

interface MentionWidgetRendererProps {
  widget: MentionWidget;
  isEditing?: boolean;
  onPress?: (userId: string) => void;
}

const MentionWidgetRenderer: React.FC<MentionWidgetRendererProps> = ({
  widget,
  isEditing = false,
  onPress,
}) => {
  const handlePress = () => {
    if (!isEditing && onPress) {
      onPress(widget.data.userId);
    }
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Ionicons name="at" size={14} color={couleurs.blanc} />
      <Text style={styles.username} numberOfLines={1}>
        {widget.data.displayName || widget.data.username}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
    borderRadius: rayons.xl,
    gap: 2,
    maxWidth: 180,
  },
  username: {
    color: couleurs.blanc,
    fontSize: typographie.tailles.sm,
    fontWeight: typographie.poids.medium,
  },
});

export default MentionWidgetRenderer;
