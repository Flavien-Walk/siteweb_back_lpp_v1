/**
 * Contexte gamification - Store global pour XP, niveaux, quetes rapides, onboarding.
 *
 * Charge l'etat initial via GET /gamification/me.
 * Applique des optimistic updates locaux quand le backend retourne un champ `gamification`.
 * Expose des methodes pour rafraichir, notifier un delta, et gerer l'onboarding.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import {
  GamificationState,
  GamificationDelta,
  QuestProgress,
  getMyGamification,
  getQuickQuests,
  dismissOnboarding as apiDismissOnboarding,
  resumeOnboarding as apiResumeOnboarding,
} from '../services/gamification';
import { useUser } from './UserContext';

// === TYPES ===

interface GamificationContextType {
  /** Etat complet de gamification */
  state: GamificationState | null;
  /** Chargement en cours */
  isLoading: boolean;
  /** Recharger l'etat complet depuis le backend */
  refresh: () => Promise<void>;
  /** Appliquer un delta recu depuis une reponse API (optimistic sync) */
  applyDelta: (delta: GamificationDelta) => void;
  /** Mettre l'onboarding en pause */
  dismissOnboarding: () => Promise<void>;
  /** Reprendre l'onboarding */
  resumeOnboarding: () => Promise<void>;
  /** XP toast visible */
  xpToast: { xp: number; levelUp: boolean; levelName?: string } | null;
  /** Cacher le toast */
  hideXpToast: () => void;
}

const GamificationContext = createContext<GamificationContextType>({
  state: null,
  isLoading: true,
  refresh: async () => {},
  applyDelta: () => {},
  dismissOnboarding: async () => {},
  resumeOnboarding: async () => {},
  xpToast: null,
  hideXpToast: () => {},
});

export const useGamification = () => useContext(GamificationContext);

// === PROVIDER ===

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { utilisateur, isAuthenticated } = useUser();
  const [state, setState] = useState<GamificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [xpToast, setXpToast] = useState<{ xp: number; levelUp: boolean; levelName?: string } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charger l'etat initial
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getMyGamification();
      if (res.succes && res.data) {
        setState(res.data);
      }
    } catch (err) {
      console.warn('[Gamification] Erreur refresh:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Charger au montage si authentifie
  useEffect(() => {
    if (isAuthenticated && utilisateur) {
      refresh();
    } else {
      setState(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, utilisateur?._id]);

  // Appliquer un delta recu depuis une reponse API
  const applyDelta = useCallback((delta: GamificationDelta) => {
    if (!delta) return;

    // Afficher le toast XP
    if (delta.xpGained > 0) {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      setXpToast({
        xp: delta.xpGained,
        levelUp: delta.leveledUp,
        levelName: delta.leveledUp ? delta.levelName : undefined,
      });
      toastTimeout.current = setTimeout(() => setXpToast(null), 3000);
    }

    setState(prev => {
      if (!prev) return prev;
      const updated = { ...prev };

      // MAJ XP et niveau
      updated.xp = delta.newXp;
      updated.level = delta.newLevel;
      updated.levelName = delta.levelName;
      updated.levelIcon = delta.levelIcon;

      // MAJ progression des quetes rapides
      if (delta.questsUpdated.length > 0) {
        updated.quickQuests = prev.quickQuests.map(q => {
          const upd = delta.questsUpdated.find(u => u.questId === q.questId);
          if (upd) {
            return {
              ...q,
              progress: upd.progress,
              isCompleted: !!upd.completedAt,
            };
          }
          return q;
        });

        // Aussi mettre a jour les quetes de chapitre
        updated.quests = prev.quests.map(q => {
          const upd = delta.questsUpdated.find(u => u.questId === q.questId);
          if (upd) {
            return {
              ...q,
              progress: upd.progress,
              isCompleted: !!upd.completedAt,
            };
          }
          return q;
        });
      }

      // MAJ onboarding
      if (delta.onboardingStepCompleted && updated.onboarding) {
        updated.onboarding = {
          ...updated.onboarding,
          steps: updated.onboarding.steps.map(s =>
            s.stepId === delta.onboardingStepCompleted
              ? { ...s, isCompleted: true }
              : s
          ),
          currentStep: updated.onboarding.currentStep + 1,
        };
      }

      // Recalculer xpInLevel
      // Formule: level N -> level N+1 = 100*N XP
      const xpForCurrentLevel = computeXpForLevel(updated.level);
      updated.xpInLevel = updated.xp - xpForCurrentLevel;
      updated.xpForNextLevel = 100 * updated.level;

      return updated;
    });

    // Si une quete rapide est completee, refresh pour en obtenir de nouvelles
    const anyQuestCompleted = delta.questsUpdated.some(q => q.completedAt);
    if (anyQuestCompleted) {
      // Delayed refresh pour obtenir les nouvelles quetes
      setTimeout(() => {
        getQuickQuests().then(res => {
          if (res.succes && res.data) {
            setState(prev => prev ? {
              ...prev,
              quickQuests: res.data!.quickQuests,
              xp: res.data!.xp,
              level: res.data!.level,
            } : prev);
          }
        }).catch(() => {});
      }, 1500);
    }
  }, []);

  const hideXpToast = useCallback(() => {
    setXpToast(null);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
  }, []);

  const dismissOnboarding = useCallback(async () => {
    await apiDismissOnboarding().catch(() => {});
    setState(prev => prev ? {
      ...prev,
      onboarding: { ...prev.onboarding, isDismissed: true },
    } : prev);
  }, []);

  const resumeOnboarding = useCallback(async () => {
    await apiResumeOnboarding().catch(() => {});
    setState(prev => prev ? {
      ...prev,
      onboarding: { ...prev.onboarding, isDismissed: false },
    } : prev);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  const value = React.useMemo(() => ({
    state,
    isLoading,
    refresh,
    applyDelta,
    dismissOnboarding,
    resumeOnboarding,
    xpToast,
    hideXpToast,
  }), [state, isLoading, refresh, applyDelta, dismissOnboarding, resumeOnboarding, xpToast, hideXpToast]);

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

// Helper pour calculer l'XP cumulatif a un level
function computeXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += 100 * i;
  }
  return total;
}
