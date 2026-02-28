/**
 * Admin marketplace - Commandes
 * Listing, detail, stats des commandes marketplace pour le panel de moderation
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import MarketplaceOrder from '../../models/MarketplaceOrder.js';
import MarketplaceReview from '../../models/MarketplaceReview.js';
import { computeDeadlineFields } from '../../services/marketplace/deadlineUtils.js';
import { escapeRegex } from '../../utils/strings.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';

/**
 * GET /api/admin/marketplace/commandes
 * Liste paginee de toutes les commandes avec filtres
 */
export const listerCommandes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    const statut = req.query.statut as string;
    if (statut && ['en_attente', 'acceptee', 'refusee', 'en_cours', 'livre', 'termine', 'annule', 'litige'].includes(statut)) {
      filter.statut = statut;
    }

    const acheteurId = req.query.acheteurId as string;
    if (acheteurId && mongoose.Types.ObjectId.isValid(acheteurId)) {
      filter.acheteur = new mongoose.Types.ObjectId(acheteurId);
    }

    const vendeurId = req.query.vendeurId as string;
    if (vendeurId && mongoose.Types.ObjectId.isValid(vendeurId)) {
      filter.vendeur = new mongoose.Types.ObjectId(vendeurId);
    }

    const serviceId = req.query.serviceId as string;
    if (serviceId && mongoose.Types.ObjectId.isValid(serviceId)) {
      filter.service = new mongoose.Types.ObjectId(serviceId);
    }

    const search = req.query.search as string;
    if (search && search.length >= 2) {
      filter['serviceSnapshot.nom'] = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
    }

    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
      filter.dateCreation = dateFilter;
    }

    if (req.query.isLate === 'true') {
      filter.isLate = true;
    }

    const sortField = ['dateCreation', 'montantTotal', 'dateMiseAJour'].includes(req.query.sort as string)
      ? (req.query.sort as string)
      : 'dateCreation';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [commandes, total] = await Promise.all([
      MarketplaceOrder.find(filter)
        .populate('acheteur', '_id prenom nom avatar email')
        .populate('vendeur', '_id prenom nom avatar email')
        .populate('service', '_id nom image categorie')
        .select('-deliverables -progressUpdates -buyerBrief')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      MarketplaceOrder.countDocuments(filter),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        commandes,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/marketplace/commandes/stats
 * Stats agregees des commandes
 */
export const getCommandesStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [byStatut, total, litiges, montantTotal, last30Days] = await Promise.all([
      MarketplaceOrder.aggregate([
        { $group: { _id: '$statut', count: { $sum: 1 } } },
      ]),
      MarketplaceOrder.countDocuments(),
      MarketplaceOrder.countDocuments({ statut: 'litige' }),
      MarketplaceOrder.aggregate([
        { $match: { statut: 'termine' } },
        { $group: { _id: null, total: { $sum: '$montantTotal' } } },
      ]),
      MarketplaceOrder.countDocuments({
        dateCreation: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const parStatut: Record<string, number> = {};
    for (const s of byStatut) {
      parStatut[s._id] = s.count;
    }

    res.status(200).json({
      succes: true,
      data: {
        total,
        litiges,
        last30Days,
        montantTotalTermine: montantTotal[0]?.total || 0,
        parStatut,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/marketplace/commandes/:id
 * Detail complet d'une commande
 */
export const getCommandeDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID commande invalide', 400);
    }

    const commande = await MarketplaceOrder.findById(id)
      .populate('acheteur', '_id prenom nom avatar email role')
      .populate('vendeur', '_id prenom nom avatar email role')
      .populate('service', '_id nom image categorie prix statut createur')
      .lean();

    if (!commande) {
      throw new ErreurAPI('Commande introuvable', 404);
    }

    const deadlineFields = computeDeadlineFields(commande as any);

    const settings = (commande as any).revisionSettings || { accepteRevisions: true, revisionsIncluses: 2 };
    const revisionsUtilisees = ((commande as any).historique || []).filter(
      (h: any) => h.de === 'livre' && h.vers === 'en_cours'
    ).length;

    const review = await MarketplaceReview.findOne({ commande: id })
      .populate('auteur', '_id prenom nom avatar')
      .lean();

    res.status(200).json({
      succes: true,
      data: {
        commande: {
          ...commande,
          deadline: {
            acceptedAt: (commande as any).acceptedAt,
            initialDeliverySeconds: (commande as any).initialDeliverySeconds,
            currentDeadlineAt: (commande as any).currentDeadlineAt,
            remainingSeconds: deadlineFields.remainingSeconds,
            isLate: deadlineFields.isLate,
            lateSince: deadlineFields.lateSince,
            deadlineActive: deadlineFields.deadlineActive,
          },
          revisionInfo: {
            accepteRevisions: settings.accepteRevisions,
            revisionsIncluses: settings.revisionsIncluses,
            revisionsUtilisees,
            revisionsRestantes: Math.max(0, settings.revisionsIncluses - revisionsUtilisees),
          },
        },
        review,
      },
    });
  } catch (error) {
    next(error);
  }
};
