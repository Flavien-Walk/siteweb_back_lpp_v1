/**
 * StoryCircle - Cercle d'avatar avec bordure gradient pour les stories
 * Style Instagram : bordure colorée si story non vue, grise si vue
 */

import React, { memo, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { couleurs, espacements, typographie } from '../constantes/theme';
import { useTheme } from '../contexts/ThemeContext';

interface StoryCircleProps {
  uri?: string | null;
  prenom?: string;
  nom?: string;
  taille?: number;
  hasStory?: boolean;
  isSeen?: boolean; // true si toutes les stories ont été vues (bordure grise)
  isOwn?: boolean;
  onPress?: () => void;
  onAddPress?: () => void;
  style?: ViewStyle;
}

/**
 * Cercle de story style Instagram
 * - Bordure gradient si l'utilisateur a une story
 * - Bouton + si c'est sa propre story et qu'on peut en ajouter
 */
const StoryCircle: React.FC<StoryCircleProps> = ({
  uri,
  prenom = '',
  nom = '',
  taille = 64,
  hasStory = false,
  isSeen = false,
  isOwn = false,
  onPress,
  onAddPress,
  style,
}) => {
  const { couleurs: themeColors } = useTheme();

  // Memoize computed values
  const { borderWidth, innerSize, displayName, outerStyles, wrapperStyles } = useMemo(() => {
    const bw = 3;
    return {
      borderWidth: bw,
      innerSize: taille - bw * 2 - 4,
      displayName: prenom.length > 10 ? `${prenom.slice(0, 9)}…` : prenom,
      outerStyles: {
        width: taille,
        height: taille,
        borderRadius: taille / 2,
      },
      wrapperStyles: {
        width: taille - bw * 2,
        height: taille - bw * 2,
        borderRadius: (taille - bw * 2) / 2,
        backgroundColor: themeColors.fond,
      },
    };
  }, [taille, prenom, themeColors.fond]);

  const handlePress = useCallback(() => {
    if (hasStory && onPress) {
      onPress();
    } else if (isOwn && onAddPress) {
      onAddPress();
    }
  }, [hasStory, onPress, isOwn, onAddPress]);

  return (
    <Pressable
      style={[styles.container, style]}
      onPress={handlePress}
      disabled={!hasStory && !isOwn}
    >
      {/* Cercle extérieur avec gradient si story non vue, gris si vue */}
      {hasStory && !isSeen ? (
        <LinearGradient
          colors={[couleurs.accent, couleurs.primaire, couleurs.secondaire]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBorder, outerStyles]}
        >
          <View style={[styles.avatarWrapper, wrapperStyles]}>
            <Avatar uri={uri} prenom={prenom} nom={nom} taille={innerSize} />
          </View>
        </LinearGradient>
      ) : hasStory && isSeen ? (
        <View style={[styles.seenBorder, outerStyles]}>
          <View style={[styles.avatarWrapper, wrapperStyles]}>
            <Avatar uri={uri} prenom={prenom} nom={nom} taille={innerSize} />
          </View>
        </View>
      ) : (
        <View style={[styles.noBorder, outerStyles, { borderColor: themeColors.bordure }]}>
          <Avatar uri={uri} prenom={prenom} nom={nom} taille={taille - 4} />
        </View>
      )}

      {/* Bouton + pour ajouter une story (propre profil) */}
      {isOwn && (
        <Pressable
          style={[
            styles.addButton,
            { backgroundColor: couleurs.primaire },
          ]}
          onPress={onAddPress}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons name="add" size={14} color={couleurs.blanc} />
        </Pressable>
      )}

      {/* Nom sous l'avatar */}
      <Text
        style={[styles.name, { color: themeColors.texte }]}
        numberOfLines={1}
      >
        {isOwn ? 'Votre story' : displayName}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: espacements.md,
    width: 72,
  },
  gradientBorder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  noBorder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  seenBorder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8E8E8E', // Gris Instagram pour stories vues
  },
  addButton: {
    position: 'absolute',
    bottom: 18,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: couleurs.fond,
  },
  name: {
    marginTop: espacements.xs,
    fontSize: typographie.tailles.xs,
    fontWeight: typographie.poids.medium,
    textAlign: 'center',
  },
});

export default memo(StoryCircle);
