import { Request, Response, NextFunction } from 'express';
import Report from '../../models/Report.js';
import Publication from '../../models/Publication.js';
import Commentaire from '../../models/Commentaire.js';
import Utilisateur from '../../models/Utilisateur.js';

/**
 * Obtenir les signalements agrégés par cible
 * GET /api/admin/reports/aggregated
 */
export const getAggregatedReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Agrégation par cible
    const aggregated = await Report.aggregate([
      { $match: { status: 'pending' } },
      {
        $group: {
          _id: { targetType: '$targetType', targetId: '$targetId' },
          count: { $sum: 1 },
          reasons: { $addToSet: '$reason' },
          priorities: { $addToSet: '$priority' },
          maxPriority: { $max: '$priority' },
          firstReportDate: { $min: '$dateCreation' },
          lastReportDate: { $max: '$dateCreation' },
          isEscalated: { $max: { $cond: [{ $ne: ['$escalatedAt', null] }, true, false] } },
          reportIds: { $push: '$_id' },
        },
      },
      {
        $addFields: {
          priorityWeight: {
            $switch: {
              branches: [
                { case: { $eq: ['$maxPriority', 'critical'] }, then: 4 },
                { case: { $eq: ['$maxPriority', 'high'] }, then: 3 },
                { case: { $eq: ['$maxPriority', 'medium'] }, then: 2 },
                { case: { $eq: ['$maxPriority', 'low'] }, then: 1 },
              ],
              default: 0,
            },
          },
        },
      },
      { $sort: { priorityWeight: -1, count: -1, lastReportDate: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Compter le total
    const totalAgg = await Report.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: { targetType: '$targetType', targetId: '$targetId' } } },
      { $count: 'total' },
    ]);
    const total = totalAgg[0]?.total || 0;

    // Enrichir avec les infos des cibles
    const enrichedAggregated = await Promise.all(
      aggregated.map(async (agg) => {
        let target = null;

        if (agg._id.targetType === 'post') {
          const publication = await Publication.findById(agg._id.targetId)
            .populate('auteur', '_id prenom nom avatar')
            .lean();
          if (publication) {
            target = {
              _id: publication._id,
              type: 'post',
              auteur: publication.auteur,
              contenu: (publication as any).contenu?.substring(0, 200),
              media: (publication as any).media,
              isHidden: (publication as any).isHidden || false,
            };
          }
        } else if (agg._id.targetType === 'commentaire') {
          const commentaire = await Commentaire.findById(agg._id.targetId)
            .populate('auteur', '_id prenom nom avatar')
            .lean();
          if (commentaire) {
            target = {
              _id: commentaire._id,
              type: 'commentaire',
              auteur: commentaire.auteur,
              contenu: commentaire.contenu?.substring(0, 200),
            };
          }
        } else if (agg._id.targetType === 'utilisateur') {
          const utilisateur = await Utilisateur.findById(agg._id.targetId)
            .select('_id prenom nom avatar email')
            .lean();
          if (utilisateur) {
            target = {
              _id: utilisateur._id,
              type: 'utilisateur',
              prenom: utilisateur.prenom,
              nom: utilisateur.nom,
              avatar: utilisateur.avatar,
            };
          }
        }

        return {
          targetType: agg._id.targetType,
          targetId: agg._id.targetId,
          target,
          reportCount: agg.count,
          reasons: agg.reasons,
          maxPriority: agg.maxPriority,
          isEscalated: agg.isEscalated,
          firstReportDate: agg.firstReportDate,
          lastReportDate: agg.lastReportDate,
          reportIds: agg.reportIds,
        };
      })
    );

    res.status(200).json({
      succes: true,
      data: {
        aggregatedReports: enrichedAggregated,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
