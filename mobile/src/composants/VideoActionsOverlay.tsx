/**
 * VideoActionsOverlay - Overlay d'actions style Instagram Reels
 * Affiche les boutons like/comment/share à droite de la vidéo
 * Design premium : icônes épurées avec ombre pour lisibilité, sans fond noir
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements } from '../constantes/theme';

interface VideoActionsOverlayProps {
  /** Post est liké par l'utilisateur */
  liked: boolean;
  /** Nombre de likes */
  likesCount: number;
  /** Nombre de commentaires */
  commentsCount: number;
  /** Nombre de partages (optionnel) */
  sharesCount?: number;
  /** Callback pour toggle like */
  onLike: () => void;
  /** Callback pour ouvrir les commentaires */
  onComments: () => void;
  /** Callback pour partager */
  onShare: () => void;
  /** Overlay visible (défaut: true - toujours visible pour meilleure UX) */
  visible?: boolean;
}

/**
 * Formater un nombre pour affichage compact (1.2K, 5M, etc.)
 */
function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return count.toString();
}

export default function VideoActionsOverlay({
  liked,
  likesCount,
  commentsCount,
  sharesCount = 0,
  onLike,
  onComments,
  onShare,
  visible = true,
}: VideoActionsOverlayProps) {
  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Like Button */}
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.actionButtonPressed,
        ]}
        onPress={onLike}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={30}
          color={liked ? '#FF3B5C' : couleurs.blanc}
          style={styles.iconShadow}
        />
        <Text style={styles.countText}>
          {formatCount(likesCount)}
        </Text>
      </Pressable>

      {/* Comments Button */}
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.actionButtonPressed,
        ]}
        onPress={onComments}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name="chatbubble-outline"
          size={28}
          color={couleurs.blanc}
          style={styles.iconShadow}
        />
        <Text style={styles.countText}>
          {formatCount(commentsCount)}
        </Text>
      </Pressable>

      {/* Share Button */}
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.actionButtonPressed,
        ]}
        onPress={onShare}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons
          name="paper-plane-outline"
          size={26}
          color={couleurs.blanc}
          style={styles.iconShadow}
        />
        {sharesCount > 0 && (
          <Text style={styles.countText}>
            {formatCount(sharesCount)}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: espacements.md,
    bottom: Platform.OS === 'ios' ? 140 : 160,
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
    gap: 4,
  },
  actionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  iconShadow: {
    // Ombre portée pour lisibilité sur vidéo - pas de fond noir
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  countText: {
    color: couleurs.blanc,
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
