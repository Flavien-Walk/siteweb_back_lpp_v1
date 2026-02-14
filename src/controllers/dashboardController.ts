import { Request, Response, NextFunction } from 'express';
import Report from '../models/Report.js';
import AuditLog from '../models/AuditLog.js';
import Utilisateur from '../models/Utilisateur.js';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import Projet from '../models/Projet.js';
import Story from '../models/Story.js';
import Live from '../models/Live.js';
import SupportTicket from '../models/SupportTicket.js';

/**
 * Obtenir les données du dashboard admin
 * GET /api/admin/dashboard
 */
export const getDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      pendingReports,
      escalatedReports,
      actionsToday,
      activeUsers,
      bannedUsers,
      suspendedUsers,
      surveillanceCount,
      surveillanceUsers,
      publicationsCount,
      commentairesCount,
      projetsCount,
      storiesCount,
      livesCount,
      recentActions,
      ticketsEnAttente,
      ticketsEnCours,
    ] = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: 'pending', escalatedAt: { $ne: null } }),
      AuditLog.countDocuments({ dateCreation: { $gte: today } }),
      Utilisateur.countDocuments({ bannedAt: null }),
      Utilisateur.countDocuments({ bannedAt: { $ne: null } }),
      Utilisateur.countDocuments({ suspendedUntil: { $gt: new Date() } }),
      Utilisateur.countDocuments({ 'surveillance.active': true }),
      Utilisateur.find({ 'surveillance.active': true })
        .select('_id prenom nom avatar surveillance')
        .populate('surveillance.addedBy', '_id prenom nom')
        .sort({ 'surveillance.addedAt': -1 })
        .limit(5)
        .lean(),
      Publication.countDocuments(),
      Commentaire.countDocuments(),
      Projet.countDocuments(),
      Story.countDocuments(),
      Live.countDocuments(),
      AuditLog.find()
        .populate('actor', '_id prenom nom avatar')
        .sort({ dateCreation: -1 })
        .limit(10)
        .lean(),
      SupportTicket.countDocuments({ status: 'en_attente' }),
      SupportTicket.countDocuments({ status: 'en_cours' }),
    ]);

    // Récupérer les utilisateurs à risque (top 5)
    const usersWithWarnings = await Utilisateur.find({
      $or: [
        { 'warnings.0': { $exists: true } },
        { 'surveillance.active': true },
        { suspendedUntil: { $gt: new Date() } },
      ],
      bannedAt: null,
    })
      .select('_id prenom nom avatar warnings surveillance moderation suspendedUntil dateCreation')
      .lean();

    const userIds = usersWithWarnings.map((u: any) => u._id);
    const reportCounts = await Report.aggregate([
      { $match: { targetId: { $in: userIds }, targetType: 'utilisateur' } },
      { $group: { _id: '$targetId', count: { $sum: 1 } } },
    ]);
    const reportMap = new Map(reportCounts.map((r: any) => [r._id.toString(), r.count]));

    const atRiskUsers = usersWithWarnings.map((u: any) => {
      const warningCount = u.warnings?.length || 0;
      const reportsCount = reportMap.get(u._id.toString()) || 0;
      const isSuspended = u.suspendedUntil && new Date(u.suspendedUntil) > new Date();
      let score = warningCount * 8 + reportsCount * 5;
      if (isSuspended) score += 10;
      if (u.surveillance?.active) score += 5;
      const ageMs = Date.now() - new Date(u.dateCreation).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 7) score += 10;
      else if (ageDays < 30) score += 5;
      score += (u.moderation?.autoSuspensionsCount || 0) * 15;
      return { ...u, riskScore: Math.min(100, score), reportsReceivedCount: reportsCount };
    })
      .sort((a: any, b: any) => b.riskScore - a.riskScore)
      .slice(0, 5);

    res.status(200).json({
      succes: true,
      data: {
        reports: {
          pending: pendingReports,
          escalated: escalatedReports,
        },
        actionsToday,
        users: {
          active: activeUsers,
          banned: bannedUsers,
          suspended: suspendedUsers,
        },
        surveillance: {
          count: surveillanceCount,
          users: surveillanceUsers,
        },
        contentStats: {
          publications: publicationsCount,
          commentaires: commentairesCount,
          projets: projetsCount,
          stories: storiesCount,
          lives: livesCount,
        },
        tickets: {
          enAttente: ticketsEnAttente,
          enCours: ticketsEnCours,
        },
        atRiskUsers,
        recentActions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir les infos du modérateur connecté
 * GET /api/admin/me
 */
export const getMe = (
  req: Request,
  res: Response
): void => {
  const user = req.utilisateur!;
  res.status(200).json({
    succes: true,
    data: {
      user: {
        _id: user._id,
        prenom: user.prenom,
        nom: user.nom,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        permissions: user.getEffectivePermissions(),
      },
    },
  });
};
