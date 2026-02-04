/**
 * LiveCard - Carte de preview pour un live en cours
 * TODO: Implémenter l'UI complète quand la feature Live sera activée
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { couleurs, espacements, typographie, rayons } from '../constantes/theme';
import Avatar from './Avatar';
import type { Live } from '../services/live';

interface LiveCardProps {
  live: Live;
  onPress: () => void;
}

const LiveCard: React.FC<LiveCardProps> = ({ live, onPress }) => {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.avatarContainer}>
        <Avatar
          uri={live.host?.avatar}
          prenom={live.host?.prenom || ''}
          nom={live.host?.nom || ''}
          taille={60}
        />
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <Text style={styles.hostName} numberOfLines={1}>
        {live.host?.prenom}
      </Text>
      <View style={styles.viewerContainer}>
        <Ionicons name="eye" size={12} color={couleurs.texteSecondaire} />
        <Text style={styles.viewerCount}>{live.viewerCount}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 80,
  },
  avatarContainer: {
    position: 'relative',
  },
  liveBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    transform: [{ translateX: -18 }],
    backgroundColor: couleurs.danger,
    paddingHorizontal: espacements.xs,
    paddingVertical: 2,
    borderRadius: rayons.xs,
    borderWidth: 2,
    borderColor: couleurs.blanc,
  },
  liveText: {
    color: couleurs.blanc,
    fontSize: 10,
    fontWeight: typographie.poids.bold,
  },
  hostName: {
    marginTop: espacements.sm,
    fontSize: typographie.tailles.xs,
    color: couleurs.texte,
    textAlign: 'center',
  },
  viewerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  viewerCount: {
    fontSize: typographie.tailles.xs,
    color: couleurs.texteSecondaire,
  },
});

export default LiveCard;
