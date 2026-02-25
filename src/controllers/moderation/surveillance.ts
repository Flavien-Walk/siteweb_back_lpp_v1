// surveillance.ts - User surveillance and at-risk monitoring endpoints
// (toggleSurveillance, listSurveillanceUsers, getAtRiskUsers)

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Utilisateur from '../../models/Utilisateur.js';
import Report from '../../models/Report.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { canModerate } from '../../utils/moderationHelpers.js';

/**
 * Toggle surveillance sur un utilisateur
 * POST /api/moderation/users/:id/surveillance
 */
export const toggleSurveillance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;
    const { active, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    if (typeof active !== 'boolean') {
      throw new ErreurAPI('Le champ "active" (boolean) est requis', 400);
    }

    const user = await Utilisateur.findById(userId);
    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, user)) {
      throw new ErreurAPI("Vous ne pouvez pas modifier la surveillance de cet utilisateur", 403);
    }

    if (active) {
      user.surveillance = {
        active: true,
        reason: reason || 'Mis sous surveillance',
        addedBy: moderator._id,
        addedAt: new Date(),
        notes: user.surveillance?.notes || [],
      };
    } else {
      user.surveillance = {
        active: false,
        reason: undefined,
        addedBy: undefined,
        addedAt: undefined,
        notes: user.surveillance?.notes || [],
      };
    }

    await user.save();

    await auditLogger.log(req, {
      action: active ? 'user:surveillance_on' : 'user:surveillance_off',
      targetType: 'utilisateur',
      targetId: user._id,
      reason: reason || (active ? 'Mis sous surveillance' : 'Retiré de la surveillance'),
    });

    res.status(200).json({
      succes: true,
      message: active ? 'Utilisateur mis sous surveillance.' : 'Surveillance retirée.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lister les utilisateurs sous surveillance
 * GET /api/admin/users/surveillance
 */
export const listSurveillanceUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { 'surveillance.active': true };

    const [users, total] = await Promise.all([
      Utilisateur.find(filter)
        .select('_id prenom nom avatar email role warnings surveillance moderation bannedAt suspendedUntil dateCreation')
        .populate('surveillance.addedBy', '_id prenom nom')
        .sort({ 'surveillance.addedAt': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Utilisateur.countDocuments(filter),
    ]);

    // Compter les reports reçus pour chaque utilisateur
    const userIds = users.map((u: any) => u._id);
    const reportCounts = await Report.aggregate([
      { $match: { targetId: { $in: userIds }, targetType: 'utilisateur' } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } },
    ]);
    const reportMap = new Map(reportCounts.map((r: any) => [r._id.toString(), r.count]));

    const enriched = users.map((u: any) => ({
      ...u,
      reportsReceivedCount: reportMap.get(u._id.toString()) || 0,
    }));

    res.status(200).json({
      succes: true,
      data: {
        users: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Top utilisateurs à risque (triés par warnings + reports reçus)
 * GET /api/admin/users/at-risk
 */
export const getAtRiskUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    // Récupérer les utilisateurs avec au moins 1 warning OU sous surveillance
    const users = await Utilisateur.find({
      $or: [
        { 'warnings.0': { $exists: true } },
        { 'surveillance.active': true },
        { suspendedUntil: { $gt: new Date() } },
      ],
      bannedAt: null,
    })
      .select('_id prenom nom avatar email role warnings surveillance moderation bannedAt suspendedUntil dateCreation')
      .lean();

    // Récupérer les reports par utilisateur
    const userIds = users.map((u: any) => u._id);
    const reportCounts = await Report.aggregate([
      { $match: { targetId: { $in: userIds }, targetType: 'utilisateur' } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } },
    ]);
    const reportMap = new Map(reportCounts.map((r: any) => [r._id.toString(), r.count]));

    // Calculer un score de risque simplifié côté backend pour le tri
    const scored = users.map((u: any) => {
      const warningCount = u.warnings?.length || 0;
      const reportsCount = reportMap.get(u._id.toString()) || 0;
      const isSuspended = u.suspendedUntil && new Date(u.suspendedUntil) > new Date();
      const isSurveilled = u.surveillance?.active;

      let score = warningCount * 8 + reportsCount * 5;
      if (isSuspended) score += 10;
      if (isSurveilled) score += 5;

      // Ancienneté du compte
      const ageMs = Date.now() - new Date(u.dateCreation).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 7) score += 10;
      else if (ageDays < 30) score += 5;

      // Suspensions passées
      const autoSuspensions = u.moderation?.autoSuspensionsCount || 0;
      score += autoSuspensions * 15;

      return {
        ...u,
        reportsReceivedCount: reportsCount,
        riskScore: Math.min(100, score),
      };
    });

    // Trier par score décroissant et limiter
    scored.sort((a: any, b: any) => b.riskScore - a.riskScore);
    const top = scored.slice(0, limit);

    res.status(200).json({
      succes: true,
      data: { users: top },
    });
  } catch (error) {
    next(error);
  }
};
