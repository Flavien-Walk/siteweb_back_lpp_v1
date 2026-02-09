/**
 * LiveCard - Carte de preview pour un live en cours
 * 3 variantes : 'featured' (hero), 'card' (scroll horizontal), 'grid' (grille 2 colonnes)
 * Fond = image (thumbnail ou Unsplash) + overlay gradient sombre
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated as RNAnimated, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { espacements, rayons } from '../constantes/theme';
import { useTheme } from '../contexts/ThemeContext';
import Avatar from './Avatar';
import type { Live } from '../services/live';
import { formatLiveDuration, formatViewerCount, getLiveThumbnail } from '../services/live';

interface LiveCardProps {
  live: Live;
  onPress: () => void;
  variant?: 'card' | 'featured' | 'grid';
  index?: number;
}

const LiveCard: React.FC<LiveCardProps> = ({ live, onPress, variant = 'card', index = 0 }) => {
  const { couleurs } = useTheme();
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

  const thumbnailUri = live.thumbnail || getLiveThumbnail(index);

  // ============ FEATURED ============
  if (variant === 'featured') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ borderRadius: rayons.lg, overflow: 'hidden' }, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}>
        <ImageBackground
          source={{ uri: thumbnailUri }}
          style={{ minHeight: 200 }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.65)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ padding: espacements.lg, minHeight: 200, justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: couleurs.erreur, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 }}>
                <RNAnimated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: couleurs.blanc, opacity: pulseAnim }} />
                <Text style={{ color: couleurs.blanc, fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>LIVE</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 }}>
                <Ionicons name="eye" size={14} color={couleurs.blanc} />
                <Text style={{ color: couleurs.blanc, fontSize: 12, fontWeight: '600' }}>{formatViewerCount(live.viewerCount)}</Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', paddingVertical: espacements.md }}>
              <View style={{ borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', padding: 3, marginBottom: espacements.sm }}>
                <Avatar uri={live.host?.avatar} prenom={live.host?.prenom || ''} nom={live.host?.nom || ''} taille={60} />
              </View>
              <Text style={{ color: couleurs.blanc, fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} numberOfLines={2}>
                {live.title || `${live.host?.prenom} est en direct`}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                {live.host?.prenom} {live.host?.nom}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 }}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.85)" />
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' }}>{formatLiveDuration(live.startedAt)}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}>
                <Text style={{ color: couleurs.blanc, fontSize: 13, fontWeight: '600' }}>Rejoindre</Text>
                <Ionicons name="arrow-forward" size={14} color={couleurs.blanc} />
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </Pressable>
    );
  }

  // ============ GRID ============
  if (variant === 'grid') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, borderRadius: rayons.lg, overflow: 'hidden', backgroundColor: couleurs.fondCard, borderWidth: 1, borderColor: couleurs.bordure }, pressed && { opacity: 0.92, transform: [{ scale: 0.97 }] }]}>
        <ImageBackground
          source={{ uri: thumbnailUri }}
          style={{ height: 110 }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ height: 110, padding: espacements.sm, justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: couleurs.erreur, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, gap: 4 }}>
                <RNAnimated.View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: couleurs.blanc, opacity: pulseAnim }} />
                <Text style={{ color: couleurs.blanc, fontSize: 9, fontWeight: '700' }}>LIVE</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 3 }}>
                <Ionicons name="eye" size={10} color={couleurs.blanc} />
                <Text style={{ color: couleurs.blanc, fontSize: 10, fontWeight: '600' }}>{formatViewerCount(live.viewerCount)}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Avatar uri={live.host?.avatar} prenom={live.host?.prenom || ''} nom={live.host?.nom || ''} taille={40} />
            </View>
            <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 }}>
              <Text style={{ color: couleurs.blanc, fontSize: 9, fontWeight: '500' }}>{formatLiveDuration(live.startedAt)}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
        <View style={{ padding: espacements.sm, gap: 2 }}>
          <Text style={{ color: couleurs.texte, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
            {live.host?.prenom} {live.host?.nom}
          </Text>
          <Text style={{ color: couleurs.texteSecondaire, fontSize: 11 }} numberOfLines={1}>
            {live.title || 'En direct'}
          </Text>
        </View>
      </Pressable>
    );
  }

  // ============ CARD (scroll horizontal) ============
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width: 200, borderRadius: rayons.lg, overflow: 'hidden', backgroundColor: couleurs.fondCard, borderWidth: 1, borderColor: couleurs.bordure }, pressed && { opacity: 0.92, transform: [{ scale: 0.96 }] }]}>
      <ImageBackground
        source={{ uri: thumbnailUri }}
        style={{ height: 120 }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.55)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ height: 120, padding: espacements.sm, justifyContent: 'space-between' }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: couleurs.erreur, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 }}>
              <RNAnimated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: couleurs.blanc, opacity: pulseAnim }} />
              <Text style={{ color: couleurs.blanc, fontSize: 10, fontWeight: '700' }}>LIVE</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, gap: 3 }}>
              <Ionicons name="eye" size={11} color={couleurs.blanc} />
              <Text style={{ color: couleurs.blanc, fontSize: 11, fontWeight: '600' }}>{formatViewerCount(live.viewerCount)}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Avatar uri={live.host?.avatar} prenom={live.host?.prenom || ''} nom={live.host?.nom || ''} taille={44} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: couleurs.blanc, fontSize: 10, fontWeight: '500' }}>{formatLiveDuration(live.startedAt)}</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
      <View style={{ padding: espacements.sm, gap: 2 }}>
        <Text style={{ color: couleurs.texte, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
          {live.host?.prenom} {live.host?.nom}
        </Text>
        <Text style={{ color: couleurs.texteSecondaire, fontSize: 11 }} numberOfLines={1}>
          {live.title || 'En direct'}
        </Text>
      </View>
    </Pressable>
  );
};

export default LiveCard;
