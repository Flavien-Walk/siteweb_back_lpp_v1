/**
 * SkeletonPourToi — Squelette de chargement pour la section Pour Toi
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import { Skeleton } from './SkeletonLoader';

interface Props {
  count?: number;
}

const SkeletonPourToiCard: React.FC = () => {
  const { couleurs } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
      {/* Source label */}
      <View style={styles.sourceLabel}>
        <Skeleton width={16} height={16} borderRadius={8} />
        <Skeleton width={140} height={12} />
      </View>
      {/* Image */}
      <Skeleton width="100%" height={160} borderRadius={0} />
      {/* Content */}
      <View style={styles.content}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="100%" height={12} style={{ marginTop: 8 }} />
        <Skeleton width="80%" height={12} style={{ marginTop: 4 }} />
        {/* Tags */}
        <View style={styles.tags}>
          <Skeleton width={60} height={20} borderRadius={10} />
          <Skeleton width={50} height={20} borderRadius={10} />
          <Skeleton width={45} height={20} borderRadius={10} />
        </View>
        {/* Button */}
        <Skeleton width="100%" height={36} borderRadius={rayons.md} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
};

const SkeletonPourToi: React.FC<Props> = ({ count = 3 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonPourToiCard key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: rayons.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: espacements.md,
  },
  sourceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacements.xs,
    paddingHorizontal: espacements.md,
    paddingVertical: espacements.sm,
  },
  content: {
    padding: espacements.md,
  },
  tags: {
    flexDirection: 'row',
    gap: espacements.xs,
    marginTop: espacements.sm,
  },
});

export default React.memo(SkeletonPourToi);
