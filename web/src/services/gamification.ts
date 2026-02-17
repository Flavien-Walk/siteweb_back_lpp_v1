/**
 * Service gamification web
 * Types + appels API vers le systeme de gamification.
 */

import api, { type ReponseAPI } from './api';

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

export interface PublicGamification {
  level: number;
  levelName: string;
  levelIcon: string;
  xp: number;
  streakDays?: number;
}

// === API ===

export const getMyGamification = (): Promise<ReponseAPI<GamificationState>> =>
  api.get('/gamification/me', true);

export const getQuickQuests = (): Promise<ReponseAPI<{
  quickQuests: QuestProgress[];
  level: number;
  xp: number;
}>> =>
  api.get('/gamification/quick-quests', true);

export const getPublicGamification = (userId: string): Promise<ReponseAPI<PublicGamification>> =>
  api.get(`/gamification/public/${userId}`, true);
