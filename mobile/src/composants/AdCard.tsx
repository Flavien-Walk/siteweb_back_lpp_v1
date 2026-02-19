/**
 * AdCard - Carte publicitaire video pour le feed
 *
 * Reutilise PostMediaCarousel pour la video (meme systeme que PublicationCard)
 * avec le prefix 'ad:' pour le postId (pattern identique a 'reels:')
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import PostMediaCarousel from './PostMediaCarousel';
import { AdItem, trackAdEvent } from '../services/ads';

interface AdCardProps {
  ad: AdItem;
  feedPosition: number;
  mediaWidth: number;
  mediaHeight: number;
  styles: any; // styles du parent (postCard, postHeader, etc.) pour coherence visuelle
}

const AdCard: React.FC<AdCardProps> = React.memo(({
  ad,
  feedPosition,
  mediaWidth,
  mediaHeight,
  styles: parentStyles,
}) => {
  const { couleurs } = useTheme();
  const adPostId = `ad:${ad._id}`;

  // Tracking refs
  const hasTrackedImpression = useRef(false);
  const viewStartRef = useRef<number>(Date.now());
  const has3sTracked = useRef(false);

  // Track impression au mount
  useEffect(() => {
    if (!hasTrackedImpression.current) {
      trackAdEvent('impression', ad, feedPosition);
      hasTrackedImpression.current = true;
      viewStartRef.current = Date.now();
    }
  }, [ad._id, feedPosition]);

  // Track 3s de visibilite
  useEffect(() => {
    const interval = setInterval(() => {
      if (!has3sTracked.current) {
        const elapsed = Date.now() - viewStartRef.current;
        if (elapsed >= 3000) {
          trackAdEvent('view_3s', ad, feedPosition);
          has3sTracked.current = true;
          clearInterval(interval);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [ad._id, feedPosition]);

  const handleCtaPress = useCallback(() => {
    trackAdEvent('click', ad, feedPosition);
    Linking.openURL(ad.ctaUrl).catch(() => {});
  }, [ad, feedPosition]);

  // Medias pour PostMediaCarousel (un seul item video)
  const medias = useRef([{
    type: 'video' as const,
    url: ad.videoUrl,
    thumbnailUrl: ad.thumbnailUrl,
  }]).current;

  return (
    <View style={parentStyles.postCard}>
      {/* Header : marque + badge Sponsorise */}
      <View style={parentStyles.postHeader}>
        <Image
          source={{ uri: ad.brand.avatar }}
          style={adStyles.brandAvatar}
          defaultSource={require('../../assets/icon.png')}
        />
        <View style={parentStyles.postAuteurContainer}>
          <View style={parentStyles.postAuteurRow}>
            <Text style={parentStyles.postAuteur}>{ad.brand.name}</Text>
            <View style={[adStyles.sponsoriseBadge, { backgroundColor: couleurs.primaire }]}>
              <Ionicons name="megaphone" size={10} color="#fff" />
              <Text style={adStyles.sponsoriseText}>Sponsorise</Text>
            </View>
          </View>
          {ad.brand.tagline ? (
            <Text style={parentStyles.postTimestamp}>{ad.brand.tagline}</Text>
          ) : null}
        </View>
      </View>

      {/* Texte publicitaire */}
      <Text style={parentStyles.postContenu}>{ad.contenu}</Text>

      {/* Video via PostMediaCarousel — meme systeme que les publications */}
      <PostMediaCarousel
        medias={medias}
        postId={adPostId}
        width={mediaWidth}
        height={mediaHeight}
        autoPlayVideos={true}
      />

      {/* Tags */}
      {ad.tags.length > 0 && (
        <View style={adStyles.tagsRow}>
          {ad.tags.map((tag) => (
            <View key={tag} style={[adStyles.tag, { backgroundColor: couleurs.primaireLight }]}>
              <Text style={[adStyles.tagText, { color: couleurs.primaire }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* CTA */}
      <Pressable
        style={[adStyles.ctaButton, { backgroundColor: couleurs.primaire }]}
        onPress={handleCtaPress}
      >
        <Text style={adStyles.ctaText}>{ad.ctaLabel}</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </Pressable>
    </View>
  );
});

AdCard.displayName = 'AdCard';

const adStyles = StyleSheet.create({
  brandAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A24',
  },
  sponsoriseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rayons.full,
    paddingHorizontal: espacements.sm,
    paddingVertical: 2,
    gap: 4,
  },
  sponsoriseText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacements.sm,
    paddingHorizontal: espacements.md,
    paddingTop: espacements.sm,
  },
  tag: {
    borderRadius: rayons.full,
    paddingHorizontal: espacements.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rayons.md,
    paddingVertical: espacements.md,
    marginHorizontal: espacements.md,
    marginTop: espacements.md,
    marginBottom: espacements.sm,
    gap: espacements.sm,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdCard;
