/**
 * useDoubleTap - Hook pour détecter les double-taps
 * Gère le timing entre single tap et double tap sans conflit
 */

import { useRef, useCallback } from 'react';

interface DoubleTapConfig {
  onDoubleTap: () => void;
  onSingleTap?: () => void;
  delayMs?: number;
}

/**
 * Hook pour gérer le double-tap avec distinction single/double
 * @param onDoubleTap - Callback appelé sur double-tap
 * @param onSingleTap - Callback optionnel appelé sur single-tap (après délai)
 * @param delayMs - Délai max entre 2 taps (défaut: 250ms)
 */
export function useDoubleTap({
  onDoubleTap,
  onSingleTap,
  delayMs = 250,
}: DoubleTapConfig) {
  const lastTapRef = useRef<number>(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    // Clear any pending single tap
    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
    }

    if (timeSinceLastTap < delayMs && timeSinceLastTap > 0) {
      // Double tap detected
      lastTapRef.current = 0; // Reset to prevent triple-tap issues
      onDoubleTap();
    } else {
      // Potential single tap - wait to see if double tap follows
      lastTapRef.current = now;

      if (onSingleTap) {
        singleTapTimeoutRef.current = setTimeout(() => {
          singleTapTimeoutRef.current = null;
          onSingleTap();
        }, delayMs);
      }
    }
  }, [onDoubleTap, onSingleTap, delayMs]);

  return handleTap;
}

export default useDoubleTap;
