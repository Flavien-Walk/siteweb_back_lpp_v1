import { Request, Response } from 'express';
import mongoose from 'mongoose';
import MarketplaceEvent from '../../models/MarketplaceEvent.js';
import MarketplaceService from '../../models/MarketplaceService.js';
import { formatServicePourMobile } from './helpers.js';

/**
 * Recuperer les services tendance (public)
 * GET /api/marketplace/trending?periode=7&limit=10
 *
 * Algorithme :
 * 1. Aggreger les evenements (views, contacts, orders) sur la periode
 * 2. Calculer un score pondere : views*1 + contacts*5 + orders*20
 * 3. Appliquer un bonus de notation : finalScore = score * (1 + noteGlobale/10)
 * 4. Trier par score final decroissant
 */
export const getTrending = async (req: Request, res: Response) => {
  try {
    const periode = Math.min(90, Math.max(1, parseInt(req.query.periode as string) || 7));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    // Date de debut de la periode
    const dateDebut = new Date();
    dateDebut.setDate(dateDebut.getDate() - periode);

    // Aggregation des evenements sur la periode
    const aggregation = await MarketplaceEvent.aggregate([
      // 1. Filtrer les evenements dans la periode
      {
        $match: {
          date: { $gte: dateDebut },
        },
      },
      // 2. Grouper par service et compter par type
      {
        $group: {
          _id: '$service',
          views: {
            $sum: { $cond: [{ $eq: ['$type', 'view'] }, 1, 0] },
          },
          contacts: {
            $sum: { $cond: [{ $eq: ['$type', 'contact'] }, 1, 0] },
          },
          orders: {
            $sum: { $cond: [{ $eq: ['$type', 'order'] }, 1, 0] },
          },
        },
      },
      // 3. Calculer le score pondere
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$views', 1] },
              { $multiply: ['$contacts', 5] },
              { $multiply: ['$orders', 20] },
            ],
          },
        },
      },
      // 4. Trier par score decroissant et limiter
      { $sort: { score: -1 } },
      { $limit: limit },
    ]);

    // Aucun resultat
    if (aggregation.length === 0) {
      return res.status(200).json({
        succes: true,
        data: { services: [], periode },
      });
    }

    // Charger les services complets avec leur createur
    const serviceIds = aggregation.map(a => a._id);
    const servicesMap: Record<string, any> = {};

    const services = await MarketplaceService.find({
      _id: { $in: serviceIds },
      statut: 'actif',
    }).populate('createur', 'prenom nom avatar dateCreation');

    for (const service of services) {
      servicesMap[service._id.toString()] = service;
    }

    // Construire la liste finale avec bonus de notation
    const resultats: any[] = [];
    for (const item of aggregation) {
      const service = servicesMap[item._id.toString()];
      if (!service) continue; // Service supprime ou inactif

      // Bonus de notation : finalScore = score * (1 + noteGlobale / 10)
      const noteGlobale = service.statsCache?.noteGlobale || 0;
      const finalScore = item.score * (1 + noteGlobale / 10);

      // Formater le service pour le mobile
      const formatted = await formatServicePourMobile(service);

      resultats.push({
        ...formatted,
        _trendingScore: Math.round(finalScore * 100) / 100,
      });
    }

    // Re-trier par score final (le bonus note peut changer l'ordre)
    resultats.sort((a, b) => b._trendingScore - a._trendingScore);

    return res.status(200).json({
      succes: true,
      data: {
        services: resultats,
        periode,
      },
    });
  } catch (error) {
    console.error('[marketplace:trending] Erreur getTrending:', error);
    return res.status(500).json({
      succes: false,
      message: 'Erreur serveur lors de la recuperation des tendances.',
    });
  }
};
