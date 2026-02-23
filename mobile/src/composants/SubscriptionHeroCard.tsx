/**
 * SubscriptionHeroCard — Carte hero LPP+ style paywall
 * Affiche l'offre d'abonnement avec un design premium gradient
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import type { CertificationPlan } from '../services/boutique';
import { formatPrice } from '../services/boutique';

interface SubscriptionHeroCardProps {
  plan: CertificationPlan;
  isVerified: boolean;
  cancelAtPeriodEnd?: boolean;
  onPress: () => void;
  couleurs: ThemeCouleurs;
}

export default function SubscriptionHeroCard({ plan, isVerified, cancelAtPeriodEnd, onPress, couleurs }: SubscriptionHeroCardProps) {
  const s = createStyles(couleurs);

  if (isVerified) {
    return (
      <Pressable
        style={({ pressed }) => [s.activeCard, pressed && { opacity: 0.92 }]}
        onPress={onPress}
      >
        <View style={s.activeLeft}>
          <View style={s.activeIcon}>
            <Ionicons name="checkmark-circle" size={22} color="#7C5CFF" />
          </View>
          <View style={s.activeInfo}>
            <Text style={s.activeTitle}>LPP+ actif</Text>
            <Text style={s.activeSubtitle}>
              {cancelAtPeriodEnd ? 'Resiliation programmee' : 'Votre compte est verifie'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={couleurs.texteSecondaire} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={['#7C5CFF', '#5B3FD9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroCard}
      >
        <View style={s.heroTop}>
          <View style={s.heroBadge}>
            <Ionicons name="checkmark-circle" size={28} color="#fff" />
          </View>
          <View style={s.heroTitleBlock}>
            <Text style={s.heroName}>{plan.name}</Text>
            <Text style={s.heroTagline}>Confirmez votre identite</Text>
          </View>
          <View style={s.heroPriceBadge}>
            <Text style={s.heroPriceText}>{formatPrice(plan.price)}/mois</Text>
          </View>
        </View>

        <View style={s.benefitsList}>
          {plan.benefits.map((b, i) => (
            <View key={i} style={s.benefitRow}>
              <Ionicons name={b.icon as any} size={14} color="rgba(255,255,255,0.85)" />
              <Text style={s.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [s.heroCta, pressed && { opacity: 0.85 }]}
          onPress={onPress}
        >
          <Text style={s.heroCtaText}>Decouvrir LPP+</Text>
        </Pressable>

        <Text style={s.heroDisclaimer}>Annulable a tout moment. Sans impact sur l'algorithme.</Text>
      </LinearGradient>
    </Pressable>
  );
}

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    // Active state (subscribed)
    activeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      padding: espacements.lg,
      marginBottom: espacements.xl,
    },
    activeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.md,
      flex: 1,
    },
    activeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(124, 92, 255, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeInfo: {
      flex: 1,
    },
    activeTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: couleurs.texte,
    },
    activeSubtitle: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      marginTop: 1,
    },

    // Hero card (not subscribed)
    heroCard: {
      borderRadius: rayons.xl,
      padding: espacements.xl,
      marginBottom: espacements.xl,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: espacements.lg,
    },
    heroBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroTitleBlock: {
      flex: 1,
      marginLeft: espacements.md,
    },
    heroName: {
      fontSize: 20,
      fontWeight: '800',
      color: '#fff',
    },
    heroTagline: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
      marginTop: 2,
    },
    heroPriceBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: rayons.full,
      paddingVertical: 6,
      paddingHorizontal: espacements.md,
    },
    heroPriceText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#fff',
    },

    // Benefits
    benefitsList: {
      gap: espacements.sm,
      marginBottom: espacements.lg,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacements.sm,
    },
    benefitText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      flex: 1,
    },

    // CTA
    heroCta: {
      backgroundColor: '#fff',
      borderRadius: rayons.full,
      paddingVertical: 13,
      alignItems: 'center',
      marginBottom: espacements.sm,
    },
    heroCtaText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#5B3FD9',
    },

    // Disclaimer
    heroDisclaimer: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.5)',
      textAlign: 'center',
    },
  });
