/**
 * Hook useAutoRefresh
 * Gère le rafraîchissement automatique des données sur toutes les pages
 * - Rafraîchit au focus de l'écran
 * - Polling léger en arrière-plan (configurable)
 * - Arrête le polling quand l'app passe en arrière-plan
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';

interface UseAutoRefreshOptions {
  /**
   * Fonction appelée pour rafraîchir les données
   */
  onRefresh: () => Promise<void>;

  /**
   * Intervalle de polling en millisecondes (défaut: 30000 = 30s)
   * Mettre à 0 pour désactiver le polling
   */
  pollingInterval?: number;

  /**
   * Rafraîchir au focus de l'écran (défaut: true)
   */
  refreshOnFocus?: boolean;

  /**
   * Délai minimum entre deux rafraîchissements en ms (défaut: 5000 = 5s)
   * Évite les rafraîchissements trop fréquents
   */
  minRefreshInterval?: number;

  /**
   * Activer le polling (défaut: true)
   */
  enablePolling?: boolean;

  /**
   * Activer le hook (défaut: true)
   * Permet de désactiver temporairement le refresh
   */
  enabled?: boolean;
}

interface UseAutoRefreshReturn {
  /**
   * Déclencher un rafraîchissement manuel
   */
  refresh: () => Promise<void>;

  /**
   * Timestamp du dernier rafraîchissement
   */
  lastRefreshTime: number | null;
}

export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const {
    onRefresh,
    pollingInterval = 30000, // 30 secondes par défaut
    refreshOnFocus = true,
    minRefreshInterval = 5000, // 5 secondes minimum entre refreshes
    enablePolling = true,
    enabled = true,
  } = options;

  const lastRefreshRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isRefreshingRef = useRef(false);

  // Fonction de rafraîchissement avec protection contre les appels multiples
  const refresh = useCallback(async () => {
    if (!enabled) return;

    // Éviter les rafraîchissements simultanés
    if (isRefreshingRef.current) return;

    // Vérifier le délai minimum
    const now = Date.now();
    if (lastRefreshRef.current && now - lastRefreshRef.current < minRefreshInterval) {
      return;
    }

    try {
      isRefreshingRef.current = true;
      await onRefresh();
      lastRefreshRef.current = now;
    } catch (error) {
      console.error('[useAutoRefresh] Erreur lors du rafraîchissement:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [onRefresh, minRefreshInterval, enabled]);

  // Démarrer le polling
  const startPolling = useCallback(() => {
    if (!enablePolling || pollingInterval <= 0 || !enabled) return;

    // Arrêter l'ancien polling s'il existe
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(() => {
      // Ne faire le polling que si l'app est au premier plan
      if (appStateRef.current === 'active') {
        refresh();
      }
    }, pollingInterval);
  }, [enablePolling, pollingInterval, refresh, enabled]);

  // Arrêter le polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Gérer les changements d'état de l'app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App revient au premier plan
      if (appStateRef.current !== 'active' && nextAppState === 'active') {
        // Rafraîchir les données
        refresh();
        // Redémarrer le polling
        startPolling();
      }
      // App passe en arrière-plan
      else if (appStateRef.current === 'active' && nextAppState !== 'active') {
        // Arrêter le polling pour économiser la batterie
        stopPolling();
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [refresh, startPolling, stopPolling]);

  // Rafraîchir au focus de l'écran
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus && enabled) {
        refresh();
      }

      // Démarrer le polling au focus
      if (enablePolling && enabled) {
        startPolling();
      }

      return () => {
        // Arrêter le polling quand l'écran perd le focus
        stopPolling();
      };
    }, [refresh, refreshOnFocus, enablePolling, startPolling, stopPolling, enabled])
  );

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    refresh,
    lastRefreshTime: lastRefreshRef.current,
  };
}

/**
 * Hook simplifié pour les notifications et messages
 * Polling plus fréquent (15s) pour une meilleure réactivité
 */
export function useNotificationsRefresh(onRefresh: () => Promise<void>, enabled = true) {
  return useAutoRefresh({
    onRefresh,
    pollingInterval: 15000, // 15 secondes
    refreshOnFocus: true,
    minRefreshInterval: 3000, // 3 secondes minimum
    enablePolling: true,
    enabled,
  });
}

/**
 * Hook simplifié pour les données générales (publications, projets)
 * Polling moins fréquent (60s) pour économiser la batterie
 */
export function useDataRefresh(onRefresh: () => Promise<void>, enabled = true) {
  return useAutoRefresh({
    onRefresh,
    pollingInterval: 60000, // 60 secondes
    refreshOnFocus: true,
    minRefreshInterval: 10000, // 10 secondes minimum
    enablePolling: true,
    enabled,
  });
}

export default useAutoRefresh;
