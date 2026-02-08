/**
 * Contrôleur Live - Gestion des diffusions vidéo en direct
 * Intégration avec Agora pour le streaming temps réel
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Live from '../models/Live.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';
import {
  generateAgoraToken,
  generateChannelName,
  userIdToAgoraUid,
  getAgoraAppId,
  AgoraRole,
} from '../utils/agoraToken.js';

// Schema de validation pour démarrer un live
const schemaStartLive = z.object({
  title: z.string().max(100).optional(),
});

// RED-08: Track unique viewers per live to prevent count manipulation
// Map<liveId, Set<userId>>
const activeViewersPerLive = new Map<string, Set<string>>();

// Schema de validation pour demander un token
const schemaGetToken = z.object({
  channelName: z.string().min(1, 'Le nom du canal est requis'),
  role: z.enum(['publisher', 'subscriber']),
});

/**
 * POST /api/live/start
 * Démarrer un nouveau live (1 seul actif par utilisateur)
 */
export const startLive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaStartLive.parse(req.body);
    const userId = req.utilisateur!._id;

    // Vérifier qu'il n'y a pas déjà un live actif pour cet utilisateur
    const liveExistant = await Live.findOne({
      hostUserId: userId,
      status: 'live',
    });

    if (liveExistant) {
      throw new ErreurAPI('Vous avez déjà un live en cours.', 400);
    }

    // Générer un nom de canal unique
    const channelName = generateChannelName(userId.toString());

    // Créer le live
    const live = await Live.create({
      hostUserId: userId,
      channelName,
      title: donnees.title,
      status: 'live',
    });

    // Générer le token pour l'hôte (publisher)
    const agoraUid = userIdToAgoraUid(userId.toString());
    const token = generateAgoraToken(channelName, agoraUid, 'publisher');

    res.status(201).json({
      succes: true,
      message: 'Live démarré avec succès.',
      data: {
        live: {
          _id: live._id,
          channelName: live.channelName,
          title: live.title,
          status: live.status,
          startedAt: live.startedAt,
        },
        agora: {
          appId: getAgoraAppId(),
          channelName,
          token,
          uid: agoraUid,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/live/end
 * Arrêter un live (hôte uniquement)
 */
export const endLive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;

    // Trouver le live actif de l'utilisateur
    const live = await Live.findOne({
      hostUserId: userId,
      status: 'live',
    });

    if (!live) {
      throw new ErreurAPI('Aucun live actif trouvé.', 404);
    }

    // Mettre à jour le live
    live.status = 'ended';
    live.endedAt = new Date();
    await live.save();

    // RED-08: Cleanup viewer tracking for this live
    activeViewersPerLive.delete(live._id.toString());

    res.json({
      succes: true,
      message: 'Live terminé avec succès.',
      data: {
        live: {
          _id: live._id,
          channelName: live.channelName,
          status: live.status,
          startedAt: live.startedAt,
          endedAt: live.endedAt,
          peakViewerCount: live.peakViewerCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/live/active
 * Récupérer tous les lives en cours
 */
export const getActiveLives = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const lives = await Live.find({ status: 'live' })
      .populate('hostUserId', 'prenom nom avatar')
      .sort({ startedAt: -1 })
      .limit(50);

    res.json({
      succes: true,
      data: {
        lives: lives.map((live) => ({
          _id: live._id,
          channelName: live.channelName,
          title: live.title,
          startedAt: live.startedAt,
          viewerCount: live.viewerCount,
          host: live.hostUserId,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/live/token
 * Générer un token Agora sécurisé (publisher ou subscriber)
 */
export const getAgoraTokenEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaGetToken.parse(req.body);
    const userId = req.utilisateur!._id;

    // Vérifier que le live existe et est actif
    const live = await Live.findOne({
      channelName: donnees.channelName,
      status: 'live',
    });

    if (!live) {
      throw new ErreurAPI('Live non trouvé ou terminé.', 404);
    }

    // Vérifier les permissions pour le rôle publisher
    if (donnees.role === 'publisher') {
      if (live.hostUserId.toString() !== userId.toString()) {
        throw new ErreurAPI("Seul l'hôte peut diffuser.", 403);
      }
    }

    // Générer le token
    const agoraUid = userIdToAgoraUid(userId.toString());
    const token = generateAgoraToken(
      donnees.channelName,
      agoraUid,
      donnees.role as AgoraRole
    );

    res.json({
      succes: true,
      data: {
        appId: getAgoraAppId(),
        channelName: donnees.channelName,
        token,
        uid: agoraUid,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/live/:id/join
 * Rejoindre un live en tant que viewer (incrémenter le compteur)
 */
export const joinLive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur?._id?.toString() || req.ip || 'anonymous';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de live invalide.', 400);
    }

    // RED-08: Check if user already joined this live (dedup)
    if (!activeViewersPerLive.has(id)) {
      activeViewersPerLive.set(id, new Set());
    }
    const viewers = activeViewersPerLive.get(id)!;

    if (viewers.has(userId)) {
      // Already joined — return current count without incrementing
      const live = await Live.findOne({ _id: id, status: 'live' }).select('viewerCount');
      if (!live) {
        throw new ErreurAPI('Live non trouvé ou terminé.', 404);
      }
      res.json({ succes: true, data: { viewerCount: live.viewerCount } });
      return;
    }

    viewers.add(userId);

    const live = await Live.findOneAndUpdate(
      { _id: id, status: 'live' },
      { $inc: { viewerCount: 1 } },
      { new: true }
    );

    if (!live) {
      viewers.delete(userId); // Rollback
      throw new ErreurAPI('Live non trouvé ou terminé.', 404);
    }

    // Mettre à jour le pic de viewers si nécessaire
    if (live.viewerCount > live.peakViewerCount) {
      live.peakViewerCount = live.viewerCount;
      await live.save();
    }

    res.json({
      succes: true,
      data: {
        viewerCount: live.viewerCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/live/:id/leave
 * Quitter un live (décrémenter le compteur)
 */
export const leaveLive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.utilisateur?._id?.toString() || req.ip || 'anonymous';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID de live invalide.', 400);
    }

    // RED-08: Only decrement if user was actually tracked as viewer
    const viewers = activeViewersPerLive.get(id);
    if (!viewers || !viewers.has(userId)) {
      // Not tracked — return current count without decrementing
      const live = await Live.findOne({ _id: id, status: 'live' }).select('viewerCount');
      if (!live) {
        throw new ErreurAPI('Live non trouvé ou terminé.', 404);
      }
      res.json({ succes: true, data: { viewerCount: live.viewerCount } });
      return;
    }

    viewers.delete(userId);
    // Cleanup empty sets
    if (viewers.size === 0) {
      activeViewersPerLive.delete(id);
    }

    const live = await Live.findOneAndUpdate(
      { _id: id, status: 'live', viewerCount: { $gt: 0 } },
      { $inc: { viewerCount: -1 } },
      { new: true }
    );

    if (!live) {
      throw new ErreurAPI('Live non trouvé ou terminé.', 404);
    }

    res.json({
      succes: true,
      data: {
        viewerCount: live.viewerCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/live/user/:userId
 * Vérifier si un utilisateur est en live
 */
export const getUserLiveStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide.', 400);
    }

    const live = await Live.findOne({
      hostUserId: userId,
      status: 'live',
    }).select('_id channelName title startedAt viewerCount');

    res.json({
      succes: true,
      data: {
        isLive: !!live,
        live: live || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
