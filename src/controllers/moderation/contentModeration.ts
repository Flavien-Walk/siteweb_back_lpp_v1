/**
 * Content moderation actions: hide/unhide/delete/edit on publications, commentaires, stories, projets.
 * Extracted from moderationController.ts for maintainability.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Publication from '../../models/Publication.js';
import Commentaire from '../../models/Commentaire.js';
import Story from '../../models/Story.js';
import AuditLog from '../../models/AuditLog.js';
import Notification from '../../models/Notification.js';
import Projet from '../../models/Projet.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { getOrCreateEventId, isEventIdAlreadyProcessed } from '../../utils/moderationHelpers.js';

// ============ SCHEMAS DE VALIDATION ============

const schemaHideStory = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caractères').max(500),
});

// ============ PUBLICATIONS ============

/**
 * Masquer une publication
 * POST /api/moderation/content/publication/:id/hide
 */
export const hidePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const moderator = req.utilisateur!;
    const reason = req.body.reason as string | undefined;
    const relatedReport = req.body.reportId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvée', 404);
    }

    // Vérifier si déjà masquée
    if ((publication as any).isHidden) {
      throw new ErreurAPI('Cette publication est déjà masquée', 400);
    }

    (publication as any).isHidden = true;
    await publication.save();

    // Log de l'action
    await auditLogger.actions.hideContent(
      req,
      'publication',
      publication._id,
      reason || 'Contenu masqué par la modération',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Publication masquée.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Afficher une publication masquée
 * POST /api/moderation/content/publication/:id/unhide
 */
export const unhidePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const reason = req.body.reason as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvée', 404);
    }

    if (!(publication as any).isHidden) {
      throw new ErreurAPI("Cette publication n'est pas masquée", 400);
    }

    (publication as any).isHidden = false;
    await publication.save();

    // Log de l'action
    await auditLogger.log(req, {
      action: 'content:unhide',
      targetType: 'publication',
      targetId: publication._id,
      reason: reason || 'Contenu réaffiché par la modération',
    });

    res.status(200).json({
      succes: true,
      message: 'Publication réaffichée.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer définitivement une publication
 * DELETE /api/moderation/content/publication/:id
 */
export const deletePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const reason = req.body.reason as string | undefined;
    const relatedReport = req.body.reportId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvée', 404);
    }

    // Sauvegarder les infos pour le log avant suppression
    const publicationSnapshot = {
      _id: publication._id,
      auteur: publication.auteur,
      contenu: (publication as any).contenu,
    };

    // Supprimer les commentaires associés
    await Commentaire.deleteMany({ publication: publicationId });

    // Supprimer la publication
    await publication.deleteOne();

    // Log de l'action
    await auditLogger.actions.deleteContent(
      req,
      'publication',
      new mongoose.Types.ObjectId(publicationId),
      reason || 'Contenu supprimé par la modération',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Publication et commentaires associés supprimés.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Détail d'une publication pour l'admin
 * GET /api/admin/publications/:id
 */
export const getPublicationDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(id)
      .populate('auteur', '_id prenom nom avatar email role')
      .populate('projet', '_id nom')
      .lean();

    if (!publication) {
      throw new ErreurAPI('Publication non trouvée', 404);
    }

    // Récupérer les commentaires
    const commentaires = await Commentaire.find({ publication: id })
      .populate('auteur', '_id prenom nom avatar')
      .sort({ dateCreation: -1 })
      .limit(50)
      .lean();

    // Historique d'audit
    const auditHistory = await AuditLog.find({
      targetType: 'publication',
      targetId: new mongoose.Types.ObjectId(id),
    })
      .populate('actor', '_id prenom nom')
      .sort({ dateCreation: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      succes: true,
      data: {
        publication: {
          ...publication,
          likesCount: (publication as any).likes?.length || 0,
        },
        commentaires,
        auditHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ COMMENTAIRES ============

/**
 * Supprimer un commentaire
 * DELETE /api/moderation/content/commentaire/:id
 */
export const deleteCommentaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commentaireId = req.params.id;
    const reason = req.body.reason as string | undefined;
    const relatedReport = req.body.reportId as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(commentaireId)) {
      throw new ErreurAPI('ID commentaire invalide', 400);
    }

    const commentaire = await Commentaire.findById(commentaireId);
    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouvé', 404);
    }

    await commentaire.deleteOne();

    // Log de l'action
    await auditLogger.actions.deleteContent(
      req,
      'commentaire',
      new mongoose.Types.ObjectId(commentaireId),
      reason || 'Commentaire supprimé par la modération',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Commentaire supprimé.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Editer le contenu d'un commentaire
 * PATCH /api/moderation/content/commentaire/:id
 */
export const editCommentaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commentaireId = req.params.id;
    const moderator = req.utilisateur!;
    const { contenu, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(commentaireId)) {
      throw new ErreurAPI('ID commentaire invalide', 400);
    }

    if (!contenu || typeof contenu !== 'string' || contenu.trim().length === 0) {
      throw new ErreurAPI('Le contenu est requis', 400);
    }

    if (contenu.length > 1000) {
      throw new ErreurAPI('Le commentaire ne peut pas dépasser 1000 caractères', 400);
    }

    const commentaire = await Commentaire.findById(commentaireId);
    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouvé', 404);
    }

    const oldContenu = commentaire.contenu;

    commentaire.contenu = contenu.trim();
    commentaire.modifie = true;
    commentaire.editedBy = moderator._id;
    commentaire.editReason = reason || 'Modifié par la modération';
    commentaire.editedAt = new Date();
    await commentaire.save();

    await auditLogger.log(req, {
      action: 'content:edit',
      targetType: 'commentaire',
      targetId: commentaire._id,
      reason: reason || 'Commentaire modifié par la modération',
      snapshot: {
        before: { contenu: oldContenu },
        after: { contenu: contenu.trim() },
      },
    });

    res.status(200).json({
      succes: true,
      message: 'Commentaire modifié.',
      data: { commentaire },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer un commentaire + ses réponses + publication parente
 * GET /api/admin/commentaires/:id/thread
 */
export const getCommentaireThread = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commentaireId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(commentaireId)) {
      throw new ErreurAPI('ID commentaire invalide', 400);
    }

    const commentaire = await Commentaire.findById(commentaireId)
      .populate('auteur', '_id prenom nom avatar')
      .populate('editedBy', '_id prenom nom')
      .lean();

    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouvé', 404);
    }

    // Récupérer les réponses
    const reponses = await Commentaire.find({ reponseA: commentaireId })
      .populate('auteur', '_id prenom nom avatar')
      .populate('editedBy', '_id prenom nom')
      .sort({ dateCreation: 1 })
      .lean();

    // Récupérer la publication parente
    const publication = await Publication.findById(commentaire.publication)
      .select('_id contenu auteur dateCreation')
      .populate('auteur', '_id prenom nom avatar')
      .lean();

    res.status(200).json({
      succes: true,
      data: {
        commentaire,
        reponses,
        publication,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ STORIES ============

/**
 * Lister les stories pour la modération
 * GET /api/moderation/stories
 *
 * Query params:
 * - page, limit: pagination
 * - userId: filtrer par auteur
 * - status: 'all' | 'active' | 'hidden' | 'expired'
 * - dateFrom, dateTo: filtrage par période
 */
export const getStoriesModeration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Construire les filtres
    const filter: Record<string, unknown> = {};

    // Filtre par utilisateur
    const userId = req.query.userId as string;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.utilisateur = new mongoose.Types.ObjectId(userId);
    }

    // Filtre par statut
    const status = req.query.status as string;
    const now = new Date();
    if (status === 'active') {
      filter.dateExpiration = { $gt: now };
      filter.isHidden = { $ne: true };
    } else if (status === 'hidden') {
      filter.isHidden = true;
    } else if (status === 'expired') {
      filter.dateExpiration = { $lte: now };
    }
    // 'all' = pas de filtre supplémentaire

    // Filtre par dates
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
    if (dateFrom || dateTo) {
      filter.dateCreation = {};
      if (dateFrom) (filter.dateCreation as Record<string, Date>).$gte = dateFrom;
      if (dateTo) (filter.dateCreation as Record<string, Date>).$lte = dateTo;
    }

    const [stories, total] = await Promise.all([
      Story.find(filter)
        .populate('utilisateur', '_id prenom nom avatar')
        .populate('hiddenBy', '_id prenom nom')
        .select('_id utilisateur type media thumbnail durationSec location filterPreset dateCreation dateExpiration isHidden hiddenReason hiddenBy hiddenAt vues')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Story.countDocuments(filter),
    ]);

    // Enrichir avec le statut calculé
    const enrichedStories = stories.map((story: any) => ({
      ...story,
      viewersCount: story.vues?.length || 0,
      isExpired: new Date(story.dateExpiration) <= now,
      isActive: new Date(story.dateExpiration) > now && !story.isHidden,
    }));

    res.status(200).json({
      succes: true,
      data: {
        stories: enrichedStories,
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

/**
 * Obtenir le détail d'une story pour la modération
 * GET /api/moderation/stories/:id
 */
export const getStoryModeration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new ErreurAPI('ID story invalide', 400);
    }

    const story = await Story.findById(storyId)
      .populate('utilisateur', '_id prenom nom avatar email role')
      .populate('hiddenBy', '_id prenom nom')
      .lean();

    if (!story) {
      throw new ErreurAPI('Story non trouvée', 404);
    }

    // Récupérer l'historique d'audit pour cette story
    const auditLogs = await AuditLog.find({
      targetType: 'story',
      targetId: new mongoose.Types.ObjectId(storyId),
    })
      .populate('actor', '_id prenom nom')
      .sort({ dateCreation: -1 })
      .limit(50)
      .lean();

    const now = new Date();

    res.status(200).json({
      succes: true,
      data: {
        story: {
          ...story,
          viewersCount: (story as any).vues?.length || 0,
          isExpired: new Date((story as any).dateExpiration) <= now,
          isActive: new Date((story as any).dateExpiration) > now && !(story as any).isHidden,
        },
        auditHistory: auditLogs.map((log) => ({
          _id: log._id,
          action: log.action,
          reason: log.reason,
          actor: log.actor,
          metadata: log.metadata,
          snapshot: log.snapshot,
          createdAt: log.dateCreation,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Masquer une story
 * POST /api/moderation/stories/:id/hide
 */
export const hideStory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storyId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new ErreurAPI('ID story invalide', 400);
    }

    const donnees = schemaHideStory.parse(req.body);

    // Générer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Vérifier si cet eventId a déjà été traité
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] hideStory eventId ${eventId} deja traite`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const story = await Story.findById(storyId).populate('utilisateur', '_id prenom nom');
    if (!story) {
      throw new ErreurAPI('Story non trouvée', 404);
    }

    // Vérifier si déjà masquée
    if (story.isHidden) {
      throw new ErreurAPI('Cette story est déjà masquée', 400);
    }

    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';

    // Snapshot avant modification
    const snapshot = {
      before: { isHidden: false },
      after: { isHidden: true, hiddenReason: donnees.reason },
    };

    // Masquer la story
    story.isHidden = true;
    story.hiddenReason = donnees.reason;
    story.hiddenBy = moderator._id;
    story.hiddenAt = new Date();
    await story.save();

    // Log de l'action avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'content:hide',
      targetType: 'story',
      targetId: story._id,
      reason: donnees.reason,
      metadata: {
        storyType: story.type,
        authorId: story.utilisateur._id,
      },
      snapshot,
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Créer une notification pour l'auteur
    await Notification.create({
      destinataire: story.utilisateur._id,
      type: 'moderation',
      titre: 'Story masquée',
      message: `Votre story a été masquée par la modération. Raison: ${donnees.reason}`,
      data: {
        eventId: eventId.toString(),
        storyId: story._id.toString(),
        action: 'story:hide',
        reason: donnees.reason,
      },
    });

    res.status(200).json({
      succes: true,
      message: 'Story masquée.',
      data: {
        eventId: eventId.toString(),
        storyId: story._id,
        hiddenAt: story.hiddenAt?.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Réafficher une story masquée
 * POST /api/moderation/stories/:id/unhide
 */
export const unhideStory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storyId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new ErreurAPI('ID story invalide', 400);
    }

    // Générer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Vérifier si cet eventId a déjà été traité
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] unhideStory eventId ${eventId} deja traite`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const story = await Story.findById(storyId).populate('utilisateur', '_id prenom nom');
    if (!story) {
      throw new ErreurAPI('Story non trouvée', 404);
    }

    // Vérifier si bien masquée
    if (!story.isHidden) {
      throw new ErreurAPI("Cette story n'est pas masquée", 400);
    }

    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';
    const reason = req.body.reason as string | undefined;

    // Snapshot avant modification
    const snapshot = {
      before: { isHidden: true, hiddenReason: story.hiddenReason },
      after: { isHidden: false, hiddenReason: null },
    };

    // Réafficher la story
    story.isHidden = false;
    story.hiddenReason = undefined;
    story.hiddenBy = undefined;
    story.hiddenAt = undefined;
    await story.save();

    // Log de l'action avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'content:unhide',
      targetType: 'story',
      targetId: story._id,
      reason: reason || 'Story réaffichée par la modération',
      metadata: {
        storyType: story.type,
        authorId: story.utilisateur._id,
      },
      snapshot,
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Créer une notification pour l'auteur
    await Notification.create({
      destinataire: story.utilisateur._id,
      type: 'moderation',
      titre: 'Story réaffichée',
      message: 'Votre story a été réaffichée par la modération.',
      data: {
        eventId: eventId.toString(),
        storyId: story._id.toString(),
        action: 'story:unhide',
      },
    });

    res.status(200).json({
      succes: true,
      message: 'Story réaffichée.',
      data: { eventId: eventId.toString() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer définitivement une story
 * DELETE /api/moderation/stories/:id
 */
export const deleteStoryModeration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const storyId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      throw new ErreurAPI('ID story invalide', 400);
    }

    const reason = req.body.reason as string;
    if (!reason || reason.length < 5) {
      throw new ErreurAPI('Une raison d\'au moins 5 caractères est requise', 400);
    }

    // Générer ou extraire eventId pour idempotency
    const eventId = getOrCreateEventId(req);

    // Vérifier si cet eventId a déjà été traité
    if (await isEventIdAlreadyProcessed(eventId)) {
      console.log(`[IDEMPOTENCY] deleteStoryModeration eventId ${eventId} deja traite`);
      res.status(200).json({
        succes: true,
        message: 'Action deja effectuee (idempotency).',
        data: { eventId: eventId.toString(), idempotent: true },
      });
      return;
    }

    const story = await Story.findById(storyId).populate('utilisateur', '_id prenom nom');
    if (!story) {
      throw new ErreurAPI('Story non trouvée', 404);
    }

    const source = (req.body.source as 'mobile' | 'moderation' | 'api') || 'moderation';

    // Sauvegarder les infos pour le log avant suppression
    const storySnapshot = {
      _id: story._id,
      utilisateur: story.utilisateur._id,
      type: story.type,
      mediaUrl: story.mediaUrl,
      durationSec: story.durationSec,
      location: story.location,
      filterPreset: story.filterPreset,
      dateCreation: story.dateCreation,
      dateExpiration: story.dateExpiration,
      viewersCount: story.viewers?.length || 0,
    };

    // Supprimer de Cloudinary si applicable
    // Note: Cette logique dépend de comment les médias sont stockés
    // Pour l'instant on ne supprime que de la DB,
    // la suppression Cloudinary peut être ajoutée plus tard si nécessaire

    // Supprimer la story
    await story.deleteOne();

    // Log de l'action avec eventId
    await AuditLog.create({
      eventId,
      actor: moderator._id,
      actorRole: moderator.role,
      actorIp: req.ip,
      action: 'content:delete',
      targetType: 'story',
      targetId: new mongoose.Types.ObjectId(storyId),
      reason,
      metadata: {
        storyType: storySnapshot.type,
        authorId: storySnapshot.utilisateur,
      },
      snapshot: {
        before: storySnapshot,
        after: null,
      },
      source: source === 'mobile' ? 'mobile' : source === 'api' ? 'api' : 'web',
    });

    // Créer une notification pour l'auteur
    await Notification.create({
      destinataire: storySnapshot.utilisateur,
      type: 'moderation',
      titre: 'Story supprimée',
      message: `Votre story a été supprimée par la modération. Raison: ${reason}`,
      data: {
        eventId: eventId.toString(),
        action: 'story:delete',
        reason,
      },
    });

    res.status(200).json({
      succes: true,
      message: 'Story supprimée définitivement.',
      data: { eventId: eventId.toString() },
    });
  } catch (error) {
    next(error);
  }
};

// ============ PROJETS ============

/**
 * Détail d'un projet pour l'admin
 * GET /api/admin/projets/:id
 */
export const getProjetDetail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID projet invalide', 400);
    }

    const projet = await Projet.findById(id)
      .populate('porteur', '_id prenom nom avatar email role')
      .populate('equipe.utilisateur', '_id prenom nom avatar')
      .populate('hiddenBy', '_id prenom nom')
      .lean();

    if (!projet) {
      throw new ErreurAPI('Projet non trouvé', 404);
    }

    // Historique d'audit
    const auditHistory = await AuditLog.find({
      targetType: 'projet',
      targetId: new mongoose.Types.ObjectId(id),
    })
      .populate('actor', '_id prenom nom')
      .sort({ dateCreation: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      succes: true,
      data: {
        projet: {
          ...projet,
          followersCount: (projet as any).followers?.length || 0,
        },
        auditHistory,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Masquer un projet
 * POST /api/moderation/content/projet/:id/hide
 */
export const hideProjet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projetId = req.params.id;
    const moderator = req.utilisateur!;
    const reason = req.body.reason as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(projetId)) {
      throw new ErreurAPI('ID projet invalide', 400);
    }

    const projet = await Projet.findById(projetId);
    if (!projet) {
      throw new ErreurAPI('Projet non trouvé', 404);
    }

    if ((projet as any).isHidden) {
      throw new ErreurAPI('Ce projet est déjà masqué', 400);
    }

    (projet as any).isHidden = true;
    (projet as any).hiddenReason = reason || 'Masqué par la modération';
    (projet as any).hiddenBy = moderator._id;
    (projet as any).hiddenAt = new Date();
    await projet.save();

    await auditLogger.log(req, {
      action: 'content:hide',
      targetType: 'projet',
      targetId: projet._id,
      reason: reason || 'Projet masqué par la modération',
    });

    res.status(200).json({
      succes: true,
      message: 'Projet masqué.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Réafficher un projet
 * POST /api/moderation/content/projet/:id/unhide
 */
export const unhideProjet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projetId = req.params.id;
    const reason = req.body.reason as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(projetId)) {
      throw new ErreurAPI('ID projet invalide', 400);
    }

    const projet = await Projet.findById(projetId);
    if (!projet) {
      throw new ErreurAPI('Projet non trouvé', 404);
    }

    if (!(projet as any).isHidden) {
      throw new ErreurAPI("Ce projet n'est pas masqué", 400);
    }

    (projet as any).isHidden = false;
    (projet as any).hiddenReason = undefined;
    (projet as any).hiddenBy = undefined;
    (projet as any).hiddenAt = undefined;
    await projet.save();

    await auditLogger.log(req, {
      action: 'content:unhide',
      targetType: 'projet',
      targetId: projet._id,
      reason: reason || 'Projet réaffiché par la modération',
    });

    res.status(200).json({
      succes: true,
      message: 'Projet réaffiché.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un projet
 * DELETE /api/moderation/content/projet/:id
 */
export const deleteProjet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projetId = req.params.id;
    const reason = req.body.reason as string | undefined;

    if (!mongoose.Types.ObjectId.isValid(projetId)) {
      throw new ErreurAPI('ID projet invalide', 400);
    }

    const projet = await Projet.findById(projetId);
    if (!projet) {
      throw new ErreurAPI('Projet non trouvé', 404);
    }

    const snapshot = {
      _id: projet._id,
      nom: (projet as any).nom,
      porteur: (projet as any).porteur,
    };

    // Supprimer les publications liées au projet
    await Publication.deleteMany({ projet: projetId });

    await projet.deleteOne();

    await auditLogger.log(req, {
      action: 'content:delete',
      targetType: 'projet',
      targetId: new mongoose.Types.ObjectId(projetId),
      reason: reason || 'Projet supprimé par la modération',
    });

    res.status(200).json({
      succes: true,
      message: 'Projet et publications associées supprimés.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Editer les champs d'un projet
 * PATCH /api/moderation/content/projet/:id
 */
export const editProjet = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projetId = req.params.id;
    const moderator = req.utilisateur!;
    const { nom, description, pitch, categorie, maturite, secteur, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projetId)) {
      throw new ErreurAPI('ID projet invalide', 400);
    }

    const projet = await Projet.findById(projetId);
    if (!projet) {
      throw new ErreurAPI('Projet non trouvé', 404);
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (nom !== undefined) { before.nom = (projet as any).nom; (projet as any).nom = nom; after.nom = nom; }
    if (description !== undefined) { before.description = (projet as any).description; (projet as any).description = description; after.description = description; }
    if (pitch !== undefined) { before.pitch = (projet as any).pitch; (projet as any).pitch = pitch; after.pitch = pitch; }
    if (categorie !== undefined) { before.categorie = (projet as any).categorie; (projet as any).categorie = categorie; after.categorie = categorie; }
    if (maturite !== undefined) { before.maturite = (projet as any).maturite; (projet as any).maturite = maturite; after.maturite = maturite; }
    if (secteur !== undefined) { before.secteur = (projet as any).secteur; (projet as any).secteur = secteur; after.secteur = secteur; }

    if (Object.keys(after).length === 0) {
      throw new ErreurAPI('Aucun champ à modifier', 400);
    }

    await projet.save();

    await auditLogger.log(req, {
      action: 'content:edit',
      targetType: 'projet',
      targetId: projet._id,
      reason: reason || 'Projet modifié par la modération',
      snapshot: { before, after },
    });

    res.status(200).json({
      succes: true,
      message: 'Projet modifié.',
      data: { projet },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Changer le statut d'un projet (draft/published)
 * PATCH /api/moderation/content/projet/:id/status
 */
export const changeProjetStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projetId = req.params.id;
    const { statut, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projetId)) {
      throw new ErreurAPI('ID projet invalide', 400);
    }

    if (!statut || !['draft', 'published'].includes(statut)) {
      throw new ErreurAPI('Statut invalide (draft ou published)', 400);
    }

    const projet = await Projet.findById(projetId);
    if (!projet) {
      throw new ErreurAPI('Projet non trouvé', 404);
    }

    const oldStatut = (projet as any).statut;
    if (oldStatut === statut) {
      throw new ErreurAPI(`Le projet est déjà en statut "${statut}"`, 400);
    }

    (projet as any).statut = statut;
    await projet.save();

    await auditLogger.log(req, {
      action: 'content:edit',
      targetType: 'projet',
      targetId: projet._id,
      reason: reason || `Statut changé de ${oldStatut} à ${statut}`,
      snapshot: {
        before: { statut: oldStatut },
        after: { statut },
      },
    });

    res.status(200).json({
      succes: true,
      message: `Projet passé en "${statut}".`,
      data: { projet },
    });
  } catch (error) {
    next(error);
  }
};
