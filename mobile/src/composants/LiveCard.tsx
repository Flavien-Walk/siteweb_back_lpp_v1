/**
 * LiveCard - Carte de preview pour un live en cours
 * Deux variantes : 'featured' (grande) et 'card' (compacte)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { espacements, rayons } from '../constantes/theme';
import Avatar from './Avatar';
import type { Live } from '../services/live';
import { formatLiveDuration, formatViewerCount } from '../services/live';

interface LiveCardProps {
  live: Live;
  onPress: () => void;
  variant?: 'card' | 'featured';
}

const LiveCard: React.FC<LiveCardProps> = ({ live, onPress, variant = 'card' }) => {
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const pulse = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  if (variant === 'featured') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.featuredContainer, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}>
        <LinearGradient
          colors={['#4F46E5', '#7C3AED', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featuredGradient}
        >
          {/* Top row: LIVE badge + viewers */}
          <View style={styles.featuredBadgeRow}>
            <View style={styles.liveBadge}>
              <RNAnimated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <View style={styles.viewerBadge}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.viewerBadgeText}>{formatViewerCount(live.viewerCount)}</Text>
            </View>
          </View>

          {/* Center: avatar + info */}
          <View style={styles.featuredCenter}>
            <View style={styles.featuredAvatarRing}>
              <Avatar
                uri={live.host?.avatar}
                prenom={live.host?.prenom || ''}
                nom={live.host?.nom || ''}
                taille={64}
              />
            </View>
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {live.title || `${live.host?.prenom} est en direct`}
            </Text>
            <Text style={styles.featuredHost}>
              {live.host?.prenom} {live.host?.nom}
            </Text>
          </View>

          {/* Bottom: duration + join btn */}
          <View style={styles.featuredBottom}>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.durationText}>{formatLiveDuration(live.startedAt)}</Text>
            </View>
            <View style={styles.joinBtn}>
              <Text style={styles.joinBtnText}>Rejoindre</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // Default card variant
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cardContainer, pressed && { opacity: 0.92, transform: [{ scale: 0.96 }] }]}>
      <LinearGradient
        colors={['#312E81', '#4338CA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* LIVE badge */}
        <View style={styles.cardBadgeRow}>
          <View style={styles.liveBadgeSmall}>
            <RNAnimated.View style={[styles.liveDotSmall, { opacity: pulseAnim }]} />
            <Text style={styles.liveBadgeTextSmall}>LIVE</Text>
          </View>
        </View>

        {/* Avatar */}
        <View style={styles.cardAvatarSection}>
          <Avatar
            uri={live.host?.avatar}
            prenom={live.host?.prenom || ''}
            nom={live.host?.nom || ''}
            taille={44}
          />
        </View>

        {/* Info */}
        <Text style={styles.cardHostName} numberOfLines={1}>
          {live.host?.prenom} {live.host?.nom?.charAt(0)}.
        </Text>
        {live.title && (
          <Text style={styles.cardTitle} numberOfLines={1}>{live.title}</Text>
        )}

        {/* Stats */}
        <View style={styles.cardStats}>
          <View style={styles.cardStat}>
            <Ionicons name="eye" size={11} color="rgba(255,255,255,0.6)" />
            <Text style={styles.cardStatText}>{formatViewerCount(live.viewerCount)}</Text>
          </View>
          <View style={styles.cardStat}>
            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.6)" />
            <Text style={styles.cardStatText}>{formatLiveDuration(live.startedAt)}</Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // ============ FEATURED VARIANT ============
  featuredContainer: {
    borderRadius: rayons.lg,
    overflow: 'hidden',
  },
  featuredGradient: {
    padding: espacements.lg,
    borderRadius: rayons.lg,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  featuredBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  viewerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredCenter: {
    alignItems: 'center',
    paddingVertical: espacements.md,
  },
  featuredAvatarRing: {
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    padding: 3,
    marginBottom: espacements.sm,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  featuredHost: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  featuredBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  durationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ============ CARD VARIANT ============
  cardContainer: {
    width: 150,
    borderRadius: rayons.lg,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: espacements.md,
    borderRadius: rayons.lg,
    alignItems: 'center',
    minHeight: 175,
    justifyContent: 'space-between',
  },
  cardBadgeRow: {
    alignSelf: 'flex-start',
  },
  liveBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveBadgeTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardAvatarSection: {
    marginVertical: espacements.sm,
  },
  cardHostName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  cardStats: {
    flexDirection: 'row',
    gap: espacements.sm,
    marginTop: espacements.sm,
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardStatText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '500',
  },
});

export default LiveCard;
