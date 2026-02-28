/**
 * Admin marketplace - Services
 * Listing et detail des services marketplace pour le panel de moderation
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import MarketplaceService from '../../models/MarketplaceService.js';
import MarketplaceOrder from '../../models/MarketplaceOrder.js';
import MarketplaceReview from '../../models/MarketplaceReview.js';
import { escapeRegex } from '../../utils/strings.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';

/**
 * GET /api/admin/marketplace/services
 * Liste paginee de tous les services avec filtres
 */
export const listerServices = async (
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
    if (statut && ['brouillon', 'actif', 'pause', 'archive'].includes(statut)) {
      filter.statut = statut;
    }

    const categorie = req.query.categorie as string;
    if (categorie && ['service', 'formation', 'produit', 'outil', 'accompagnement'].includes(categorie)) {
      filter.categorie = categorie;
    }

    const createurId = req.query.createurId as string;
    if (createurId && mongoose.Types.ObjectId.isValid(createurId)) {
      filter.createur = new mongoose.Types.ObjectId(createurId);
    }

    const search = req.query.search as string;
    if (search && search.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
      filter.$or = [
        { nom: searchRegex },
        { description: searchRegex },
      ];
    }

    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
      filter.dateCreation = dateFilter;
    }

    const sortField = ['dateCreation', 'prix', 'statsCache.noteGlobale', 'statsCache.commandesRealisees']
      .includes(req.query.sort as string) ? (req.query.sort as string) : 'dateCreation';
    const sortOrder = req.query.order === 'asc' ? 1 : -1;

    const [services, total] = await Promise.all([
      MarketplaceService.find(filter)
        .populate('createur', '_id prenom nom avatar email')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      MarketplaceService.countDocuments(filter),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        services,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/marketplace/services/:id
 * Detail complet d'un service avec stats et avis recents
 */
export const getServiceDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID service invalide', 400);
    }

    const service = await MarketplaceService.findById(id)
      .populate('createur', '_id prenom nom avatar email role dateCreation')
      .lean();

    if (!service) {
      throw new ErreurAPI('Service introuvable', 404);
    }

    const [ordersCount, reviews, ordersByStatut] = await Promise.all([
      MarketplaceOrder.countDocuments({ service: id }),
      MarketplaceReview.find({ service: id })
        .populate('auteur', '_id prenom nom avatar')
        .sort({ dateCreation: -1 })
        .limit(10)
        .lean(),
      MarketplaceOrder.aggregate([
        { $match: { service: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: '$statut', count: { $sum: 1 } } },
      ]),
    ]);

    const commandesParStatut: Record<string, number> = {};
    for (const s of ordersByStatut) {
      commandesParStatut[s._id] = s.count;
    }

    res.status(200).json({
      succes: true,
      data: {
        service,
        reviews,
        stats: {
          totalCommandes: ordersCount,
          commandesParStatut,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
