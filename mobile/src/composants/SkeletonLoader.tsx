/**
 * SkeletonLoader - Squelettes de chargement avec effet shimmer
 * Alternative élégante aux spinners de chargement
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
  StyleProp,
  DimensionValue,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { couleurs, rayons, espacements } from '../constantes/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  /** Largeur du squelette (nombre ou pourcentage) */
  width?: DimensionValue;
  /** Hauteur du squelette */
  height?: number;
  /** Rayon des coins */
  borderRadius?: number;
  /** Style supplémentaire */
  style?: StyleProp<ViewStyle>;
}

/**
 * Composant de base avec effet shimmer
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = rayons.sm,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.08)',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Squelette pour avatar circulaire
 */
interface SkeletonAvatarProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 50,
  style,
}) => (
  <Skeleton
    width={size}
    height={size}
    borderRadius={size / 2}
    style={style}
  />
);

/**
 * Squelette pour ligne de texte
 */
interface SkeletonTextProps {
  width?: DimensionValue;
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  width = '100%',
  lines = 1,
  lineHeight = 14,
  spacing = 8,
  style,
}) => (
  <View style={[styles.textContainer, style]}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        width={index === lines - 1 && lines > 1 ? '70%' : width}
        height={lineHeight}
        style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
      />
    ))}
  </View>
);

/**
 * Squelette pour une publication du feed
 */
export const SkeletonPost: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.postContainer, style]}>
    {/* Header avec avatar et nom */}
    <View style={styles.postHeader}>
      <SkeletonAvatar size={40} />
      <View style={styles.postHeaderText}>
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>

    {/* Contenu */}
    <SkeletonText lines={3} style={{ marginTop: espacements.md }} />

    {/* Actions */}
    <View style={styles.postActions}>
      <Skeleton width={60} height={24} borderRadius={rayons.full} />
      <Skeleton width={60} height={24} borderRadius={rayons.full} />
      <Skeleton width={60} height={24} borderRadius={rayons.full} />
    </View>
  </View>
);

/**
 * Squelette pour une conversation
 */
export const SkeletonConversation: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.conversationContainer, style]}>
    <SkeletonAvatar size={56} />
    <View style={styles.conversationContent}>
      <Skeleton width={140} height={16} />
      <Skeleton width={200} height={14} style={{ marginTop: 6 }} />
    </View>
    <Skeleton width={40} height={12} />
  </View>
);

/**
 * Squelette pour une notification
 */
export const SkeletonNotification: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.notificationContainer, style]}>
    <SkeletonAvatar size={44} />
    <View style={styles.notificationContent}>
      <Skeleton width="90%" height={14} />
      <Skeleton width="60%" height={12} style={{ marginTop: 4 }} />
    </View>
  </View>
);

/**
 * Squelette pour le profil utilisateur
 */
export const SkeletonProfile: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.profileContainer, style]}>
    {/* Avatar */}
    <SkeletonAvatar size={96} style={{ alignSelf: 'center' }} />

    {/* Nom et bio */}
    <View style={styles.profileInfo}>
      <Skeleton width={150} height={20} style={{ alignSelf: 'center' }} />
      <Skeleton width={100} height={14} style={{ alignSelf: 'center', marginTop: 8 }} />
      <SkeletonText lines={2} width="80%" style={{ alignSelf: 'center', marginTop: 12 }} />
    </View>

    {/* Stats */}
    <View style={styles.profileStats}>
      <View style={styles.statItem}>
        <Skeleton width={40} height={20} />
        <Skeleton width={60} height={14} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.statItem}>
        <Skeleton width={40} height={20} />
        <Skeleton width={60} height={14} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.statItem}>
        <Skeleton width={40} height={20} />
        <Skeleton width={60} height={14} style={{ marginTop: 4 }} />
      </View>
    </View>

    {/* Boutons d'action */}
    <View style={styles.profileActions}>
      <Skeleton width="45%" height={40} borderRadius={rayons.md} />
      <Skeleton width="45%" height={40} borderRadius={rayons.md} />
    </View>
  </View>
);

/**
 * Squelette pour une carte de projet/startup
 */
export const SkeletonProjectCard: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.projectCard, style]}>
    {/* Image */}
    <Skeleton width="100%" height={150} borderRadius={rayons.md} />

    {/* Contenu */}
    <View style={styles.projectContent}>
      <Skeleton width="70%" height={18} />
      <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
      <SkeletonText lines={2} style={{ marginTop: 8 }} />

      {/* Tags */}
      <View style={styles.projectTags}>
        <Skeleton width={60} height={24} borderRadius={rayons.full} />
        <Skeleton width={70} height={24} borderRadius={rayons.full} />
        <Skeleton width={50} height={24} borderRadius={rayons.full} />
      </View>
    </View>
  </View>
);

/**
 * Liste de squelettes
 */
interface SkeletonListProps {
  type: 'post' | 'conversation' | 'notification' | 'project';
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  type,
  count = 3,
  style,
}) => {
  const Component = {
    post: SkeletonPost,
    conversation: SkeletonConversation,
    notification: SkeletonNotification,
    project: SkeletonProjectCard,
  }[type];

  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <Component key={index} style={{ marginBottom: espacements.md }} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: couleurs.fondCard,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  gradient: {
    flex: 1,
    width: SCREEN_WIDTH * 2,
  },
  textContainer: {
    width: '100%',
  },
  postContainer: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.lg,
    padding: espacements.lg,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postHeaderText: {
    marginLeft: espacements.md,
    flex: 1,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: espacements.lg,
    gap: espacements.md,
  },
  conversationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.md,
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.md,
  },
  conversationContent: {
    flex: 1,
    marginLeft: espacements.md,
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: espacements.md,
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.md,
  },
  notificationContent: {
    flex: 1,
    marginLeft: espacements.md,
  },
  profileContainer: {
    padding: espacements.lg,
  },
  profileInfo: {
    marginTop: espacements.lg,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: espacements.xl,
    paddingVertical: espacements.md,
  },
  statItem: {
    alignItems: 'center',
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espacements.xl,
  },
  projectCard: {
    backgroundColor: couleurs.fondCard,
    borderRadius: rayons.lg,
    overflow: 'hidden',
  },
  projectContent: {
    padding: espacements.md,
  },
  projectTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.sm,
    marginTop: espacements.md,
  },
});

export default Skeleton;
