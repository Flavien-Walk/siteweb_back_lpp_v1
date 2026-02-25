/**
 * SkeletonTendances — Squelette de chargement pour la section Tendances
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import { Skeleton } from './SkeletonLoader';

interface Props {
  count?: number;
}

const SkeletonTendanceCard: React.FC = () => {
  const { couleurs } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: couleurs.fondCard, borderColor: couleurs.bordure }]}>
      {/* Image */}
      <Skeleton width={130} height={160} borderRadius={0} />
      {/* Content */}
      <View style={styles.content}>
        <Skeleton width="75%" height={16} />
        <Skeleton width="100%" height={12} style={{ marginTop: 6 }} />
        <Skeleton width="60%" height={12} style={{ marginTop: 4 }} />
        {/* Trend bar */}
        <Skeleton width="100%" height={4} borderRadius={2} style={{ marginTop: 8 }} />
        {/* Stats */}
        <View style={styles.stats}>
          <Skeleton width={50} height={14} />
          <Skeleton width={40} height={14} />
        </View>
        {/* Button */}
        <Skeleton width="100%" height={30} borderRadius={rayons.sm} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
};

const SkeletonTendances: React.FC<Props> = ({ count = 5 }) => (
  <View>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonTendanceCard key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: rayons.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: espacements.md,
  },
  content: {
    flex: 1,
    padding: espacements.md,
    justifyContent: 'space-between',
  },
  stats: {
    flexDirection: 'row',
    gap: espacements.sm,
    marginTop: espacements.sm,
  },
});

export default React.memo(SkeletonTendances);
