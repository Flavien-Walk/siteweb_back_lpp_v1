/**
 * AppBadge - Composant badge unifie pour toute l'app
 *
 * 3 types : role (statut utilisateur), verified (certification), level (gamification)
 * 4 variants : soft (bg transparente), solid (bg pleine), outline (bordure), ghost (pas de bg)
 * 3 tailles : xs (commentaires), sm (feed/headers), md (profils)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserBadgeConfig, isStaffRole, VERIFIED_BADGE_COLOR } from '../utils/userDisplay';
import { rayons } from '../constantes/theme';

// ============ DESIGN TOKENS ============

const BADGE_SIZES = {
  xs: { fontSize: 9, iconSize: 9, paddingH: 5, paddingV: 2, gap: 2 },
  sm: { fontSize: 10, iconSize: 11, paddingH: 7, paddingV: 3, gap: 3 },
  md: { fontSize: 12, iconSize: 14, paddingH: 8, paddingV: 4, gap: 4 },
} as const;

type BadgeSize = keyof typeof BADGE_SIZES;
type BadgeVariant = 'soft' | 'solid' | 'outline' | 'ghost';

// ============ TYPES ============

interface RoleBadgeProps {
  type: 'role';
  role?: string;
  statut?: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
}

interface VerifiedBadgeProps {
  type: 'verified';
  size?: BadgeSize;
  variant?: BadgeVariant;
  /** Affiche uniquement l'icone (pas de pill) — utile inline avec le nom */
  iconOnly?: boolean;
}

interface LevelBadgeProps {
  type: 'level';
  level: number;
  levelName?: string;
  levelIcon?: string;
  xp?: number;
  size?: BadgeSize;
  variant?: BadgeVariant;
  /** Affiche seulement "Niv.X" sans le nom */
  compact?: boolean;
}

export type AppBadgeProps = RoleBadgeProps | VerifiedBadgeProps | LevelBadgeProps;

// ============ HELPERS INTERNES ============

/** Retourne la couleur de fond selon le variant */
function getBgColor(color: string, variant: BadgeVariant): string | undefined {
  switch (variant) {
    case 'soft': return `${color}15`;
    case 'solid': return color;
    case 'outline': return 'transparent';
    case 'ghost': return 'transparent';
  }
}

/** Retourne la couleur du texte/icone selon le variant */
function getFgColor(color: string, variant: BadgeVariant): string {
  switch (variant) {
    case 'solid': return '#FFFFFF';
    default: return color;
  }
}

/** Retourne la bordure selon le variant */
function getBorderStyle(color: string, variant: BadgeVariant) {
  if (variant === 'outline') {
    return { borderWidth: 1, borderColor: `${color}40` };
  }
  return {};
}

// ============ COMPOSANT ============

export default function AppBadge(props: AppBadgeProps) {
  const size = props.size || 'sm';
  const variant = props.variant || 'soft';
  const tokens = BADGE_SIZES[size];

  // --- VERIFIED BADGE ---
  if (props.type === 'verified') {
    const color = VERIFIED_BADGE_COLOR;
    const fg = getFgColor(color, variant);

    // Mode icone seule (inline avec le nom d'auteur)
    if (props.iconOnly) {
      return (
        <Ionicons
          name="checkmark-circle"
          size={tokens.iconSize}
          color={color}
          style={{ marginLeft: tokens.gap }}
        />
      );
    }

    return (
      <View style={[
        styles.pill,
        {
          backgroundColor: getBgColor(color, variant),
          paddingHorizontal: tokens.paddingH,
          paddingVertical: tokens.paddingV,
          gap: tokens.gap,
        },
        getBorderStyle(color, variant),
      ]}>
        <Ionicons name="shield-checkmark" size={tokens.iconSize} color={fg} />
        <Text style={[styles.label, { fontSize: tokens.fontSize, color: fg }]}>
          Verifie
        </Text>
      </View>
    );
  }

  // --- LEVEL BADGE ---
  if (props.type === 'level') {
    const color = '#7C5CFF'; // primaire
    const fg = getFgColor(color, variant);
    const iconName = (props.levelIcon || 'trophy-outline') as any;

    let text: string;
    if (props.compact) {
      text = `Niv.${props.level}`;
    } else if (props.levelName && props.xp != null) {
      text = `${props.levelName} \u00B7 ${props.xp} XP`;
    } else if (props.levelName) {
      text = `Niv.${props.level} ${props.levelName}`;
    } else {
      text = `Niv.${props.level}`;
    }

    return (
      <View style={[
        styles.pill,
        {
          backgroundColor: getBgColor(color, variant),
          paddingHorizontal: tokens.paddingH,
          paddingVertical: tokens.paddingV,
          gap: tokens.gap,
        },
        getBorderStyle(color, variant),
      ]}>
        <Ionicons name={iconName} size={tokens.iconSize} color={fg} />
        <Text style={[styles.label, { fontSize: tokens.fontSize, color: fg }]}>
          {text}
        </Text>
      </View>
    );
  }

  // --- ROLE BADGE ---
  const config = getUserBadgeConfig(props.role, props.statut);
  const color = config.color;
  const fg = getFgColor(color, variant);

  return (
    <View style={[
      styles.pill,
      {
        backgroundColor: getBgColor(color, variant),
        paddingHorizontal: tokens.paddingH,
        paddingVertical: tokens.paddingV,
        gap: tokens.gap,
      },
      getBorderStyle(color, variant),
    ]}>
      <Ionicons name={config.icon} size={tokens.iconSize} color={fg} />
      <Text style={[styles.label, { fontSize: tokens.fontSize, color: fg }]}>
        {config.label}
      </Text>
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rayons.full,
  },
  label: {
    fontWeight: '700',
  },
});
