/**
 * Hook useLoadingState
 * Remplace le pattern [chargement, setChargement] + [rafraichissement, setRafraichissement]
 * duplique dans 13+ fichiers
 */

import { useState, useCallback } from 'react';

interface LoadingState {
  chargement: boolean;
  rafraichissement: boolean;
  erreur: string | null;
  demarrerChargement: () => void;
  arreterChargement: () => void;
  demarrerRafraichissement: () => void;
  arreterRafraichissement: () => void;
  setErreur: (erreur: string | null) => void;
}

export function useLoadingState(initialChargement = true): LoadingState {
  const [chargement, setChargement] = useState(initialChargement);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const demarrerChargement = useCallback(() => {
    setChargement(true);
    setErreur(null);
  }, []);

  const arreterChargement = useCallback(() => {
    setChargement(false);
  }, []);

  const demarrerRafraichissement = useCallback(() => {
    setRafraichissement(true);
    setErreur(null);
  }, []);

  const arreterRafraichissement = useCallback(() => {
    setRafraichissement(false);
  }, []);

  return {
    chargement,
    rafraichissement,
    erreur,
    demarrerChargement,
    arreterChargement,
    demarrerRafraichissement,
    arreterRafraichissement,
    setErreur,
  };
}
