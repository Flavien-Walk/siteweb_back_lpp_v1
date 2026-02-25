/**
 * Recommendation Controller — Endpoints pour le systeme "Pour Toi"
 */

import { Request, Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Utilisateur from '../models/Utilisateur.js';
import UserPreferences from '../models/UserPreferences.js';
import { getRecommendations, getRecommendationsDebug, invalidateUserCache } from '../services/recommendation/index.js';

/**
 * GET /api/recommendations/projects
 * Feed personnalise "Pour Toi" (auth requise)
 */
export const getRecommendedProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.utilisateur?._id;
    if (!userId) {
      res.status(401).json({ succes: false, message: 'Authentification requise.' });
      return;
    }

    const { page = '1', limit = '20' } = req.query;

    const result = await getRecommendations(userId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    // Ajouter estSuivi et nbFollowers pour chaque projet
    const userIdStr = userId.toString();
    result.projets = result.projets.map((p: any) => ({
      ...p,
      estSuivi: (p.followers || []).some((f: any) => f.toString() === userIdStr),
      nbFollowers: (p.followers || []).length,
      followers: undefined, // Ne pas exposer la liste des followers
    }));

    res.json({
      succes: true,
      data: result,
    });
  } catch (error) {
    console.error('[RecommendationController] Erreur getRecommendedProjects:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors de la recuperation des recommandations.',
    });
  }
};

/**
 * GET /api/recommendations/debug
 * Debug du feed d'un utilisateur (admin only)
 * Query param: ?userId=xxx (optionnel, defaut = user connecte)
 */
export const getRecommendationDebug = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.query.userId
      ? new mongoose.Types.ObjectId(req.query.userId as string)
      : req.utilisateur?._id;

    if (!targetUserId) {
      res.status(400).json({ succes: false, message: 'userId requis.' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      res.status(400).json({ succes: false, message: 'userId invalide.' });
      return;
    }

    const debug = await getRecommendationsDebug(targetUserId);

    if (!debug) {
      res.status(404).json({
        succes: false,
        message: 'Utilisateur non trouve.',
      });
      return;
    }

    res.json({
      succes: true,
      data: debug,
    });
  } catch (error) {
    console.error('[RecommendationController] Erreur debug:', error);
    res.status(500).json({
      succes: false,
      message: 'Erreur lors du debug des recommandations.',
    });
  }
};

// Schema de validation pour l'onboarding
const CATEGORIES_ENUM = ['tech', 'food', 'sante', 'education', 'energie', 'culture', 'environnement', 'autre'] as const;
const MATURITES_ENUM = ['idee', 'prototype', 'lancement', 'croissance'] as const;

const schemaOnboardingInterets = z.object({
  categories: z.array(z.enum(CATEGORIES_ENUM)).min(1, 'Selectionnez au moins une categorie.').max(8),
  maturites: z.array(z.enum(MATURITES_ENUM)).min(1, 'Selectionnez au moins une maturite.').max(4),
});

/**
 * POST /api/recommendations/onboarding-interests
 */
export const saveOnboardingInterests: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).utilisateur?._id;
    if (!userId) { res.status(401).json({ succes: false, message: 'Authentification requise.' }); return; }

    const parseResult = schemaOnboardingInterets.safeParse(req.body);
    if (!parseResult.success) {
      const erreurs = parseResult.error.errors.map(e => e.message).join(', ');
      res.status(400).json({ succes: false, message: erreurs }); return;
    }
    const { categories, maturites } = parseResult.data;

    const utilisateur = await Utilisateur.findByIdAndUpdate(userId, {
      $set: {
        'onboardingInterets.categories': categories,
        'onboardingInterets.maturites': maturites,
        'onboardingInterets.completedAt': new Date(),
      },
    }, { new: true });
    if (!utilisateur) { res.status(404).json({ succes: false, message: 'Utilisateur non trouve.' }); return; }

    const categoryAffinities = new Map<string, number>();
    for (const cat of categories) { categoryAffinities.set(cat, 0.6); }

    await UserPreferences.findOneAndUpdate(
      { utilisateur: userId },
      { $set: { categoryAffinities, maturitePreferences: maturites, lastComputed: new Date() } },
      { upsert: true, new: true }
    );

    invalidateUserCache(userId);

    const effectivePermissions = utilisateur.getEffectivePermissions();
    const isStaff = utilisateur.isStaff();

    console.log(`[Onboarding] Interets sauvegardes pour ${utilisateur.email}: ${categories.join(',')} | ${maturites.join(',')}`);

    res.json({
      succes: true,
      message: 'Preferences enregistrees.',
      data: {
        utilisateur: {
          id: utilisateur._id,
          prenom: utilisateur.prenom,
          nom: utilisateur.nom,
          email: utilisateur.email,
          avatar: utilisateur.avatar,
          bio: utilisateur.bio,
          role: utilisateur.role,
          statut: utilisateur.statut,
          provider: utilisateur.provider,
          profilPublic: utilisateur.profilPublic ?? true,
          preferenceTheme: utilisateur.preferenceTheme || 'light',
          nbAmis: utilisateur.amis?.length || 0,
          emailVerifie: utilisateur.emailVerifie,
          onboardingInterets: utilisateur.onboardingInterets || null,
          isStaff,
          permissions: effectivePermissions,
        },
      },
    });
  } catch (error) {
    console.error('[RecommendationController] Erreur saveOnboardingInterests:', error);
    res.status(500).json({ succes: false, message: 'Erreur lors de la sauvegarde des preferences.' });
  }
};
