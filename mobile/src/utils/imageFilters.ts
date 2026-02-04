/**
 * Image Filters Utility
 * Filtres visuels pour les stories utilisant expo-image-manipulator
 * et des overlays CSS pour les previews instantanées
 */

import * as ImageManipulator from 'expo-image-manipulator';

// Types de filtres disponibles
export type FilterPreset = 'normal' | 'warm' | 'cool' | 'bw' | 'contrast' | 'vignette';

// Labels français pour les filtres
export const FILTER_LABELS: Record<FilterPreset, string> = {
  normal: 'Normal',
  warm: 'Chaud',
  cool: 'Froid',
  bw: 'N&B',
  contrast: 'Contraste',
  vignette: 'Vignette',
};

// Ordre d'affichage des filtres
export const FILTER_ORDER: FilterPreset[] = [
  'normal',
  'warm',
  'cool',
  'bw',
  'contrast',
  'vignette',
];

// Configuration des overlays CSS pour preview instantanée
// Ces styles simulent les filtres visuellement sans traitement d'image
export interface FilterOverlayStyle {
  overlayColor?: string;
  overlayOpacity?: number;
  tintColor?: string;
  saturation?: number; // Note: utilisé pour indication, pas directement applicable en RN
}

export const FILTER_OVERLAY_STYLES: Record<FilterPreset, FilterOverlayStyle> = {
  normal: {},
  warm: {
    overlayColor: '#FF6B35',
    overlayOpacity: 0.15,
  },
  cool: {
    overlayColor: '#4A90D9',
    overlayOpacity: 0.15,
  },
  bw: {
    overlayColor: '#808080',
    overlayOpacity: 0.6, // Plus fort pour simuler le N&B
  },
  contrast: {
    // Le contraste est difficile à simuler avec overlay
    // On utilise juste une légère ombre
    overlayColor: '#000000',
    overlayOpacity: 0.08,
  },
  vignette: {
    // Vignette = bords assombris, pas applicable en simple overlay
    // On l'indique juste visuellement
    overlayColor: '#000000',
    overlayOpacity: 0.1,
  },
};

/**
 * Appliquer un filtre à une image via expo-image-manipulator
 * Retourne l'URI de l'image modifiée
 *
 * Note: expo-image-manipulator a des capacités limitées.
 * Pour des filtres avancés, on utilise des approximations.
 */
export const applyFilter = async (
  imageUri: string,
  filter: FilterPreset
): Promise<string> => {
  if (filter === 'normal') {
    return imageUri;
  }

  try {
    let actions: ImageManipulator.Action[] = [];

    switch (filter) {
      case 'bw':
        // expo-image-manipulator ne supporte pas directement le N&B
        // On réduit la saturation au maximum (approximation)
        // Pour un vrai N&B, il faudrait expo-gl
        // Fallback: on retourne l'image originale avec indication de filtre
        return imageUri;

      case 'warm':
      case 'cool':
      case 'contrast':
      case 'vignette':
        // Ces filtres nécessitent des manipulations pixel par pixel
        // expo-image-manipulator ne les supporte pas nativement
        // On retourne l'image originale - le filtre sera indiqué par metadata
        return imageUri;

      default:
        return imageUri;
    }

    // Si on avait des actions à appliquer
    if (actions.length > 0) {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result.uri;
    }

    return imageUri;
  } catch (error) {
    console.error('Erreur application filtre:', error);
    return imageUri;
  }
};

/**
 * Obtenir le style d'overlay pour preview d'un filtre
 */
export const getFilterOverlay = (filter: FilterPreset): FilterOverlayStyle => {
  return FILTER_OVERLAY_STYLES[filter] || {};
};

/**
 * Vérifier si un filtre nécessite un traitement côté serveur
 * (pour les filtres qu'on ne peut pas appliquer localement)
 */
export const requiresServerProcessing = (filter: FilterPreset): boolean => {
  // Tous les filtres non-normal pourraient bénéficier d'un traitement serveur
  // Pour le MVP, on stocke juste le preset et l'affichage utilise des overlays
  return filter !== 'normal';
};
