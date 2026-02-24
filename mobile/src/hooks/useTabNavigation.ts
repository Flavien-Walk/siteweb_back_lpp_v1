/**
 * Hook useTabNavigation
 * Remplace le pattern d'onglets duplique dans 5+ fichiers
 * (accueil, profil, projet, boutique, parcours)
 */

import { useState, useCallback, useRef } from 'react';
import type PagerView from 'react-native-pager-view';

interface TabNavigation<T extends string> {
  activeTab: T;
  setActiveTab: (tab: T) => void;
  tabIndex: number;
  handlePageSelected: (e: { nativeEvent: { position: number } }) => void;
  pagerRef: React.RefObject<PagerView | null>;
}

export function useTabNavigation<T extends string>(
  tabs: readonly T[],
  initialTab?: T,
): TabNavigation<T> {
  const [activeTab, setActiveTabState] = useState<T>(initialTab ?? tabs[0]);
  const pagerRef = useRef<PagerView | null>(null);

  const tabIndex = tabs.indexOf(activeTab);

  const setActiveTab = useCallback((tab: T) => {
    setActiveTabState(tab);
    const index = tabs.indexOf(tab);
    if (index >= 0) {
      pagerRef.current?.setPage(index);
    }
  }, [tabs]);

  const handlePageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    const index = e.nativeEvent.position;
    if (index >= 0 && index < tabs.length) {
      setActiveTabState(tabs[index]);
    }
  }, [tabs]);

  return {
    activeTab,
    setActiveTab,
    tabIndex,
    handlePageSelected,
    pagerRef,
  };
}
