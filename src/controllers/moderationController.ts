import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Utilisateur, { IUtilisateur, IWarning, ROLE_HIERARCHY, Role, Permission } from '../models/Utilisateur.js';
import Publication from '../models/Publication.js';
import Commentaire from '../models/Commentaire.js';
import { auditLogger } from '../utils/auditLogger.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// ============ SCHEMAS DE VALIDATION ============

const schemaWarnUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caractères').max(500),
  expiresInDays: z.number().int().positive().max(365).optional(), // null = permanent
});

const schemaSuspendUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caractères').max(500),
  durationHours: z.number().int().min(1).max(8760), // Max 1 an (365 jours)
});

const schemaBanUser = z.object({
  reason: z.string().min(5, 'La raison doit faire au moins 5 caractères').max(500),
});

const schemaUnbanUser = z.object({
  reason: z.string().max(500).optional(),
});

const schemaChangeRole = z.object({
  newRole: z.enum(['user', 'modo_test', 'modo', 'admin_modo', 'super_admin']),
  reason: z.string().max(500).optional(),
});

const schemaAddPermission = z.object({
  permission: z.string(),
  reason: z.string().max(500).optional(),
});

// ============ HELPERS ============

/**
 * Vérifie que le modérateur peut agir sur la cible
 * (ne peut pas agir sur quelqu'un de niveau supérieur ou égal)
 */
const canModerate = (moderator: IUtilisateur, target: IUtilisateur): boolean => {
  // super_admin peut tout faire
  if (moderator.role === 'super_admin') return true;
  // Un modo ne peut pas modérer quelqu'un de niveau >= au sien
  return moderator.getRoleLevel() > target.getRoleLevel();
};

// ============ ACTIONS SUR LES UTILISATEURS ============

/**
 * Avertir un utilisateur
 * POST /api/moderation/users/:id/warn
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
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Vérifier les permissions de hiérarchie
    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    // Créer l'avertissement
    const warning: IWarning = {
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
      message: 'Avertissement envoyé.',
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
 * DELETE /api/moderation/users/:id/warnings/:warningId
 */
export const removeWarning = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: userId, warningId } = req.params;
    const moderator = req.utilisateur!;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(warningId)) {
      throw new ErreurAPI('ID invalide', 400);
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    const warningIndex = target.warnings.findIndex(
      (w) => w._id?.toString() === warningId
    );

    if (warningIndex === -1) {
      throw new ErreurAPI('Avertissement non trouvé', 404);
    }

    const removedWarning = target.warnings[warningIndex];
    target.warnings.splice(warningIndex, 1);
    await target.save();

    // Log de l'action
    await auditLogger.log(req, {
      action: 'user:warn_remove',
      targetType: 'utilisateur',
      targetId: target._id,
      reason: 'Avertissement retiré',
      metadata: { removedWarning },
    });

    res.status(200).json({
      succes: true,
      message: 'Avertissement retiré.',
      data: { remainingWarnings: target.warnings.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspendre temporairement un utilisateur
 * POST /api/moderation/users/:id/suspend
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
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    // Vérifier si déjà banni
    if (target.isBanned()) {
      throw new ErreurAPI('Cet utilisateur est déjà banni définitivement', 400);
    }

    const suspendedUntil = new Date(Date.now() + donnees.durationHours * 60 * 60 * 1000);
    const snapshot = {
      before: { suspendedUntil: target.suspendedUntil?.toISOString() || null },
      after: { suspendedUntil: suspendedUntil.toISOString() },
    };

    target.suspendedUntil = suspendedUntil;
    await target.save();

    // Log de l'action
    await auditLogger.actions.suspendUser(req, target._id, donnees.reason, suspendedUntil, snapshot);

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
 * POST /api/moderation/users/:id/unsuspend
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
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
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
      reason: 'Suspension levée',
      snapshot,
    });

    res.status(200).json({
      succes: true,
      message: 'Suspension levée.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bannir définitivement un utilisateur
 * POST /api/moderation/users/:id/ban
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
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    if (!canModerate(moderator, target)) {
      throw new ErreurAPI('Vous ne pouvez pas modérer cet utilisateur', 403);
    }

    if (target.isBanned()) {
      throw new ErreurAPI('Cet utilisateur est déjà banni', 400);
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
      message: 'Utilisateur banni définitivement.',
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
 * Débannir un utilisateur
 * POST /api/moderation/users/:id/unban
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
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Seul un admin peut débannir
    if (!moderator.isAdmin()) {
      throw new ErreurAPI('Seul un administrateur peut débannir un utilisateur', 403);
    }

    if (!target.isBanned()) {
      throw new ErreurAPI("Cet utilisateur n'est pas banni", 400);
    }

    const snapshot = {
      before: { bannedAt: target.bannedAt?.toISOString(), banReason: target.banReason },
      after: { bannedAt: null, banReason: null },
    };

    target.bannedAt = null;
    target.banReason = undefined;
    await target.save();

    // Log de l'action
    await auditLogger.actions.unbanUser(req, target._id, donnees.reason, snapshot);

    res.status(200).json({
      succes: true,
      message: 'Utilisateur débanni.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Changer le rôle d'un utilisateur
 * PATCH /api/moderation/users/:id/role
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

    // Seul un super_admin peut changer les rôles
    if (moderator.role !== 'super_admin') {
      throw new ErreurAPI('Seul un super administrateur peut modifier les rôles', 403);
    }

    const target = await Utilisateur.findById(userId);
    if (!target) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Ne pas se rétrograder soi-même
    if (target._id.equals(moderator._id) && donnees.newRole !== 'super_admin') {
      throw new ErreurAPI('Vous ne pouvez pas vous rétrograder vous-même', 400);
    }

    const oldRole = target.role;
    target.role = donnees.newRole;
    await target.save();

    // Log de l'action
    await auditLogger.actions.changeRole(req, target._id, oldRole, donnees.newRole, donnees.reason);

    res.status(200).json({
      succes: true,
      message: `Rôle modifié de "${oldRole}" à "${donnees.newRole}".`,
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

// ============ CONSULTATION UTILISATEURS ============

/**
 * Obtenir les détails de modération d'un utilisateur
 * GET /api/moderation/users/:id
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
      .select('prenom nom email avatar role permissions bannedAt banReason suspendedUntil warnings dateCreation')
      .populate('warnings.issuedBy', '_id prenom nom');

    if (!user) {
      throw new ErreurAPI('Utilisateur non trouvé', 404);
    }

    // Filtrer les warnings expirés pour le comptage actif
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
 * Lister les utilisateurs avec filtres de modération
 * GET /api/moderation/users
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

    // Filtre par rôle
    const role = req.query.role as string;
    if (role && ['user', 'modo_test', 'modo', 'admin_modo', 'super_admin'].includes(role)) {
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
        .select('_id prenom nom email avatar role bannedAt suspendedUntil warnings dateCreation')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Utilisateur.countDocuments(filter),
    ]);

    // Enrichir avec le statut de modération
    const enrichedUsers = users.map((user) => ({
      ...user,
      isBanned: user.bannedAt !== null,
      isSuspended: user.suspendedUntil ? new Date(user.suspendedUntil) > new Date() : false,
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
