/**
 * Moteur central de gamification
 * Fonction unique applyGamificationEvent() appelee depuis les controllers existants.
 * Gere: XP, niveaux, progression quetes, idempotence, streak.
 */

import UserGamification, { IUserGamification, IQuestProgress } from '../models/UserGamification.js';
import GamificationEvent, { GamificationEventType } from '../models/GamificationEvent.js';
import Utilisateur from '../models/Utilisateur.js';

// === CONFIGURATION XP PAR ACTION ===

export const XP_CONFIG: Record<GamificationEventType, number> = {
  like_post: 2,
  comment_post: 5,
  follow_user: 3,
  follow_project: 4,
  view_project: 2,
  create_project: 20,
  publish_project: 30,
  complete_profile: 10,
  send_message: 2,
  add_friend: 3,
  create_post: 5,
  view_story: 1,
};

// === NIVEAUX ===
// Formule: xpNeeded(level) = 100 * level (level 1->2 = 100xp, 2->3 = 200xp, etc.)
// Total cumulatif: level 2 = 100, level 3 = 300, level 4 = 600, level 5 = 1000, etc.

export const LEVEL_NAMES: Record<number, { visiteur: string; entrepreneur: string; icon: string }> = {
  1: { visiteur: 'Curieux', entrepreneur: 'Ideateur', icon: 'eye-outline' },
  2: { visiteur: 'Explorateur', entrepreneur: 'Fondateur', icon: 'compass-outline' },
  3: { visiteur: 'Analyste', entrepreneur: 'Batisseur', icon: 'hammer-outline' },
  4: { visiteur: 'Investisseur', entrepreneur: 'Architecte', icon: 'construct-outline' },
  5: { visiteur: 'Visionnaire', entrepreneur: 'Leader', icon: 'diamond-outline' },
  6: { visiteur: 'Mentor', entrepreneur: 'Mogul', icon: 'star-outline' },
  7: { visiteur: 'Legende', entrepreneur: 'Legende', icon: 'trophy-outline' },
};

export function getXpForLevel(level: number): number {
  // XP cumulatif necessaire pour atteindre le level
  // Level 1 = 0, Level 2 = 100, Level 3 = 300, Level 4 = 600, etc.
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += 100 * i;
  }
  return total;
}

export function getXpForNextLevel(level: number): number {
  return 100 * level;
}

export function computeLevel(xp: number): number {
  let level = 1;
  let cumulative = 0;
  while (true) {
    const needed = 100 * level;
    if (cumulative + needed > xp) break;
    cumulative += needed;
    level++;
    if (level >= 7) break; // Cap a level 7
  }
  return level;
}

export function getLevelInfo(level: number, role: 'visiteur' | 'entrepreneur') {
  const maxLevel = 7;
  const clampedLevel = Math.min(level, maxLevel);
  const config = LEVEL_NAMES[clampedLevel] || LEVEL_NAMES[1];
  const name = role === 'entrepreneur' ? config.entrepreneur : config.visiteur;
  const xpForCurrent = getXpForLevel(clampedLevel);
  const xpForNext = clampedLevel < maxLevel ? getXpForLevel(clampedLevel + 1) : null;
  const nextLevelName = clampedLevel < maxLevel
    ? (role === 'entrepreneur' ? LEVEL_NAMES[clampedLevel + 1].entrepreneur : LEVEL_NAMES[clampedLevel + 1].visiteur)
    : null;

  return {
    level: clampedLevel,
    name,
    icon: config.icon,
    xpForCurrent,
    xpForNext,
    xpInLevel: xpForNext ? xpForNext - xpForCurrent : 0,
    nextLevelName,
  };
}

// === QUETES RAPIDES (definitions statiques MVP) ===

export interface QuestDefinition {
  questId: string;
  title: string;
  description: string;
  targetAction: GamificationEventType;
  targetCount: number;
  xpReward: number;
  audience: 'all' | 'visiteur' | 'entrepreneur';
  isQuick: boolean;
  chapter?: string;
  order: number;
  icon: string;
  color: string;
  /** Action a realiser cote mobile (route ou identifiant d'ecran) */
  mobileAction?: string;
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  // === QUETES RAPIDES (affichees sur la Home, rotent selon progression) ===
  // Visiteur
  { questId: 'quick_view_project', title: 'Decouvrir un projet', description: 'Visitez la fiche d\'un projet', targetAction: 'view_project', targetCount: 1, xpReward: 5, audience: 'all', isQuick: true, order: 1, icon: 'eye-outline', color: '#3B82F6', mobileAction: 'discover' },
  { questId: 'quick_follow_project', title: 'Suivre un projet', description: 'Suivez un projet qui vous inspire', targetAction: 'follow_project', targetCount: 1, xpReward: 8, audience: 'all', isQuick: true, order: 2, icon: 'heart-outline', color: '#EF4444', mobileAction: 'discover' },
  { questId: 'quick_like_post', title: 'Aimer un post', description: 'Likez une publication dans le feed', targetAction: 'like_post', targetCount: 1, xpReward: 4, audience: 'all', isQuick: true, order: 3, icon: 'thumbs-up-outline', color: '#F59E0B', mobileAction: 'feed' },
  { questId: 'quick_comment', title: 'Commenter un post', description: 'Partagez votre avis sur un post', targetAction: 'comment_post', targetCount: 1, xpReward: 8, audience: 'all', isQuick: true, order: 4, icon: 'chatbubble-outline', color: '#8B5CF6', mobileAction: 'feed' },
  { questId: 'quick_follow_user', title: 'Se faire un ami', description: 'Envoyez une demande d\'ami', targetAction: 'add_friend', targetCount: 1, xpReward: 6, audience: 'all', isQuick: true, order: 5, icon: 'person-add-outline', color: '#10B981', mobileAction: 'discover' },
  { questId: 'quick_view_3_projects', title: 'Explorer 3 projets', description: 'Visitez 3 fiches projets differentes', targetAction: 'view_project', targetCount: 3, xpReward: 15, audience: 'all', isQuick: true, order: 6, icon: 'rocket-outline', color: '#7C5CFF', mobileAction: 'discover' },
  { questId: 'quick_create_post', title: 'Publier un post', description: 'Partagez quelque chose avec la communaute', targetAction: 'create_post', targetCount: 1, xpReward: 10, audience: 'all', isQuick: true, order: 7, icon: 'create-outline', color: '#2DE2E6', mobileAction: 'create_post' },
  // Entrepreneur specifique
  { questId: 'quick_create_project', title: 'Creer votre projet', description: 'Lancez votre startup sur la plateforme', targetAction: 'create_project', targetCount: 1, xpReward: 25, audience: 'entrepreneur', isQuick: true, order: 8, icon: 'business-outline', color: '#F59E0B', mobileAction: 'entrepreneur' },
  { questId: 'quick_publish_project', title: 'Publier votre projet', description: 'Rendez votre projet visible a tous', targetAction: 'publish_project', targetCount: 1, xpReward: 35, audience: 'entrepreneur', isQuick: true, order: 9, icon: 'megaphone-outline', color: '#10B981', mobileAction: 'entrepreneur' },

  // === QUETES ONBOARDING / CHAPITRE (progression structuree) ===
  // Chapitre 1 - Decouverte (tous)
  { questId: 'onb_complete_profile', title: 'Completer votre profil', description: 'Ajoutez une photo et une bio', targetAction: 'complete_profile', targetCount: 1, xpReward: 15, audience: 'all', isQuick: false, chapter: 'Decouverte', order: 1, icon: 'person-circle-outline', color: '#3B82F6' },
  { questId: 'onb_view_5_projects', title: 'Explorer 5 projets', description: 'Decouvrez ce que la communaute construit', targetAction: 'view_project', targetCount: 5, xpReward: 20, audience: 'all', isQuick: false, chapter: 'Decouverte', order: 2, icon: 'search-outline', color: '#7C5CFF' },
  { questId: 'onb_follow_3_projects', title: 'Suivre 3 projets', description: 'Constituez votre veille startup', targetAction: 'follow_project', targetCount: 3, xpReward: 20, audience: 'all', isQuick: false, chapter: 'Decouverte', order: 3, icon: 'heart-outline', color: '#EF4444' },

  // Chapitre 2 - Engagement (tous)
  { questId: 'onb_like_5', title: 'Aimer 5 posts', description: 'Encouragez les porteurs de projet', targetAction: 'like_post', targetCount: 5, xpReward: 15, audience: 'all', isQuick: false, chapter: 'Engagement', order: 1, icon: 'thumbs-up-outline', color: '#F59E0B' },
  { questId: 'onb_comment_3', title: 'Commenter 3 posts', description: 'Partagez vos retours constructifs', targetAction: 'comment_post', targetCount: 3, xpReward: 25, audience: 'all', isQuick: false, chapter: 'Engagement', order: 2, icon: 'chatbubble-outline', color: '#8B5CF6' },
  { questId: 'onb_add_friend', title: 'Ajouter un ami', description: 'Connectez-vous avec un membre', targetAction: 'add_friend', targetCount: 1, xpReward: 10, audience: 'all', isQuick: false, chapter: 'Engagement', order: 3, icon: 'person-add-outline', color: '#10B981' },

  // Chapitre 3 - Contribution (tous)
  { questId: 'onb_create_post', title: 'Publier un post', description: 'Partagez avec la communaute', targetAction: 'create_post', targetCount: 1, xpReward: 15, audience: 'all', isQuick: false, chapter: 'Contribution', order: 1, icon: 'create-outline', color: '#2DE2E6' },
  { questId: 'onb_send_message', title: 'Envoyer un message', description: 'Contactez un membre ou un projet', targetAction: 'send_message', targetCount: 1, xpReward: 10, audience: 'all', isQuick: false, chapter: 'Contribution', order: 2, icon: 'mail-outline', color: '#F97316' },
  { questId: 'onb_follow_5_users', title: 'Se faire 5 amis', description: 'Elargissez votre reseau', targetAction: 'add_friend', targetCount: 5, xpReward: 25, audience: 'all', isQuick: false, chapter: 'Contribution', order: 3, icon: 'people-outline', color: '#EC4899' },

  // Chapitre Entrepreneur
  { questId: 'onb_create_project', title: 'Creer un projet', description: 'Demarrez votre aventure entrepreneuriale', targetAction: 'create_project', targetCount: 1, xpReward: 30, audience: 'entrepreneur', isQuick: false, chapter: 'Entrepreneur', order: 1, icon: 'business-outline', color: '#F59E0B' },
  { questId: 'onb_publish_project', title: 'Publier votre projet', description: 'Rendez votre projet public', targetAction: 'publish_project', targetCount: 1, xpReward: 40, audience: 'entrepreneur', isQuick: false, chapter: 'Entrepreneur', order: 2, icon: 'megaphone-outline', color: '#10B981' },
];

// === ONBOARDING STEPS ===

export interface OnboardingStepDef {
  stepId: string;
  title: string;
  description: string;
  targetAction: GamificationEventType;
  mobileAction: string;
  icon: string;
  audience: 'all' | 'visiteur' | 'entrepreneur';
  order: number;
}

export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  // Visiteur + tous
  { stepId: 'onb_explore', title: 'Explorer Decouvrir', description: 'Decouvrez les projets de la communaute', targetAction: 'view_project', mobileAction: 'discover', icon: 'compass-outline', audience: 'all', order: 1 },
  { stepId: 'onb_view_project', title: 'Voir une fiche projet', description: 'Consultez les details d\'un projet', targetAction: 'view_project', mobileAction: 'discover', icon: 'eye-outline', audience: 'all', order: 2 },
  { stepId: 'onb_follow', title: 'Suivre un projet', description: 'Suivez un projet pour rester informe', targetAction: 'follow_project', mobileAction: 'discover', icon: 'heart-outline', audience: 'all', order: 3 },
  { stepId: 'onb_like', title: 'Liker un post', description: 'Encouragez un porteur de projet', targetAction: 'like_post', mobileAction: 'feed', icon: 'thumbs-up-outline', audience: 'all', order: 4 },
  { stepId: 'onb_comment', title: 'Commenter un post', description: 'Partagez votre avis', targetAction: 'comment_post', mobileAction: 'feed', icon: 'chatbubble-outline', audience: 'all', order: 5 },
  { stepId: 'onb_friend', title: 'Ajouter un ami', description: 'Connectez-vous avec un membre', targetAction: 'add_friend', mobileAction: 'discover', icon: 'person-add-outline', audience: 'all', order: 6 },
  // Entrepreneur
  { stepId: 'onb_complete_profile', title: 'Completer votre profil', description: 'Ajoutez photo et bio pour inspirer confiance', targetAction: 'complete_profile', mobileAction: 'profile', icon: 'person-circle-outline', audience: 'entrepreneur', order: 1 },
  { stepId: 'onb_create_project', title: 'Creer un projet', description: 'Lancez votre startup sur la plateforme', targetAction: 'create_project', mobileAction: 'entrepreneur', icon: 'business-outline', audience: 'entrepreneur', order: 2 },
  { stepId: 'onb_publish_project', title: 'Publier votre projet', description: 'Rendez votre projet visible a tous', targetAction: 'publish_project', mobileAction: 'entrepreneur', icon: 'megaphone-outline', audience: 'entrepreneur', order: 3 },
  { stepId: 'onb_reply_message', title: 'Repondre a un message', description: 'Engagez la conversation avec un interesse', targetAction: 'send_message', mobileAction: 'messages', icon: 'mail-outline', audience: 'entrepreneur', order: 4 },
];

// === ANTI-SPAM : Limites par type d'action par jour ===

const DAILY_LIMITS: Partial<Record<GamificationEventType, number>> = {
  like_post: 20,
  view_project: 10,
  view_story: 15,
  comment_post: 10,
  send_message: 10,
};

// === MOTEUR PRINCIPAL ===

export interface GamificationResult {
  xpGained: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  levelName: string;
  levelIcon: string;
  questsUpdated: IQuestProgress[];
  onboardingStepCompleted?: string;
}

/**
 * Applique un evenement de gamification pour un utilisateur.
 * Idempotent : verifie les doublons via lastEventsDedup.
 * Atomique : utilise findOneAndUpdate avec $inc.
 */
export async function applyGamificationEvent(
  userId: string,
  eventType: GamificationEventType,
  entityId?: string,
): Promise<GamificationResult | null> {
  try {
    // 1. Recuperer ou creer le doc gamification
    let gamDoc = await UserGamification.findOne({ userId });
    if (!gamDoc) {
      // Determiner le role depuis l'utilisateur
      const user = await Utilisateur.findById(userId).select('statut').lean();
      const role = user?.statut === 'entrepreneur' ? 'entrepreneur' : 'visiteur';

      gamDoc = await UserGamification.create({
        userId,
        roleContext: role as 'visiteur' | 'entrepreneur',
      });
    }

    // 2. Idempotence : verifier si cette action exacte a deja ete comptee
    const dedupKey = entityId ? `${eventType}_${entityId}` : `${eventType}_${Date.now()}`;
    if (entityId) {
      const alreadyDone = gamDoc.lastEventsDedup.some(e => e.key === dedupKey);
      if (alreadyDone) {
        // Retourner l'etat actuel sans modifier
        const info = getLevelInfo(gamDoc.level, gamDoc.roleContext);
        return {
          xpGained: 0,
          newXp: gamDoc.xp,
          newLevel: gamDoc.level,
          leveledUp: false,
          levelName: info.name,
          levelIcon: info.icon,
          questsUpdated: [],
        };
      }
    }

    // 3. Anti-spam : verifier la limite quotidienne
    const dailyLimit = DAILY_LIMITS[eventType];
    if (dailyLimit) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayCount = await GamificationEvent.countDocuments({
        userId,
        type: eventType,
        dateCreation: { $gte: todayStart },
      });
      if (todayCount >= dailyLimit) {
        const info = getLevelInfo(gamDoc.level, gamDoc.roleContext);
        return {
          xpGained: 0,
          newXp: gamDoc.xp,
          newLevel: gamDoc.level,
          leveledUp: false,
          levelName: info.name,
          levelIcon: info.icon,
          questsUpdated: [],
        };
      }
    }

    // 4. Calculer XP
    const xpGained = XP_CONFIG[eventType] || 0;
    if (xpGained === 0) return null;

    // 5. Logger l'evenement
    await GamificationEvent.create({
      userId,
      type: eventType,
      entityId: entityId || undefined,
      xpAwarded: xpGained,
    });

    // 6. Mettre a jour le streak
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let streakUpdate: Record<string, unknown> = {};
    if (gamDoc.lastActiveDate) {
      const lastActive = new Date(gamDoc.lastActiveDate);
      const lastDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
      const diffDays = Math.floor((today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streakUpdate = { $inc: { streakDays: 1 } };
      } else if (diffDays > 1) {
        streakUpdate = { $set: { streakDays: 1 } };
      }
      // diffDays === 0 : meme jour, pas de changement
    } else {
      streakUpdate = { $set: { streakDays: 1 } };
    }

    // 7. Progresser les quetes actives
    const questsUpdated: IQuestProgress[] = [];
    const allQuests = [...gamDoc.activeQuickQuests, ...gamDoc.activeQuests];
    const questSetUpdates: Record<string, unknown> = {};

    for (const quest of allQuests) {
      if (quest.completedAt) continue;
      const def = QUEST_DEFINITIONS.find(d => d.questId === quest.questId);
      if (!def || def.targetAction !== eventType) continue;

      // Cette quete est impactee
      const newProgress = Math.min(quest.progress + 1, quest.target);
      const isComplete = newProgress >= quest.target;

      // Identifier si c'est une quick quest ou une quest normale
      const isQuick = gamDoc.activeQuickQuests.some(q => q.questId === quest.questId);
      const arrayField = isQuick ? 'activeQuickQuests' : 'activeQuests';
      const idx = (isQuick ? gamDoc.activeQuickQuests : gamDoc.activeQuests)
        .findIndex(q => q.questId === quest.questId);

      if (idx !== -1) {
        questSetUpdates[`${arrayField}.${idx}.progress`] = newProgress;
        if (isComplete) {
          questSetUpdates[`${arrayField}.${idx}.completedAt`] = now;
        }
      }

      questsUpdated.push({
        questId: quest.questId,
        progress: newProgress,
        target: quest.target,
        completedAt: isComplete ? now : undefined,
      });
    }

    // 8. Verifier si une etape d'onboarding est completee
    let onboardingStepCompleted: string | undefined;
    const role = gamDoc.roleContext;
    const relevantSteps = ONBOARDING_STEPS.filter(
      s => s.audience === 'all' || s.audience === role
    );
    for (const step of relevantSteps) {
      if (gamDoc.onboarding.completedSteps.includes(step.stepId)) continue;
      if (step.targetAction === eventType) {
        onboardingStepCompleted = step.stepId;
        break;
      }
    }

    // 9. Calculer XP bonus pour quetes completees
    let questXpBonus = 0;
    for (const q of questsUpdated) {
      if (q.completedAt) {
        const def = QUEST_DEFINITIONS.find(d => d.questId === q.questId);
        if (def) questXpBonus += def.xpReward;
      }
    }

    const totalXp = xpGained + questXpBonus;

    // 10. Update atomique MongoDB
    const updateOps: Record<string, unknown> = {
      $inc: {
        xp: totalXp,
        xpThisWeek: totalXp,
        xpThisMonth: totalXp,
      },
      $set: {
        lastActiveDate: now,
        ...questSetUpdates,
      },
    };

    // Dedup : ajouter l'entree et garder max 100 entries
    if (entityId) {
      updateOps.$push = {
        lastEventsDedup: {
          $each: [{ key: dedupKey, at: now }],
          $slice: -100,
        },
      };
    }

    // Onboarding step
    if (onboardingStepCompleted) {
      if (!updateOps.$addToSet) updateOps.$addToSet = {};
      (updateOps.$addToSet as Record<string, unknown>)['onboarding.completedSteps'] = onboardingStepCompleted;

      // Avancer le currentStep
      const completedCount = gamDoc.onboarding.completedSteps.length + 1;
      (updateOps.$set as Record<string, unknown>)['onboarding.currentStep'] = completedCount;
    }

    // Streak
    if (streakUpdate.$inc) {
      if (!updateOps.$inc) updateOps.$inc = {};
      Object.assign(updateOps.$inc as Record<string, unknown>, streakUpdate.$inc as Record<string, unknown>);
    } else if (streakUpdate.$set) {
      Object.assign(updateOps.$set as Record<string, unknown>, streakUpdate.$set as Record<string, unknown>);
    }

    const updatedDoc = await UserGamification.findOneAndUpdate(
      { userId },
      updateOps,
      { new: true }
    );

    if (!updatedDoc) return null;

    // 11. Verifier level up
    const newLevel = computeLevel(updatedDoc.xp);
    const leveledUp = newLevel > gamDoc.level;
    if (leveledUp) {
      await UserGamification.updateOne({ userId }, { $set: { level: newLevel } });
      updatedDoc.level = newLevel;
    }

    const levelInfo = getLevelInfo(updatedDoc.level, updatedDoc.roleContext);

    return {
      xpGained: totalXp,
      newXp: updatedDoc.xp,
      newLevel: updatedDoc.level,
      leveledUp,
      levelName: levelInfo.name,
      levelIcon: levelInfo.icon,
      questsUpdated,
      onboardingStepCompleted,
    };
  } catch (error) {
    console.error('[Gamification] Erreur applyGamificationEvent:', error);
    return null;
  }
}

/**
 * Assigner les quetes rapides a un utilisateur.
 * Appelé lors du GET /gamification/me et /quick-quests.
 * Recycle les quetes completees quand le pool est epuise (nouveau cycle).
 */
export function assignQuickQuests(
  role: 'visiteur' | 'entrepreneur',
  existingQuests: IQuestProgress[],
): IQuestProgress[] {
  const completedIds = new Set(existingQuests.filter(q => q.completedAt).map(q => q.questId));
  const activeIds = new Set(existingQuests.filter(q => !q.completedAt).map(q => q.questId));

  // Quetes rapides disponibles pour ce role
  const allQuickDefs = QUEST_DEFINITIONS
    .filter(d => d.isQuick)
    .filter(d => d.audience === 'all' || d.audience === role)
    .sort((a, b) => a.order - b.order);

  // D'abord les quetes jamais faites ou pas en cours
  let available = allQuickDefs
    .filter(d => !completedIds.has(d.questId) && !activeIds.has(d.questId));

  // Garder les quetes actives non completees
  const activeNonComplete = existingQuests.filter(q => !q.completedAt);

  // Completer a 3 quetes actives
  const needed = 3 - activeNonComplete.length;

  // Si le pool est epuise, recycler les quetes completees (nouveau cycle)
  if (available.length < needed && completedIds.size > 0) {
    const recycled = allQuickDefs
      .filter(d => completedIds.has(d.questId) && !activeIds.has(d.questId));
    available = [...available, ...recycled];
  }

  const newQuests: IQuestProgress[] = available.slice(0, Math.max(0, needed)).map(d => ({
    questId: d.questId,
    progress: 0,
    target: d.targetCount,
  }));

  return [...activeNonComplete, ...newQuests];
}

/**
 * Assigner les quetes de chapitre a un utilisateur.
 */
export function assignChapterQuests(
  role: 'visiteur' | 'entrepreneur',
  existingQuests: IQuestProgress[],
): IQuestProgress[] {
  const allQuestIds = new Set(existingQuests.map(q => q.questId));

  const chapterQuests = QUEST_DEFINITIONS
    .filter(d => !d.isQuick)
    .filter(d => d.audience === 'all' || d.audience === role)
    .filter(d => !allQuestIds.has(d.questId))
    .sort((a, b) => a.order - b.order);

  const newQuests: IQuestProgress[] = chapterQuests.map(d => ({
    questId: d.questId,
    progress: 0,
    target: d.targetCount,
  }));

  return [...existingQuests, ...newQuests];
}
