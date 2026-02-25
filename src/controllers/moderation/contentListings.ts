// contentListings.ts - Content listing endpoints for admin panel
// (publications, commentaires, projets, conversations, lives, evenements)

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Publication from '../../models/Publication.js';
import Commentaire from '../../models/Commentaire.js';
import Projet from '../../models/Projet.js';
import { Message, Conversation } from '../../models/Message.js';
import Live from '../../models/Live.js';
import Evenement from '../../models/Evenement.js';
import { escapeRegex } from '../../utils/strings.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';

// ============ PUBLICATIONS (ADMIN) ============

/**
 * Liste paginée des publications pour l'admin
 * GET /api/admin/publications
 */
export const listPublications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Filtre par type
    const type = req.query.type as string;
    if (type && ['post', 'annonce', 'update', 'editorial', 'live-extrait'].includes(type)) {
      filter.type = type;
    }

    // Filtre par statut hidden
    const status = req.query.status as string;
    if (status === 'hidden') {
      filter.isHidden = true;
    } else if (status === 'visible') {
      filter.isHidden = { $ne: true };
    }

    // Filtre par auteur
    const auteurId = req.query.auteurId as string;
    if (auteurId && mongoose.Types.ObjectId.isValid(auteurId)) {
      filter.auteur = new mongoose.Types.ObjectId(auteurId);
    }

    // Recherche texte
    const search = req.query.search as string;
    if (search && search.length >= 2) {
      filter.contenu = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
    }

    // Filtre par dates
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
    if (dateFrom || dateTo) {
      filter.dateCreation = {};
      if (dateFrom) (filter.dateCreation as Record<string, Date>).$gte = dateFrom;
      if (dateTo) (filter.dateCreation as Record<string, Date>).$lte = dateTo;
    }

    const [publications, total] = await Promise.all([
      Publication.find(filter)
        .populate('auteur', '_id prenom nom avatar email role')
        .populate('projet', '_id nom')
        .select('_id auteur auteurType type contenu media medias likes nbCommentaires isHidden dateCreation dateMiseAJour')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Publication.countDocuments(filter),
    ]);

    const enriched = publications.map((pub: any) => ({
      ...pub,
      likesCount: pub.likes?.length || 0,
    }));

    res.status(200).json({
      succes: true,
      data: {
        publications: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ COMMENTAIRES (ADMIN) ============

/**
 * Liste paginée des commentaires pour l'admin
 * GET /api/admin/commentaires
 */
export const listCommentaires = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Filtre par publication
    const publicationId = req.query.publicationId as string;
    if (publicationId && mongoose.Types.ObjectId.isValid(publicationId)) {
      filter.publication = new mongoose.Types.ObjectId(publicationId);
    }

    // Filtre par auteur
    const auteurId = req.query.auteurId as string;
    if (auteurId && mongoose.Types.ObjectId.isValid(auteurId)) {
      filter.auteur = new mongoose.Types.ObjectId(auteurId);
    }

    // Recherche texte
    const search = req.query.search as string;
    if (search && search.length >= 2) {
      filter.contenu = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
    }

    // Filtre par dates
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
    if (dateFrom || dateTo) {
      filter.dateCreation = {};
      if (dateFrom) (filter.dateCreation as Record<string, Date>).$gte = dateFrom;
      if (dateTo) (filter.dateCreation as Record<string, Date>).$lte = dateTo;
    }

    const [commentaires, total] = await Promise.all([
      Commentaire.find(filter)
        .populate('auteur', '_id prenom nom avatar email')
        .populate('publication', '_id contenu auteur')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Commentaire.countDocuments(filter),
    ]);

    const enriched = commentaires.map((com: any) => ({
      ...com,
      likesCount: com.likes?.length || 0,
    }));

    res.status(200).json({
      succes: true,
      data: {
        commentaires: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ PROJETS (ADMIN) ============

/**
 * Liste paginée des projets pour l'admin (tous statuts)
 * GET /api/admin/projets
 */
export const listProjets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Filtre par catégorie
    const categorie = req.query.categorie as string;
    if (categorie) {
      filter.categorie = categorie;
    }

    // Filtre par statut (draft/published)
    const statut = req.query.statut as string;
    if (statut && ['draft', 'published'].includes(statut)) {
      filter.statut = statut;
    }

    // Filtre par maturité
    const maturite = req.query.maturite as string;
    if (maturite) {
      filter.maturite = maturite;
    }

    // Filtre par hidden
    const status = req.query.status as string;
    if (status === 'hidden') {
      filter.isHidden = true;
    } else if (status === 'visible') {
      filter.isHidden = { $ne: true };
    }

    // Recherche texte
    const search = req.query.search as string;
    if (search && search.length >= 2) {
      const searchRegex = new RegExp(escapeRegex(search.slice(0, 100)), 'i');
      filter.$or = [
        { nom: searchRegex },
        { description: searchRegex },
      ];
    }

    // Filtre par dates
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
    if (dateFrom || dateTo) {
      filter.dateCreation = {};
      if (dateFrom) (filter.dateCreation as Record<string, Date>).$gte = dateFrom;
      if (dateTo) (filter.dateCreation as Record<string, Date>).$lte = dateTo;
    }

    const [projets, total] = await Promise.all([
      Projet.find(filter)
        .populate('porteur', '_id prenom nom avatar email')
        .select('_id nom description categorie maturite statut isHidden hiddenReason porteur followers dateCreation dateMiseAJour logo')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Projet.countDocuments(filter),
    ]);

    const enriched = projets.map((p: any) => ({
      ...p,
      followersCount: p.followers?.length || 0,
    }));

    res.status(200).json({
      succes: true,
      data: {
        projets: enriched,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ CONVERSATIONS (ADMIN - LECTURE SEULE) ============

/**
 * Liste paginée des conversations
 * GET /api/admin/conversations
 */
export const listConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Filtre groupes vs privées
    const type = req.query.type as string;
    if (type === 'groupe') {
      filter.estGroupe = true;
    } else if (type === 'prive') {
      filter.estGroupe = false;
    }

    // Recherche par participant
    const participantId = req.query.participantId as string;
    if (participantId && mongoose.Types.ObjectId.isValid(participantId)) {
      filter.participants = new mongoose.Types.ObjectId(participantId);
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .populate('participants', '_id prenom nom avatar')
        .populate('dernierMessage', 'contenuCrypte type dateCreation expediteur')
        .sort({ dateMiseAJour: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        conversations,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Messages d'une conversation (lecture seule)
 * GET /api/admin/conversations/:id/messages
 */
export const getConversationMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID conversation invalide', 400);
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(id)
      .populate('participants', '_id prenom nom avatar')
      .lean();

    if (!conversation) {
      throw new ErreurAPI('Conversation non trouvée', 404);
    }

    const [messages, total] = await Promise.all([
      Message.find({ conversation: id })
        .populate('expediteur', '_id prenom nom avatar')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversation: id }),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        conversation,
        messages,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ LIVES (ADMIN) ============

/**
 * Liste paginée des lives
 * GET /api/admin/lives
 */
export const listLives = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    const status = req.query.status as string;
    if (status === 'live') {
      filter.status = 'live';
    } else if (status === 'ended') {
      filter.status = 'ended';
    }

    const [lives, total] = await Promise.all([
      Live.find(filter)
        .populate('hostUserId', '_id prenom nom avatar email')
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Live.countDocuments(filter),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        lives,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============ EVENEMENTS (ADMIN) ============

/**
 * Liste paginée des événements
 * GET /api/admin/evenements
 */
export const listEvenements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    const type = req.query.type as string;
    if (type && ['live', 'replay', 'qr'].includes(type)) {
      filter.type = type;
    }

    const statut = req.query.statut as string;
    if (statut && ['a-venir', 'en-cours', 'termine'].includes(statut)) {
      filter.statut = statut;
    }

    const [evenements, total] = await Promise.all([
      Evenement.find(filter)
        .populate('projet', '_id nom')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Evenement.countDocuments(filter),
    ]);

    res.status(200).json({
      succes: true,
      data: {
        evenements,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};
