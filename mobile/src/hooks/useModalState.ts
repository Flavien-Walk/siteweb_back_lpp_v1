/**
 * Hook useModalState
 * Remplace le pattern [visible, setVisible] = useState(false) + open/close
 * duplique 20+ fois dans les ecrans et composants
 */

import { useState, useCallback } from 'react';

interface ModalState<T = undefined> {
  visible: boolean;
  data: T | undefined;
  ouvrir: (data?: T) => void;
  fermer: () => void;
  toggle: () => void;
}

export function useModalState<T = undefined>(initialVisible = false): ModalState<T> {
  const [visible, setVisible] = useState(initialVisible);
  const [data, setData] = useState<T | undefined>(undefined);

  const ouvrir = useCallback((newData?: T) => {
    setData(newData);
    setVisible(true);
  }, []);

  const fermer = useCallback(() => {
    setVisible(false);
    // Delai pour laisser l'animation de fermeture se jouer
    setTimeout(() => setData(undefined), 300);
  }, []);

  const toggle = useCallback(() => {
    setVisible(prev => !prev);
  }, []);

  return { visible, data, ouvrir, fermer, toggle };
}
