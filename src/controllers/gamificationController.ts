/**
 * Controller gamification
 * Endpoints pour recuperer l'etat, les quetes rapides, et l'onboarding.
 */

import { Request, Response } from 'express';
import UserGamification from '../models/UserGamification.js';
import {
  getLevelInfo,
  getXpForLevel,
  getXpForNextLevel,
  QUEST_DEFINITIONS,
  ONBOARDING_STEPS,
  assignQuickQuests,
  assignChapterQuests,
} from '../services/gamificationEngine.js';

/**
 * GET /api/gamification/me
 * Retourne l'etat complet de gamification de l'utilisateur connecte.
 */
export const getMyGamification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    let gamDoc = await UserGamification.findOne({ userId });

    // Creer le doc si inexistant
    if (!gamDoc) {
      const role = req.utilisateur!.statut === 'entrepreneur' ? 'entrepreneur' : 'visiteur';
      gamDoc = await UserGamification.create({
        userId,
        roleContext: role as 'visiteur' | 'entrepreneur',
      });
    }

    // Synchroniser le role si change
    const currentRole = req.utilisateur!.statut === 'entrepreneur' ? 'entrepreneur' : 'visiteur';
    if (gamDoc.roleContext !== currentRole) {
      gamDoc.roleContext = currentRole as 'visiteur' | 'entrepreneur';
      await gamDoc.save();
    }

    // Assigner les quetes rapides si necessaire (< 3 actives)
    const activeQuickNonComplete = gamDoc.activeQuickQuests.filter(q => !q.completedAt);
    if (activeQuickNonComplete.length < 3) {
      const newQuickQuests = assignQuickQuests(gamDoc.roleContext, gamDoc.activeQuickQuests);
      gamDoc.activeQuickQuests = newQuickQuests as any;
      await gamDoc.save();
    }

    // Assigner les quetes de chapitre si vides
    if (gamDoc.activeQuests.length === 0) {
      const chapterQuests = assignChapterQuests(gamDoc.roleContext, []);
      gamDoc.activeQuests = chapterQuests as any;
      await gamDoc.save();
    }

    const levelInfo = getLevelInfo(gamDoc.level, gamDoc.roleContext);
    const xpInLevel = gamDoc.xp - getXpForLevel(gamDoc.level);
    const xpForNext = getXpForNextLevel(gamDoc.level);

    // Enrichir les quetes avec les definitions
    const enrichQuest = (q: any) => {
      const def = QUEST_DEFINITIONS.find(d => d.questId === q.questId);
      return {
        questId: q.questId,
        title: def?.title || q.questId,
        description: def?.description || '',
        icon: def?.icon || 'flag-outline',
        color: def?.color || '#7C5CFF',
        progress: q.progress,
        target: q.target,
        xpReward: def?.xpReward || 0,
        isCompleted: !!q.completedAt,
        mobileAction: def?.mobileAction || null,
        chapter: def?.chapter || null,
      };
    };

    // Onboarding steps enrichis
    const relevantSteps = ONBOARDING_STEPS
      .filter(s => s.audience === 'all' || s.audience === gamDoc!.roleContext)
      .sort((a, b) => a.order - b.order);

    const onboardingSteps = relevantSteps.map(s => ({
      stepId: s.stepId,
      title: s.title,
      description: s.description,
      icon: s.icon,
      mobileAction: s.mobileAction,
      isCompleted: gamDoc!.onboarding.completedSteps.includes(s.stepId),
    }));

    res.json({
      succes: true,
      data: {
        level: gamDoc.level,
        levelName: levelInfo.name,
        levelIcon: levelInfo.icon,
        xp: gamDoc.xp,
        xpInLevel,
        xpForNextLevel: xpForNext,
        nextLevelName: levelInfo.nextLevelName,
        streakDays: gamDoc.streakDays,
        roleContext: gamDoc.roleContext,
        quickQuests: gamDoc.activeQuickQuests.map(enrichQuest),
        quests: gamDoc.activeQuests.map(enrichQuest),
        onboarding: {
          version: gamDoc.onboarding.version,
          currentStep: gamDoc.onboarding.currentStep,
          steps: onboardingSteps,
          isDismissed: !!gamDoc.onboarding.dismissedAt,
          isComplete: onboardingSteps.every(s => s.isCompleted),
        },
      },
    });
  } catch (error) {
    console.error('[Gamification] Erreur getMyGamification:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/gamification/quick-quests
 * Retourne uniquement les 3 quetes rapides actives (pour refresh rapide home).
 */
export const getQuickQuests = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const gamDoc = await UserGamification.findOne({ userId });

    if (!gamDoc) {
      res.json({ succes: true, data: { quickQuests: [] } });
      return;
    }

    const enrichQuest = (q: any) => {
      const def = QUEST_DEFINITIONS.find(d => d.questId === q.questId);
      return {
        questId: q.questId,
        title: def?.title || q.questId,
        description: def?.description || '',
        icon: def?.icon || 'flag-outline',
        color: def?.color || '#7C5CFF',
        progress: q.progress,
        target: q.target,
        xpReward: def?.xpReward || 0,
        isCompleted: !!q.completedAt,
        mobileAction: def?.mobileAction || null,
      };
    };

    // Ne retourner que les non-completees (max 3)
    const activeQuests = gamDoc.activeQuickQuests
      .filter(q => !q.completedAt)
      .slice(0, 3)
      .map(enrichQuest);

    res.json({
      succes: true,
      data: {
        quickQuests: activeQuests,
        level: gamDoc.level,
        xp: gamDoc.xp,
      },
    });
  } catch (error) {
    console.error('[Gamification] Erreur getQuickQuests:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/gamification/onboarding/dismiss
 * L'utilisateur choisit "Plus tard" sur l'onboarding.
 */
export const dismissOnboarding = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    const updated = await UserGamification.findOneAndUpdate(
      { userId },
      { $set: { 'onboarding.dismissedAt': new Date() } },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ succes: false, message: 'Profil gamification non trouve.' });
      return;
    }

    res.json({ succes: true, message: 'Onboarding mis en pause.' });
  } catch (error) {
    console.error('[Gamification] Erreur dismissOnboarding:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * POST /api/gamification/onboarding/resume
 * L'utilisateur reprend l'onboarding.
 */
export const resumeOnboarding = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    const updated = await UserGamification.findOneAndUpdate(
      { userId },
      { $set: { 'onboarding.dismissedAt': null } },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ succes: false, message: 'Profil gamification non trouve.' });
      return;
    }

    res.json({ succes: true, message: 'Onboarding repris.' });
  } catch (error) {
    console.error('[Gamification] Erreur resumeOnboarding:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};

/**
 * GET /api/gamification/public/:userId
 * Badge public d'un utilisateur (pour affichage sur profil visiteur).
 */
export const getPublicGamification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const gamDoc = await UserGamification.findOne({ userId }).lean();

    if (!gamDoc) {
      res.json({
        succes: true,
        data: {
          level: 1,
          levelName: 'Curieux',
          levelIcon: 'eye-outline',
          xp: 0,
        },
      });
      return;
    }

    const levelInfo = getLevelInfo(gamDoc.level, gamDoc.roleContext);

    res.json({
      succes: true,
      data: {
        level: gamDoc.level,
        levelName: levelInfo.name,
        levelIcon: levelInfo.icon,
        xp: gamDoc.xp,
        streakDays: gamDoc.streakDays,
      },
    });
  } catch (error) {
    console.error('[Gamification] Erreur getPublicGamification:', error);
    res.status(500).json({ succes: false, message: 'Erreur serveur.' });
  }
};
