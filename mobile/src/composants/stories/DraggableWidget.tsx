/**
 * DraggableWidget - Wrapper pour rendre un widget déplaçable
 * Utilise PanResponder pour le drag & drop
 */

import React, { useRef, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Dimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, rayons } from '../../constantes/theme';
import { StoryWidget, WidgetTransform } from '../../types/storyWidgets';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DraggableWidgetProps {
  widget: StoryWidget;
  isEditing: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTransformChange: (id: string, transform: WidgetTransform) => void;
  onDelete: (id: string) => void;
  children: React.ReactNode;
  containerHeight?: number;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  widget,
  isEditing,
  isSelected,
  onSelect,
  onTransformChange,
  onDelete,
  children,
  containerHeight = SCREEN_HEIGHT * 0.5,
}) => {
  const containerWidth = SCREEN_WIDTH;

  // Position animée
  const pan = useRef(
    new Animated.ValueXY({
      x: widget.transform.x * containerWidth,
      y: widget.transform.y * containerHeight,
    })
  ).current;

  // Mettre à jour la position si le widget change
  useEffect(() => {
    pan.setValue({
      x: widget.transform.x * containerWidth,
      y: widget.transform.y * containerHeight,
    });
  }, [widget.transform.x, widget.transform.y, containerWidth, containerHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isEditing,
      onMoveShouldSetPanResponder: () => isEditing,
      onPanResponderGrant: () => {
        onSelect(widget.id);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();

        // Calculer la position normalisée (0-1)
        const currentX = (pan.x as any)._value;
        const currentY = (pan.y as any)._value;

        // Limiter aux bornes du container
        const clampedX = Math.max(0, Math.min(containerWidth, currentX));
        const clampedY = Math.max(0, Math.min(containerHeight, currentY));

        const normalizedX = clampedX / containerWidth;
        const normalizedY = clampedY / containerHeight;

        onTransformChange(widget.id, {
          ...widget.transform,
          x: normalizedX,
          y: normalizedY,
        });
      },
    })
  ).current;

  const handlePress = () => {
    if (isEditing) {
      onSelect(widget.id);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable onPress={handlePress}>
        <View
          style={[
            styles.widgetWrapper,
            isSelected && isEditing && styles.selected,
            {
              transform: [
                { scale: widget.transform.scale },
                { rotate: `${widget.transform.rotation}deg` },
              ],
            },
          ]}
        >
          {children}
        </View>
      </Pressable>

      {/* Bouton de suppression */}
      {isSelected && isEditing && (
        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(widget.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={24} color={couleurs.erreur} />
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetWrapper: {
    // Le contenu sera stylé par le renderer
  },
  selected: {
    borderWidth: 2,
    borderColor: couleurs.primaire,
    borderStyle: 'dashed',
    borderRadius: rayons.sm,
    padding: 4,
  },
  deleteButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: couleurs.blanc,
    borderRadius: 12,
  },
});

export default DraggableWidget;
