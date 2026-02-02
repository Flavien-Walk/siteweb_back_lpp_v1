import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Utilisateur, { IUtilisateur, ROLE_HIERARCHY } from '../models/Utilisateur.js';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import AuditLog from '../models/AuditLog.js';
import Report from '../models/Report.js';
import { auditLogger } from '../utils/auditLogger.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// ============ SCHEMAS DE VALIDATION ============

const schemaWarnUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caracteres').max(500),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

const schemaSuspendUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caracteres').max(500),
  durationHours: z.number().int().min(1).max(8760), // Max 1 an (365 jours)
});

const schemaBanUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caracteres').max(500),
});

const schemaUnbanUser = z.object({
  reason: z.string().max(500).optional(),
});

const schemaChangeRole = z.object({
  newRole: z.enum(['user', 'modo_test', 'modo', 'admin_modo', 'super_admin']),
  reason: z.string().max(500).optional(),
});

// ============ HELPERS ============

/**
 * Verifie que le moderateur peut agir sur la cible
 * (ne peut pas agir sur quelqu'un de niveau superieur ou egal)
 */
const canModerate = (moderator: IUtilisateur, target: IUtilisateur): boolean => {
  // super_admin peut tout faire
  if (moderator.role === 'super_admin') return true;
  // Un modo ne peut pas moderer quelqu'un de niveau >= au sien
  return moderator.getRoleLevel() > target.getRoleLevel();
};

// ============ ACTIONS SUR LES UTILISATEURS ============

/**
 * Avertir un utilisateur
 * POST /api/admin/users/:id/warn
 */
export const warnUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaWarnUser.parse(req.body);

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    // Verifier les permissions de hierarchie
    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas moderer cet utilisateur', 403);
    }

    // Creer l'avertissement
    const warning = {
      reason: donnees.reason,
      issuedBy: moderator._id,
      issuedAt: new Date(),
      expiresAt: donnees.expiresInDays
        ? new Date(Date.now() + donnees.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
    };

    target.warnings.push(warning);
    await target.save();

    // Log de l'action
    await auditLogger.actions.warnUser(req, target._id, donnees.reason, {
      warningId: target.warnings[target.warnings.length - 1]._id,
      expiresAt: warning.expiresAt?.toISOString(),
      totalWarnings: target.warnings.length,
    });

    res.status(200).json({
      succes: true,
      message: 'Avertissement envoye.',
      data: {
        warning: target.warnings[target.warnings.length - 1],
        totalWarnings: target.warnings.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retirer un avertissement
 * DELETE /api/admin/users/:id/warnings/:warningId
 */
export const removeWarning = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: userId, warningId } = req.params;
    const moderator = req.utilisateur!;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(warningId)
    ) {
      throw new ErreurAPI('ID invalide', 400);
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas moderer cet utilisateur', 403);
    }

    const warningIndex = target.warnings.findIndex(
      (w) => w._id?.toString() === warningId
    );
    if (warningIndex === -1) {
      throw new ErreurAPI('Avertissement non trouve', 404);
    }

    const removedWarning = target.warnings[warningIndex];
    target.warnings.splice(warningIndex, 1);
    await target.save();

    // Log de l'action
    await auditLogger.log(req, {
      action: 'user:warn_remove',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: 'Avertissement retire',
      metadata: { removedWarning },
    });

    res.status(200).json({
      succes: true,
      message: 'Avertissement retire.',
      data: { remainingWarnings: target.warnings.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspendre temporairement un utilisateur
 * POST /api/admin/users/:id/suspend
 */
export const suspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaSuspendUser.parse(req.body);

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas moderer cet utilisateur', 403);
    }

    // Verifier si deja banni
    if (target.isBanned()) {
      throw new ErreurAPI('Cet utilisateur est deja banni definitivement', 400);
    }

    const suspendedUntil = new Date(Date.now() + donnees.durationHours * 60 * 60 * 1000);
    const snapshot = {
      before: { suspendedUntil: target.suspendedUntil?.toISOString() || null },
      after: { suspendedUntil: suspendedUntil.toISOString() },
    };

    target.suspendedUntil = suspendedUntil;
    await target.save();

    // Log de l'action
    await auditLogger.actions.suspendUser(
      req,
      target._id,
      donnees.reason,
      suspendedUntil,
      snapshot
    );

    res.status(200).json({
      succes: true,
      message: `Utilisateur suspendu jusqu'au ${suspendedUntil.toLocaleString('fr-FR')}.`,
      data: {
        suspendedUntil: suspendedUntil.toISOString(),
        durationHours: donnees.durationHours,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lever une suspension
 * POST /api/admin/users/:id/unsuspend
 */
export const unsuspendUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas moderer cet utilisateur', 403);
    }

    if (!target.isSuspended()) {
      throw new ErreurAPI("Cet utilisateur n'est pas suspendu", 400);
    }

    const snapshot = {
      before: { suspendedUntil: target.suspendedUntil?.toISOString() },
      after: { suspendedUntil: null },
    };

    target.suspendedUntil = null;
    await target.save();

    // Log de l'action
    await auditLogger.log(req, {
      action: 'user:unsuspend',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: 'Suspension levee',
      snapshot,
    });

    res.status(200).json({
      succes: true,
      message: 'Suspension levee.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bannir definitivement un utilisateur
 * POST /api/admin/users/:id/ban
 */
export const banUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaBanUser.parse(req.body);

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas moderer cet utilisateur', 403);
    }

    if (target.isBanned()) {
      throw new ErreurAPI('Cet utilisateur est deja banni', 400);
    }

    const snapshot = {
      before: { bannedAt: null, banReason: null },
      after: { bannedAt: new Date().toISOString(), banReason: donnees.reason },
    };

    target.bannedAt = new Date();
    target.banReason = donnees.reason;
    target.suspendedUntil = null; // Annuler toute suspension en cours
    await target.save();

    // Log de l'action
    await auditLogger.actions.banUser(req, target._id, donnees.reason, snapshot);

    res.status(200).json({
      succes: true,
      message: 'Utilisateur banni definitivement.',
      data: {
        bannedAt: target.bannedAt.toISOString(),
        banReason: target.banReason,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Debannir un utilisateur
 * POST /api/admin/users/:id/unban
 */
export const unbanUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaUnbanUser.parse(req.body);

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    // Seul un admin peut debannir
    if (!moderator.isAdmin()) {
      throw new ErreurAPI('Seul un administrateur peut debannir un utilisateur', 403);
    }

    if (!target.isBanned()) {
      throw new ErreurAPI("Cet utilisateur n'est pas banni", 400);
    }

    const snapshot = {
      before: {
        bannedAt: target.bannedAt?.toISOString(),
        banReason: target.banReason,
      },
      after: { bannedAt: null, banReason: null },
    };

    target.bannedAt = null;
    target.banReason = undefined;
    await target.save();

    // Log de l'action
    await auditLogger.actions.unbanUser(req, target._id, donnees.reason, snapshot);

    res.status(200).json({
      succes: true,
      message: 'Utilisateur debanni.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Changer le role d'un utilisateur
 * PATCH /api/admin/users/:id/role
 */
export const changeUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const donnees = schemaChangeRole.parse(req.body);

    // Seul un super_admin peut changer les roles
    if (moderator.role !== 'super_admin') {
      throw new ErreurAPI('Seul un super administrateur peut modifier les roles', 403);
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    // Ne pas se retrograder soi-meme
    if (target._id.equals(moderator._id) && donnees.newRole !== 'super_admin') {
      throw new ErreurAPI('Vous ne pouvez pas vous retrograder vous-meme', 400);
    }

    const oldRole = target.role;
    target.role = donnees.newRole;
    await target.save();

    // Log de l'action
    await auditLogger.actions.changeRole(
      req,
      target._id,
      oldRole,
      donnees.newRole,
      donnees.reason
    );

    res.status(200).json({
      succes: true,
      message: `Role modifie de "${oldRole}" a "${donnees.newRole}".`,
      data: {
        oldRole,
        newRole: donnees.newRole,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ ACTIONS SUR LE CONTENU ============

/**
 * Masquer une publication
 * POST /api/admin/content/publication/:id/hide
 */
export const hidePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const reason = req.body.reason;
    const relatedReport = req.body.reportId;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvee', 404);
    }

    // Verifier si deja masquee
    if ((publication as any).isHidden) {
      throw new ErreurAPI('Cette publication est deja masquee', 400);
    }

    (publication as any).isHidden = true;
    await publication.save();

    // Log de l'action
    await auditLogger.actions.hideContent(
      req,
      'publication',
      publication._id,
      reason || 'Contenu masque par la moderation',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Publication masquee.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Afficher une publication masquee
 * POST /api/admin/content/publication/:id/unhide
 */
export const unhidePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const reason = req.body.reason;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvee', 404);
    }

    if (!(publication as any).isHidden) {
      throw new ErreurAPI("Cette publication n'est pas masquee", 400);
    }

    (publication as any).isHidden = false;
    await publication.save();

    // Log de l'action
    await auditLogger.log(req, {
      action: 'content:unhide',
      targetType: 'publication',
      targetId: publication._id,
      reason: reason || 'Contenu reaffiche par la moderation',
    });

    res.status(200).json({
      succes: true,
      message: 'Publication reaffichee.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer definitivement une publication
 * DELETE /api/admin/content/publication/:id
 */
export const deletePublication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const publicationId = req.params.id;
    const reason = req.body.reason;
    const relatedReport = req.body.reportId;

    if (!mongoose.Types.ObjectId.isValid(publicationId)) {
      throw new ErreurAPI('ID publication invalide', 400);
    }

    const publication = await Publication.findById(publicationId);
    if (!publication) {
      throw new ErreurAPI('Publication non trouvee', 404);
    }

    // Supprimer les commentaires associes
    await Commentaire.deleteMany({ publication: publicationId });

    // Supprimer la publication
    await publication.deleteOne();

    // Log de l'action
    await auditLogger.actions.deleteContent(
      req,
      'publication',
      new mongoose.Types.ObjectId(publicationId),
      reason || 'Contenu supprime par la moderation',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Publication et commentaires associes supprimes.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un commentaire
 * DELETE /api/admin/content/commentaire/:id
 */
export const deleteCommentaire = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const commentaireId = req.params.id;
    const reason = req.body.reason;
    const relatedReport = req.body.reportId;

    if (!mongoose.Types.ObjectId.isValid(commentaireId)) {
      throw new ErreurAPI('ID commentaire invalide', 400);
    }

    const commentaire = await Commentaire.findById(commentaireId);
    if (!commentaire) {
      throw new ErreurAPI('Commentaire non trouve', 404);
    }

    await commentaire.deleteOne();

    // Log de l'action
    await auditLogger.actions.deleteContent(
      req,
      'commentaire',
      new mongoose.Types.ObjectId(commentaireId),
      reason || 'Commentaire supprime par la moderation',
      relatedReport
    );

    res.status(200).json({
      succes: true,
      message: 'Commentaire supprime.',
    });
  } catch (error) {
    next(error);
  }
};

// ============ CONSULTATION UTILISATEURS ============

/**
 * Obtenir les details de moderation d'un utilisateur
 * GET /api/admin/users/:id
 */
export const getUserModerationDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const user = await Utilisateur.findById(userId)
      .select(
        'prenom nom email avatar role permissions bannedAt banReason suspendedUntil warnings dateCreation'
      )
      .populate('warnings.issuedBy', '_id prenom nom');

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    // Filtrer les warnings expires pour le comptage actif
    const now = new Date();
    const activeWarnings = user.warnings.filter(
      (w) => !w.expiresAt || new Date(w.expiresAt) > now
    );

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
          permissions: user.permissions,
          dateCreation: user.dateCreation,
        },
        moderation: {
          isBanned: user.isBanned(),
          bannedAt: user.bannedAt,
          banReason: user.banReason,
          isSuspended: user.isSuspended(),
          suspendedUntil: user.suspendedUntil,
          warnings: user.warnings,
          activeWarningsCount: activeWarnings.length,
          totalWarningsCount: user.warnings.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lister les utilisateurs avec filtres de moderation
 * GET /api/admin/users
 */
export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Filtres
    const filter: Record<string, unknown> = {};

    // Filtre par statut
    const status = req.query.status as string;
    if (status === 'banned') {
      filter.bannedAt = { $ne: null };
    } else if (status === 'suspended') {
      filter.suspendedUntil = { $gt: new Date() };
    } else if (status === 'active') {
      filter.bannedAt = null;
      filter.$or = [
        { suspendedUntil: null },
        { suspendedUntil: { $lte: new Date() } },
      ];
    }

    // Filtre par role
    const role = req.query.role as string;
    if (
      role &&
      ['user', 'modo_test', 'modo', 'admin_modo', 'super_admin'].includes(role)
    ) {
      filter.role = role;
    }

    // Recherche par nom/email
    const search = req.query.search as string;
    if (search && search.length >= 2) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { prenom: searchRegex },
        { nom: searchRegex },
        { email: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      Utilisateur.find(filter)
        .select(
          '_id prenom nom email avatar role bannedAt suspendedUntil warnings dateCreation'
        )
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Utilisateur.countDocuments(filter),
    ]);

    // Enrichir avec le statut de moderation
    const enrichedUsers = users.map((user) => ({
      ...user,
      isBanned: user.bannedAt !== null,
      isSuspended: user.suspendedUntil
        ? new Date(user.suspendedUntil) > new Date()
        : false,
      warningsCount: user.warnings?.length || 0,
    }));

    res.status(200).json({
      succes: true,
      data: {
        users: enrichedUsers,
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

// ============ AUDIT & HISTORIQUE UTILISATEUR ============

/**
 * Recuperer l'historique d'audit d'un utilisateur
 * GET /api/admin/users/:id/audit
 */
export const getUserAuditHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Verifier que l'utilisateur existe
    const user = await Utilisateur.findById(userId).select('_id prenom nom');
    if (!user) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    // Filtres optionnels
    const actionFilter = req.query.action as string;
    const dateFrom = req.query.dateFrom
      ? new Date(req.query.dateFrom as string)
      : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;

    // Recuperer les publications/commentaires de l'utilisateur
    const userPublications = await Publication.find({ auteur: userId })
      .select('_id')
      .lean();
    const userCommentaires = await Commentaire.find({ auteur: userId })
      .select('_id')
      .lean();

    const pubIds = userPublications.map((p) => p._id);
    const comIds = userCommentaires.map((c) => c._id);

    // Construire la query
    const query: Record<string, unknown> = {
      $or: [
        // Actions directes sur l'utilisateur
        { targetType: 'utilisateur', targetId: new mongoose.Types.ObjectId(userId) },
        // Actions sur ses publications
        ...(pubIds.length > 0
          ? [{ targetType: 'publication', targetId: { $in: pubIds } }]
          : []),
        // Actions sur ses commentaires
        ...(comIds.length > 0
          ? [{ targetType: 'commentaire', targetId: { $in: comIds } }]
          : []),
      ],
    };

    // Filtre par action si specifie
    if (actionFilter) {
      query.action = actionFilter;
    }

    // Filtre par dates
    if (dateFrom || dateTo) {
      query.dateCreation = {} as Record<string, Date>;
      if (dateFrom) (query.dateCreation as Record<string, Date>).$gte = dateFrom;
      if (dateTo) (query.dateCreation as Record<string, Date>).$lte = dateTo;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actor', '_id prenom nom avatar role')
        .populate('relatedReport', '_id raison status')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        user: {
          _id: user._id,
          prenom: user.prenom,
          nom: user.nom,
        },
        logs: logs.map((log) => ({
          _id: log._id,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          reason: log.reason,
          metadata: log.metadata,
          snapshot: log.snapshot,
          moderator: log.actor,
          relatedReport: log.relatedReport,
          createdAt: log.dateCreation,
        })),
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
 * Recuperer une timeline synthetique de moderation d'un utilisateur
 * GET /api/admin/users/:id/timeline
 */
export const getUserModerationTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Recuperer l'utilisateur avec ses warnings
    const user = await Utilisateur.findById(userId)
      .select(
        '_id prenom nom email avatar role bannedAt banReason suspendedUntil warnings dateCreation'
      )
      .populate('warnings.issuedBy', '_id prenom nom')
      .lean();

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    // Recuperer les actions de moderation importantes
    const moderationActions = await AuditLog.find({
      targetType: 'utilisateur',
      targetId: new mongoose.Types.ObjectId(userId),
      action: {
        $in: [
          'user:warn',
          'user:suspend',
          'user:unsuspend',
          'user:ban',
          'user:unban',
          'user:role_change',
        ],
      },
    })
      .populate('actor', '_id prenom nom')
      .sort({ dateCreation: -1 })
      .limit(100)
      .lean();

    // Recuperer les reports ayant abouti a une action sur cet utilisateur
    const actionedReports = await Report.find({
      targetType: 'utilisateur',
      targetId: new mongoose.Types.ObjectId(userId),
      status: 'action_taken',
    })
      .populate('moderatedBy', '_id prenom nom')
      .sort({ moderatedAt: -1 })
      .limit(50)
      .lean();

    // Construire la timeline
    interface TimelineEntry {
      type: string;
      date: Date;
      action: string;
      reason?: string;
      moderator: unknown;
      details: Record<string, unknown>;
    }

    const timeline: TimelineEntry[] = [];

    // Ajouter les warnings de l'utilisateur
    if (user.warnings) {
      for (const warning of user.warnings) {
        timeline.push({
          type: 'warning',
          date: new Date(warning.issuedAt),
          action: 'user:warn',
          reason: warning.reason,
          moderator: warning.issuedBy || null,
          details: {
            warningId: warning._id,
            expiresAt: warning.expiresAt,
          },
        });
      }
    }

    // Ajouter les actions de moderation
    for (const action of moderationActions) {
      timeline.push({
        type: 'moderation_action',
        date: action.dateCreation,
        action: action.action,
        reason: action.reason,
        moderator: action.actor || null,
        details: {
          snapshot: action.snapshot,
          metadata: action.metadata,
        },
      });
    }

    // Ajouter les reports ayant abouti a une action
    for (const report of actionedReports) {
      timeline.push({
        type: 'report_action',
        date: report.moderatedAt || report.dateCreation,
        action: 'report:action_taken',
        reason: report.reason,
        moderator: report.moderatedBy || null,
        details: {
          reportId: report._id,
          reportReason: report.reason,
          actionTaken: report.action,
        },
      });
    }

    // Trier par date decroissante
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Stats resume
    const summary = {
      totalWarnings: user.warnings?.length || 0,
      activeWarnings:
        user.warnings?.filter(
          (w) => !w.expiresAt || new Date(w.expiresAt) > new Date()
        ).length || 0,
      totalSuspensions: moderationActions.filter((a) => a.action === 'user:suspend')
        .length,
      totalBans: moderationActions.filter((a) => a.action === 'user:ban').length,
      currentlyBanned: !!user.bannedAt,
      currentlySuspended: user.suspendedUntil
        ? new Date(user.suspendedUntil) > new Date()
        : false,
      accountAge: Math.floor(
        (Date.now() - new Date(user.dateCreation).getTime()) / (1000 * 60 * 60 * 24)
      ),
    };

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
          dateCreation: user.dateCreation,
        },
        status: {
          bannedAt: user.bannedAt,
          banReason: user.banReason,
          suspendedUntil: user.suspendedUntil,
        },
        summary,
        timeline: timeline.slice(0, 100),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recuperer l'activite complete d'un utilisateur
 * GET /api/admin/users/:id/activity
 */
export const getUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    // Verifier que l'utilisateur existe
    const user = await Utilisateur.findById(userId)
      .select(
        '_id prenom nom email avatar role bannedAt banReason suspendedUntil warnings dateCreation'
      )
      .lean();

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouve', 404);
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    // Filtres
    const typeFilter = (req.query.type as string) || 'all';
    const dateFrom = req.query.dateFrom
      ? new Date(req.query.dateFrom as string)
      : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;

    // Construire le filtre de date commun
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.$gte = dateFrom;
    if (dateTo) dateFilter.$lte = dateTo;
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    interface Activity {
      type: string;
      date: Date;
      data: Record<string, unknown>;
    }

    const activities: Activity[] = [];

    // 1. Publications creees par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'publication') {
      const pubQuery: Record<string, unknown> = {
        auteur: new mongoose.Types.ObjectId(userId),
      };
      if (hasDateFilter) pubQuery.dateCreation = dateFilter;

      const publications = await Publication.find(pubQuery)
        .select('_id contenu medias dateCreation')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const pub of publications) {
        activities.push({
          type: 'publication',
          date: pub.dateCreation,
          data: {
            _id: pub._id,
            contenu: pub.contenu?.substring(0, 200) || '',
            hasMedia: !!pub.media,
            mediaCount: pub.media ? 1 : 0,
          },
        });
      }
    }

    // 2. Commentaires crees par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'commentaire') {
      const comQuery: Record<string, unknown> = {
        auteur: new mongoose.Types.ObjectId(userId),
      };
      if (hasDateFilter) comQuery.dateCreation = dateFilter;

      const commentaires = await Commentaire.find(comQuery)
        .select('_id contenu publication dateCreation')
        .populate('publication', '_id')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const com of commentaires) {
        activities.push({
          type: 'commentaire',
          date: com.dateCreation,
          data: {
            _id: com._id,
            contenu: com.contenu?.substring(0, 200) || '',
            publicationId: (com.publication as any)?._id || null,
          },
        });
      }
    }

    // 3. Reports envoyes par l'utilisateur
    if (typeFilter === 'all' || typeFilter === 'report') {
      const reportQuery: Record<string, unknown> = {
        reporter: new mongoose.Types.ObjectId(userId),
      };
      if (hasDateFilter) reportQuery.dateCreation = dateFilter;

      const reports = await Report.find(reportQuery)
        .select('_id targetType targetId reason status dateCreation')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const report of reports) {
        activities.push({
          type: 'report_sent',
          date: report.dateCreation,
          data: {
            _id: report._id,
            targetType: report.targetType,
            targetId: report.targetId,
            reason: report.reason,
            status: report.status,
          },
        });
      }
    }

    // 4. Sanctions recues (via AuditLog)
    if (typeFilter === 'all' || typeFilter === 'sanction') {
      const sanctionQuery: Record<string, unknown> = {
        targetType: 'utilisateur',
        targetId: new mongoose.Types.ObjectId(userId),
        action: {
          $in: [
            'user:warn',
            'user:suspend',
            'user:ban',
            'user:unban',
            'user:unsuspend',
          ],
        },
      };
      if (hasDateFilter) sanctionQuery.dateCreation = dateFilter;

      const sanctions = await AuditLog.find(sanctionQuery)
        .populate('actor', '_id prenom nom')
        .sort({ dateCreation: -1 })
        .limit(100)
        .lean();

      for (const sanction of sanctions) {
        const actorData = sanction.actor as unknown as { _id: unknown; prenom: string; nom: string } | null;
        activities.push({
          type: 'sanction',
          date: sanction.dateCreation,
          data: {
            _id: sanction._id,
            action: sanction.action,
            reason: sanction.reason,
            moderator: actorData
              ? { _id: actorData._id, prenom: actorData.prenom, nom: actorData.nom }
              : null,
            snapshot: sanction.snapshot,
          },
        });
      }
    }

    // Trier par date decroissante
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Pagination manuelle sur les resultats agreges
    const total = activities.length;
    const paginatedActivities = activities.slice((page - 1) * limit, page * limit);

    // Stats resume
    const stats = {
      totalPublications: activities.filter((a) => a.type === 'publication').length,
      totalCommentaires: activities.filter((a) => a.type === 'commentaire').length,
      totalReportsSent: activities.filter((a) => a.type === 'report_sent').length,
      totalSanctions: activities.filter((a) => a.type === 'sanction').length,
    };

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
          dateCreation: user.dateCreation,
        },
        stats,
        activities: paginatedActivities,
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
 * Recuperer les reports crees par un utilisateur (safe)
 * GET /api/admin/users/:id/reports
 */
export const getUserReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ErreurAPI('ID utilisateur invalide', 400);
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ reporter: new mongoose.Types.ObjectId(userId) })
        .select('_id targetType targetId reason status dateCreation moderatedAt')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments({ reporter: new mongoose.Types.ObjectId(userId) }),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        reports,
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
