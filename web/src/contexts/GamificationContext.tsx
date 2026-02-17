/**
 * Contexte gamification web
 * Store global pour XP, niveaux, quetes rapides.
 * Charge l'etat initial via GET /gamification/me.
 * Applique des deltas quand le backend retourne un champ `gamification`.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  type GamificationState,
  type GamificationDelta,
  getMyGamification,
  getQuickQuests,
} from '../services/gamification';
import { useAuth } from './AuthContext';

// === TYPES ===

interface XpToast {
  xp: number;
  levelUp: boolean;
  levelName?: string;
}

interface GamificationContextType {
  state: GamificationState | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  applyDelta: (delta: GamificationDelta) => void;
  xpToast: XpToast | null;
  hideXpToast: () => void;
}

const GamificationContext = createContext<GamificationContextType>({
  state: null,
  isLoading: true,
  refresh: async () => {},
  applyDelta: () => {},
  xpToast: null,
  hideXpToast: () => {},
});

export const useGamification = () => useContext(GamificationContext);

// === PROVIDER ===

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { utilisateur } = useAuth();
  const [state, setState] = useState<GamificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [xpToast, setXpToast] = useState<XpToast | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAuthenticated = !!utilisateur;

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

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else {
      setState(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, utilisateur?._id]);

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

      updated.xp = delta.newXp;
      updated.level = delta.newLevel;
      updated.levelName = delta.levelName;
      updated.levelIcon = delta.levelIcon;

      if (delta.questsUpdated.length > 0) {
        updated.quickQuests = prev.quickQuests.map(q => {
          const upd = delta.questsUpdated.find(u => u.questId === q.questId);
          if (upd) {
            return { ...q, progress: upd.progress, isCompleted: !!upd.completedAt };
          }
          return q;
        });

        updated.quests = prev.quests.map(q => {
          const upd = delta.questsUpdated.find(u => u.questId === q.questId);
          if (upd) {
            return { ...q, progress: upd.progress, isCompleted: !!upd.completedAt };
          }
          return q;
        });
      }

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
      const xpForCurrentLevel = computeXpForLevel(updated.level);
      updated.xpInLevel = updated.xp - xpForCurrentLevel;
      updated.xpForNextLevel = 100 * updated.level;

      return updated;
    });

    // Refresh si quete completee
    const anyCompleted = delta.questsUpdated.some(q => q.completedAt);
    if (anyCompleted) {
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

  useEffect(() => {
    return () => {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
    };
  }, []);

  return (
    <GamificationContext.Provider
      value={{ state, isLoading, refresh, applyDelta, xpToast, hideXpToast }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

function computeXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += 100 * i;
  }
  return total;
}
