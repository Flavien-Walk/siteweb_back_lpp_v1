/**
 * MarketplaceProductCard — Carte produit pour la grille marketplace
 * Affiche image reelle, categorie, nom, createur avec avatar, prix
 */

import React, { memo, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeCouleurs } from '../contexts/ThemeContext';
import { espacements, rayons } from '../constantes/theme';
import type { MarketplaceProduct } from '../services/boutique';
import { formatProductPrice, getCategoryLabel } from '../services/boutique';

interface MarketplaceProductCardProps {
  product: MarketplaceProduct;
  onPress: (product: MarketplaceProduct) => void;
  couleurs: ThemeCouleurs;
}

export default memo(function MarketplaceProductCard({ product, onPress, couleurs }: MarketplaceProductCardProps) {
  const s = createStyles(couleurs);
  const [imgError, setImgError] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
      onPress={() => onPress(product)}
    >
      {/* Image */}
      <View style={s.imageContainer}>
        {!imgError ? (
          <Image
            source={{ uri: product.image }}
            style={s.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={s.imageFallback}>
            <Ionicons name="image-outline" size={28} color={couleurs.texteMuted} />
          </View>
        )}
        {/* Category tag */}
        <View style={s.categoryTag}>
          <Text style={s.categoryTagText}>{getCategoryLabel(product.categorie)}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={s.content}>
        <Text style={s.name} numberOfLines={1}>{product.nom}</Text>

        {/* Creator row */}
        <View style={s.creatorRow}>
          {product.createur.avatar ? (
            <Image
              source={{ uri: product.createur.avatar }}
              style={s.avatar}
            />
          ) : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarInitial}>{(product.createur?.nom || '?')[0]}</Text>
            </View>
          )}
          <Text style={s.creatorName} numberOfLines={1}>{product.createur?.nom || 'Vendeur'}</Text>
        </View>

        {/* Price */}
        <Text style={s.price}>{formatProductPrice(product.prix)}</Text>
      </View>
    </Pressable>
  );
});

const createStyles = (couleurs: ThemeCouleurs) =>
  StyleSheet.create({
    card: {
      backgroundColor: couleurs.fondCard,
      borderRadius: rayons.lg,
      overflow: 'hidden',
    },
    imageContainer: {
      height: 140,
      backgroundColor: couleurs.fond,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageFallback: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    categoryTag: {
      position: 'absolute',
      top: espacements.sm,
      left: espacements.sm,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: rayons.full,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    categoryTagText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#fff',
    },
    content: {
      padding: espacements.md,
    },
    name: {
      fontSize: 14,
      fontWeight: '600',
      color: couleurs.texte,
      marginBottom: 6,
    },
    creatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    avatar: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    avatarFallback: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#7C5CFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarInitial: {
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
    },
    creatorName: {
      fontSize: 12,
      color: couleurs.texteSecondaire,
      flex: 1,
    },
    price: {
      fontSize: 14,
      fontWeight: '700',
      color: '#7C5CFF',
    },
  });
