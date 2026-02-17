/**
 * Controller gamification
 * Endpoints pour recuperer l'etat, les quetes rapides, et l'onboarding.
 */

import { Request, Response } from 'express';
import UserGamification from '../models/UserGamification.js';
import Publication from '../models/Publication.js';
import Projet from '../models/Projet.js';
import Utilisateur from '../models/Utilisateur.js';
import GamificationEvent from '../models/GamificationEvent.js';
import {
  getLevelInfo,
  getXpForLevel,
  getXpForNextLevel,
  QUEST_DEFINITIONS,
  ONBOARDING_STEPS,
  assignQuickQuests,
  assignChapterQuests,
  computeLevel,
  XP_CONFIG,
} from '../services/gamificationEngine.js';
import type { GamificationEventType } from '../models/GamificationEvent.js';

/**
 * GET /api/gamification/me
 * Retourne l'etat complet de gamification de l'utilisateur connecte.
 */
export const getMyGamification = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    let gamDoc = await UserGamification.findOne({ userId });

    // Creer le doc si inexistant — avec catch-up pour comptes existants
    let isNewDoc = false;
    if (!gamDoc) {
      const role = req.utilisateur!.statut === 'entrepreneur' ? 'entrepreneur' : 'visiteur';
      gamDoc = await UserGamification.create({
        userId,
        roleContext: role as 'visiteur' | 'entrepreneur',
      });
      isNewDoc = true;
    }

    // Catch-up comptes existants : scanner les donnees deja presentes
    if (isNewDoc) {
      try {
        const userIdStr = userId.toString();
        const [likesCount, commentsCount, postsCount, friendsCount, followedProjects, userDoc] = await Promise.all([
          Publication.countDocuments({ likes: userId }),
          Publication.countDocuments({ 'commentaires.auteur': userId }),
          Publication.countDocuments({ auteur: userId }),
          Utilisateur.findById(userId).select('amis').lean().then((u: any) => u?.amis?.length || 0),
          Projet.find({ followers: userId }).select('_id').lean(),
          Utilisateur.findById(userId).select('bio avatar').lean(),
        ]);

        // Compter les actions existantes pour pre-remplir les quetes
        const existingCounts: Partial<Record<GamificationEventType, number>> = {
          like_post: likesCount,
          comment_post: commentsCount,
          create_post: postsCount,
          add_friend: friendsCount,
          follow_project: followedProjects.length,
          view_project: followedProjects.length, // approximation: si follow, a vu
        };

        // Profil complet ?
        if (userDoc && (userDoc as any).bio && (userDoc as any).avatar) {
          existingCounts.complete_profile = 1;
        }

        // Projets crees (entrepreneur)
        if (gamDoc.roleContext === 'entrepreneur') {
          const projetsCount = await Projet.countDocuments({ porteur: userId });
          const publishedCount = await Projet.countDocuments({ porteur: userId, estPublie: true });
          existingCounts.create_project = projetsCount;
          existingCounts.publish_project = publishedCount;
        }

        // Calculer XP retroactif et pre-remplir progression quetes
        let catchUpXp = 0;
        for (const [action, count] of Object.entries(existingCounts)) {
          if (count && count > 0) {
            const xpPerAction = XP_CONFIG[action as GamificationEventType] || 0;
            // Limiter le catch-up XP pour ne pas donner trop (max 50 par type)
            const cappedCount = Math.min(count, 50);
            catchUpXp += xpPerAction * cappedCount;
          }
        }

        if (catchUpXp > 0) {
          const newLevel = computeLevel(catchUpXp);
          await UserGamification.updateOne({ userId }, {
            $set: { xp: catchUpXp, level: newLevel },
          });
          gamDoc.xp = catchUpXp;
          gamDoc.level = newLevel;
        }

        // Pre-remplir progression des quetes rapides et chapitre
        const prePopulateQuests = (quests: any[]) => {
          for (const quest of quests) {
            const def = QUEST_DEFINITIONS.find(d => d.questId === quest.questId);
            if (!def) continue;
            const existingCount = existingCounts[def.targetAction] || 0;
            if (existingCount > 0) {
              quest.progress = Math.min(existingCount, quest.target);
              if (quest.progress >= quest.target) {
                quest.completedAt = new Date();
              }
            }
          }
        };

        // Assigner quetes puis pre-remplir
        const quickQuests = assignQuickQuests(gamDoc.roleContext, []);
        const chapterQuests = assignChapterQuests(gamDoc.roleContext, []);
        prePopulateQuests(quickQuests);
        prePopulateQuests(chapterQuests);

        gamDoc.activeQuickQuests = quickQuests as any;
        gamDoc.activeQuests = chapterQuests as any;

        // Pre-remplir onboarding
        const role = gamDoc.roleContext;
        const relevantOnboarding = ONBOARDING_STEPS.filter(
          s => s.audience === 'all' || s.audience === role
        );
        const completedOnboardingSteps: string[] = [];
        for (const step of relevantOnboarding) {
          const count = existingCounts[step.targetAction] || 0;
          if (count > 0) {
            completedOnboardingSteps.push(step.stepId);
          }
        }
        gamDoc.onboarding.completedSteps = completedOnboardingSteps;
        gamDoc.onboarding.currentStep = completedOnboardingSteps.length;

        await gamDoc.save();
      } catch (catchUpError) {
        console.error('[Gamification] Erreur catch-up:', catchUpError);
      }
    }

    // Synchroniser le role si change
    const currentRole = req.utilisateur!.statut === 'entrepreneur' ? 'entrepreneur' : 'visiteur';
    if (gamDoc.roleContext !== currentRole) {
      gamDoc.roleContext = currentRole as 'visiteur' | 'entrepreneur';
      await gamDoc.save();
    }

    // Assigner les quetes rapides si necessaire (< 3 actives non completees)
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

    // Reassigner si moins de 3 actives non completees (recycle si pool epuise)
    const activeNonComplete = gamDoc.activeQuickQuests.filter(q => !q.completedAt);
    if (activeNonComplete.length < 3) {
      const refreshed = assignQuickQuests(gamDoc.roleContext, gamDoc.activeQuickQuests);
      gamDoc.activeQuickQuests = refreshed as any;
      await gamDoc.save();
    }

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
