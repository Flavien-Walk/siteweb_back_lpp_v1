/**
 * Service gamification mobile
 * Appels API vers le nouveau systeme de gamification.
 */

import api, { ReponseAPI } from './api';

// === TYPES ===

export interface QuestProgress {
  questId: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  progress: number;
  target: number;
  xpReward: number;
  isCompleted: boolean;
  mobileAction?: string;
  chapter?: string;
}

export interface OnboardingStep {
  stepId: string;
  title: string;
  description: string;
  icon: string;
  mobileAction: string;
  isCompleted: boolean;
}

export interface OnboardingState {
  version: number;
  currentStep: number;
  steps: OnboardingStep[];
  isDismissed: boolean;
  isComplete: boolean;
}

export interface GamificationState {
  level: number;
  levelName: string;
  levelIcon: string;
  xp: number;
  xpInLevel: number;
  xpForNextLevel: number;
  nextLevelName: string | null;
  streakDays: number;
  roleContext: 'visiteur' | 'entrepreneur';
  quickQuests: QuestProgress[];
  quests: QuestProgress[];
  onboarding: OnboardingState;
}

export interface GamificationDelta {
  xpGained: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  levelName: string;
  levelIcon: string;
  questsUpdated: {
    questId: string;
    progress: number;
    target: number;
    completedAt?: string;
  }[];
  onboardingStepCompleted?: string;
}

// === API ===

/**
 * Recuperer l'etat complet de gamification
 */
export const getMyGamification = async (): Promise<ReponseAPI<GamificationState>> => {
  return api.get('/gamification/me', true);
};

/**
 * Recuperer les quetes rapides (refresh leger)
 */
export const getQuickQuests = async (): Promise<ReponseAPI<{
  quickQuests: QuestProgress[];
  level: number;
  xp: number;
}>> => {
  return api.get('/gamification/quick-quests', true);
};

/**
 * Mettre l'onboarding en pause
 */
export const dismissOnboarding = async (): Promise<ReponseAPI<void>> => {
  return api.post('/gamification/onboarding/dismiss', {}, true);
};

/**
 * Reprendre l'onboarding
 */
export const resumeOnboarding = async (): Promise<ReponseAPI<void>> => {
  return api.post('/gamification/onboarding/resume', {}, true);
};

/**
 * Badge public d'un utilisateur
 */
export const getPublicGamification = async (userId: string): Promise<ReponseAPI<{
  level: number;
  levelName: string;
  levelIcon: string;
  xp: number;
  streakDays?: number;
}>> => {
  return api.get(`/gamification/public/${userId}`, true);
};
