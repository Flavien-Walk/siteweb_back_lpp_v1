/**
 * AdCard - Carte publicitaire video pour le feed
 *
 * Reutilise PostMediaCarousel pour la video (meme systeme que PublicationCard)
 * avec le prefix 'ad:' pour le postId (pattern identique a 'reels:')
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import PostMediaCarousel from './PostMediaCarousel';
import MoreActionsSheet from './MoreActionsSheet';
import Avatar from './Avatar';
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

  // Menu state
  const [showMenu, setShowMenu] = useState(false);

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
      {/* Header : marque + "Sponsorise" discret (style Instagram) */}
      <View style={parentStyles.postHeader}>
        <Avatar
          uri={ad.brand.avatar}
          prenom={ad.brand.name.split(' ')[0]}
          nom={ad.brand.name.split(' ')[1] || ''}
          taille={44}
        />
        <View style={parentStyles.postAuteurContainer}>
          <Text style={parentStyles.postAuteur}>{ad.brand.name}</Text>
          <Text style={parentStyles.postTimestamp}>Sponsorise</Text>
        </View>
        <Pressable style={adStyles.moreButton} onPress={() => setShowMenu(true)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={couleurs.texteSecondaire} />
        </Pressable>
      </View>

      {/* Texte publicitaire */}
      <Text style={parentStyles.postContenu}>{ad.contenu}</Text>

      {/* Video via PostMediaCarousel — coins arrondis */}
      <View style={adStyles.mediaWrapper}>
        <PostMediaCarousel
          medias={medias}
          postId={adPostId}
          width={mediaWidth}
          height={mediaHeight}
          autoPlayVideos={true}
        />
      </View>

      {/* CTA discret style Instagram */}
      <Pressable
        style={[adStyles.ctaButton, { borderColor: couleurs.texteSecondaire }]}
        onPress={handleCtaPress}
      >
        <Text style={[adStyles.ctaText, { color: couleurs.texte }]}>{ad.ctaLabel}</Text>
        <Ionicons name="chevron-forward" size={14} color={couleurs.texteSecondaire} />
      </Pressable>

      {/* Bottom Sheet Signalement */}
      <MoreActionsSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        contentType="ad"
        contentId={ad._id}
      />
    </View>
  );
});

AdCard.displayName = 'AdCard';

const adStyles = StyleSheet.create({
  moreButton: {
    padding: espacements.sm,
    marginLeft: 'auto',
  },
  mediaWrapper: {
    borderRadius: rayons.md,
    overflow: 'hidden',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: rayons.full,
    borderWidth: 1,
    paddingVertical: espacements.sm,
    paddingHorizontal: espacements.lg,
    marginHorizontal: espacements.md,
    marginTop: espacements.md,
    marginBottom: espacements.sm,
    gap: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AdCard;
