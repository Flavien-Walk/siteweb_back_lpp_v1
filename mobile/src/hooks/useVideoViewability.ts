/**
 * Hook useVideoViewability
 * Gere la lecture/pause automatique des videos selon leur visibilite a l'ecran
 * Extrait du pattern scroll-based video play/pause (~90 lignes dans accueil.tsx)
 */

import { useState, useCallback, useRef } from 'react';
import type { ViewToken } from 'react-native';

interface VideoViewability {
  /** Index de la publication actuellement visible (pour auto-play video) */
  visibleVideoIndex: number | null;
  /** Callback pour onViewableItemsChanged de FlatList */
  onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  /** Config de viewabilite pour FlatList */
  viewabilityConfig: { itemVisiblePercentThreshold: number };
  /** Ref stable pour onViewableItemsChanged (requis par FlatList) */
  viewabilityConfigCallbackPairs: React.MutableRefObject<Array<{
    viewabilityConfig: { itemVisiblePercentThreshold: number };
    onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  }>>;
}

export function useVideoViewability(threshold = 80): VideoViewability {
  const [visibleVideoIndex, setVisibleVideoIndex] = useState<number | null>(null);

  const viewabilityConfig = { itemVisiblePercentThreshold: threshold };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const firstVisible = viewableItems[0];
      setVisibleVideoIndex(firstVisible.index ?? null);
    } else {
      setVisibleVideoIndex(null);
    }
  }, []);

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  return {
    visibleVideoIndex,
    onViewableItemsChanged,
    viewabilityConfig,
    viewabilityConfigCallbackPairs,
  };
}
