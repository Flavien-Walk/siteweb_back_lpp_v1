import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import SupportTicket from '../models/SupportTicket.js';
import Notification from '../models/Notification.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';

// ============================================
// SCHEMAS DE VALIDATION
// ============================================

const schemaCreerTicket = z.object({
  subject: z.string().min(5, 'L\'objet doit faire au moins 5 caracteres').max(200, 'L\'objet ne peut pas depasser 200 caracteres').trim(),
  category: z.enum(['bug', 'compte', 'contenu', 'signalement', 'suggestion', 'autre']),
  message: z.string().min(10, 'Le message doit faire au moins 10 caracteres').max(2000, 'Le message ne peut pas depasser 2000 caracteres').trim(),
});

const schemaAjouterMessage = z.object({
  content: z.string().min(1, 'Le message ne peut pas etre vide').max(2000, 'Le message ne peut pas depasser 2000 caracteres').trim(),
});

const schemaChangerStatut = z.object({
  status: z.enum(['en_attente', 'en_cours', 'termine']),
});

const schemaAssigner = z.object({
  assigneeId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), 'ID invalide'),
});

// ============================================
// STRIP HTML (meme pattern que validation.ts)
// ============================================
const stripHtml = (val: string): string =>
  val.replace(/<[^>]*>/g, '').replace(/javascript\s*:/gi, '').replace(/on\w+\s*=/gi, '');

// ============================================
// ENDPOINTS UTILISATEUR
// ============================================

/**
 * POST /api/support
 * Creer un ticket de support
 */
export const creerTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const donnees = schemaCreerTicket.parse(req.body);

    // Rate limit: max 3 tickets ouverts par utilisateur
    const ticketsOuverts = await SupportTicket.countDocuments({
      user: userId,
      status: { $in: ['en_attente', 'en_cours'] },
    });

    if (ticketsOuverts >= 3) {
      throw new ErreurAPI(
        'Vous avez deja 3 tickets ouverts. Veuillez attendre qu\'un ticket soit resolu avant d\'en creer un nouveau.',
        429
      );
    }

    const ticket = await SupportTicket.create({
      user: userId,
      subject: stripHtml(donnees.subject),
      category: donnees.category,
      status: 'en_attente',
      priority: 'medium',
      messages: [
        {
          sender: userId,
          senderRole: 'user',
          content: stripHtml(donnees.message),
          dateCreation: new Date(),
        },
      ],
    });

    // Populate pour la reponse
    await ticket.populate('messages.sender', '_id prenom nom avatar');

    res.status(201).json({
      succes: true,
      message: 'Ticket cree avec succes.',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support
 * Lister mes tickets
 */
export const listerMesTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const { page = '1', limit = '20', status } = req.query;

    const pageNum = Math.min(100, Math.max(1, parseInt(page as string, 10)));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filtre: Record<string, unknown> = { user: userId };
    if (typeof status === 'string' && ['en_attente', 'en_cours', 'termine'].includes(status)) {
      filtre.status = status;
    }

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filtre)
        .sort({ dateMiseAJour: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('subject category status priority dateCreation dateMiseAJour dateFermeture messages')
        .lean(),
      SupportTicket.countDocuments(filtre),
    ]);

    // Ajouter le nombre de messages et le dernier message pour chaque ticket
    const ticketsFormates = tickets.map((t: any) => ({
      _id: t._id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      priority: t.priority,
      dateCreation: t.dateCreation,
      dateMiseAJour: t.dateMiseAJour,
      dateFermeture: t.dateFermeture,
      nbMessages: t.messages?.length || 0,
      dernierMessage: t.messages?.length > 0
        ? {
            senderRole: t.messages[t.messages.length - 1].senderRole,
            content: t.messages[t.messages.length - 1].content.substring(0, 100),
            dateCreation: t.messages[t.messages.length - 1].dateCreation,
          }
        : null,
    }));

    res.json({
      succes: true,
      data: {
        tickets: ticketsFormates,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/support/:id
 * Detail d'un de mes tickets
 */
export const getMonTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID ticket invalide.', 400);
    }

    const ticket = await SupportTicket.findById(id)
      .populate('assignedTo', '_id prenom nom avatar')
      .populate('messages.sender', '_id prenom nom avatar');

    if (!ticket) {
      throw new ErreurAPI('Ticket non trouve.', 404);
    }

    // Verifier ownership
    if (ticket.user.toString() !== userId.toString()) {
      throw new ErreurAPI('Ticket non trouve.', 404);
    }

    res.json({
      succes: true,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/support/:id/messages
 * Ajouter un message a mon ticket
 */
export const ajouterMessageUtilisateur = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const { id } = req.params;
    const donnees = schemaAjouterMessage.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID ticket invalide.', 400);
    }

    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      throw new ErreurAPI('Ticket non trouve.', 404);
    }

    if (ticket.user.toString() !== userId.toString()) {
      throw new ErreurAPI('Ticket non trouve.', 404);
    }

    if (ticket.status === 'termine') {
      throw new ErreurAPI('Ce ticket est ferme. Vous ne pouvez plus envoyer de message.', 400);
    }

    const nouveauMessage = {
      sender: userId,
      senderRole: 'user' as const,
      content: stripHtml(donnees.content),
      dateCreation: new Date(),
    };

    ticket.messages.push(nouveauMessage as any);
    await ticket.save();

    // Populate le dernier message pour la reponse
    await ticket.populate('messages.sender', '_id prenom nom avatar');

    const dernier = ticket.messages[ticket.messages.length - 1];

    res.json({
      succes: true,
      message: 'Message envoye.',
      data: { message: dernier },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ENDPOINTS STAFF (ADMIN)
// ============================================

/**
 * GET /api/admin/tickets/stats
 * Stats des tickets pour le dashboard
 */
export const getTicketStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [enAttente, enCours, termine] = await Promise.all([
      SupportTicket.countDocuments({ status: 'en_attente' }),
      SupportTicket.countDocuments({ status: 'en_cours' }),
      SupportTicket.countDocuments({ status: 'termine' }),
    ]);

    res.json({
      succes: true,
      data: { enAttente, enCours, termine },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/tickets
 * Lister tous les tickets (staff)
 */
export const listerTicketsAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      category,
      priority,
      assignedTo,
      sort = 'dateMiseAJour',
      order = 'desc',
    } = req.query;

    const pageNum = Math.min(100, Math.max(1, parseInt(page as string, 10)));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filtre: Record<string, unknown> = {};
    if (typeof status === 'string' && ['en_attente', 'en_cours', 'termine'].includes(status)) {
      filtre.status = status;
    }
    if (typeof category === 'string' && ['bug', 'compte', 'contenu', 'signalement', 'suggestion', 'autre'].includes(category)) {
      filtre.category = category;
    }
    if (typeof priority === 'string' && ['low', 'medium', 'high'].includes(priority)) {
      filtre.priority = priority;
    }
    if (typeof assignedTo === 'string' && mongoose.Types.ObjectId.isValid(assignedTo)) {
      filtre.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    const sortField = ['dateCreation', 'dateMiseAJour', 'priority', 'status'].includes(sort as string)
      ? (sort as string)
      : 'dateMiseAJour';
    const sortOrder = order === 'asc' ? 1 : -1;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(filtre)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limitNum)
        .populate('user', '_id prenom nom avatar email')
        .populate('assignedTo', '_id prenom nom avatar')
        .lean(),
      SupportTicket.countDocuments(filtre),
    ]);

    // Formater : ajouter nbMessages et dernierMessage, retirer le contenu complet des messages
    const ticketsFormates = tickets.map((t: any) => ({
      _id: t._id,
      user: t.user,
      subject: t.subject,
      category: t.category,
      status: t.status,
      priority: t.priority,
      assignedTo: t.assignedTo,
      dateCreation: t.dateCreation,
      dateMiseAJour: t.dateMiseAJour,
      dateFermeture: t.dateFermeture,
      nbMessages: t.messages?.length || 0,
      dernierMessage: t.messages?.length > 0
        ? {
            senderRole: t.messages[t.messages.length - 1].senderRole,
            content: t.messages[t.messages.length - 1].content.substring(0, 100),
            dateCreation: t.messages[t.messages.length - 1].dateCreation,
          }
        : null,
    }));

    res.json({
      succes: true,
      data: {
        tickets: ticketsFormates,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/tickets/:id
 * Detail d'un ticket (staff)
 */
export const getTicketAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID ticket invalide.', 400);
    }

    const ticket = await SupportTicket.findById(id)
      .populate('user', '_id prenom nom avatar email')
      .populate('assignedTo', '_id prenom nom avatar')
      .populate('messages.sender', '_id prenom nom avatar role');

    if (!ticket) {
      throw new ErreurAPI('Ticket non trouve.', 404);
    }

    res.json({
      succes: true,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/tickets/:id/respond
 * Repondre a un ticket (staff)
 */
export const repondreTicketAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const staffId = req.utilisateur!._id;
    const { id } = req.params;
    const donnees = schemaAjouterMessage.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID ticket invalide.', 400);
    }

    const ticket = await SupportTicket.findById(id);

    if (!ticket) {
      throw new ErreurAPI('Ticket non trouve.', 404);
    }

    if (ticket.status === 'termine') {
      throw new ErreurAPI('Ce ticket est ferme.', 400);
    }

    // Ajouter le message staff
    ticket.messages.push({
      sender: staffId,
      senderRole: 'staff',
      content: stripHtml(donnees.content),
      dateCreation: new Date(),
    } as any);

    // Auto-passer en 'en_cours' si etait 'en_attente'
    if (ticket.status === 'en_attente') {
      ticket.status = 'en_cours';
    }

    // Auto-assigner si pas encore assigne
    if (!ticket.assignedTo) {
      ticket.assignedTo = staffId;
    }

    await ticket.save();

    // Populate pour la reponse
    await ticket.populate('user', '_id prenom nom avatar email');
    await ticket.populate('assignedTo', '_id prenom nom avatar');
    await ticket.populate('messages.sender', '_id prenom nom avatar role');

    // Creer une notification pour l'utilisateur
    const staffUser = req.utilisateur!;
    try {
      await Notification.create({
        destinataire: ticket.user._id,
        type: 'support_reponse',
        titre: 'Reponse du support',
        message: `${staffUser.prenom} ${staffUser.nom} a repondu a votre ticket "${ticket.subject.substring(0, 80)}".`,
        data: {
          ticketId: ticket._id.toString(),
          ticketSubject: ticket.subject,
          userId: staffId.toString(),
          userPrenom: staffUser.prenom,
          userNom: staffUser.nom,
          userAvatar: staffUser.avatar || undefined,
        },
      });
    } catch (notifError) {
      // Ne pas bloquer la reponse si la notification echoue
      console.error('Erreur creation notification support:', notifError);
    }

    res.json({
      succes: true,
      message: 'Reponse envoyee.',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/tickets/:id/status
 * Changer le statut d'un ticket
 */
export const changerStatutTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const donnees = schemaChangerStatut.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID ticket invalide.', 400);
    }

    const update: Record<string, unknown> = { status: donnees.status };

    if (donnees.status === 'termine') {
      update.dateFermeture = new Date();
    } else {
      update.dateFermeture = null;
    }

    const ticket = await SupportTicket.findByIdAndUpdate(id, update, { new: true })
      .populate('user', '_id prenom nom avatar email')
      .populate('assignedTo', '_id prenom nom avatar');

    if (!ticket) {
      throw new ErreurAPI('Ticket non trouve.', 404);
    }

    res.json({
      succes: true,
      message: `Ticket passe en "${donnees.status}".`,
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/tickets/:id/assign
 * Assigner un ticket a un membre du staff
 */
export const assignerTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const donnees = schemaAssigner.parse(req.body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID ticket invalide.', 400);
    }

    // Trouver le ticket pour verifier son statut actuel
    const ticketExistant = await SupportTicket.findById(id);
    if (!ticketExistant) {
      throw new ErreurAPI('Ticket non trouve.', 404);
    }

    // Construire la mise a jour : assigner + passer en_cours si en_attente
    const update: Record<string, unknown> = {
      assignedTo: new mongoose.Types.ObjectId(donnees.assigneeId),
    };
    if (ticketExistant.status === 'en_attente') {
      update.status = 'en_cours';
    }

    const ticket = await SupportTicket.findByIdAndUpdate(id, update, { new: true })
      .populate('user', '_id prenom nom avatar email')
      .populate('assignedTo', '_id prenom nom avatar');

    res.json({
      succes: true,
      message: 'Ticket assigne.',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};
