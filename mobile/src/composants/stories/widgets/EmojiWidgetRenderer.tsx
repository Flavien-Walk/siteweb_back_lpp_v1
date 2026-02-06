/**
 * EmojiWidgetRenderer - Affiche un emoji sur la story
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EmojiWidget } from '../../../types/storyWidgets';

interface EmojiWidgetRendererProps {
  widget: EmojiWidget;
}

const EmojiWidgetRenderer: React.FC<EmojiWidgetRendererProps> = ({ widget }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{widget.data.emoji}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});

export default EmojiWidgetRenderer;
