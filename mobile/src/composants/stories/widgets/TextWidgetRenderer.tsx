/**
 * TextWidgetRenderer - Affiche du texte stylé sur la story
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TextWidget, TEXT_FONT_SIZES } from '../../../types/storyWidgets';
import { rayons, espacements } from '../../../constantes/theme';

interface TextWidgetRendererProps {
  widget: TextWidget;
}

const TextWidgetRenderer: React.FC<TextWidgetRendererProps> = ({ widget }) => {
  const { text, fontSize, fontStyle, color, backgroundColor, textAlign } = widget.data;

  const getFontFamily = () => {
    switch (fontStyle) {
      case 'serif':
        return 'serif';
      case 'mono':
        return 'monospace';
      case 'handwritten':
        return undefined; // Utilise italic à la place
      default:
        return undefined;
    }
  };

  const textStyles = {
    fontSize: TEXT_FONT_SIZES[fontSize] || TEXT_FONT_SIZES.medium,
    color: color || '#FFFFFF',
    fontFamily: getFontFamily(),
    fontStyle: fontStyle === 'handwritten' ? 'italic' as const : 'normal' as const,
    textAlign: textAlign || 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  };

  const containerStyles = {
    backgroundColor: backgroundColor || 'transparent',
    paddingHorizontal: backgroundColor ? espacements.md : 0,
    paddingVertical: backgroundColor ? espacements.sm : 0,
    borderRadius: backgroundColor ? rayons.md : 0,
  };

  return (
    <View style={[styles.container, containerStyles]}>
      <Text style={[styles.text, textStyles]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: 280,
  },
  text: {
    // Les styles dynamiques sont appliqués via props
  },
});

export default TextWidgetRenderer;
