import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import SupportTicket from '../../models/SupportTicket.js';
import Utilisateur from '../../models/Utilisateur.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { stripHtml } from '../../utils/strings.js';

// ============================================
// SCHEMAS DE VALIDATION
// ============================================

const schemaCreerTicket = z.object({
  subject: z.string().min(5, 'L\'objet doit faire au moins 5 caracteres').max(200, 'L\'objet ne peut pas depasser 200 caracteres').trim(),
  category: z.enum(['bug', 'compte', 'contenu', 'signalement', 'suggestion', 'autre']),
  message: z.string().min(10, 'Le message doit faire au moins 10 caracteres').max(2000, 'Le message ne peut pas depasser 2000 caracteres').trim(),
});

export const schemaAjouterMessage = z.object({
  content: z.string().min(1, 'Le message ne peut pas etre vide').max(2000, 'Le message ne peut pas depasser 2000 caracteres').trim(),
});

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

    // LPP+ : priorite haute automatique pour les abonnes
    const user = await Utilisateur.findById(userId).select('lppPlus').lean() as any;
    const isLppPlus = user?.lppPlus?.status === 'active';

    const ticket = await SupportTicket.create({
      user: userId,
      subject: stripHtml(donnees.subject),
      category: donnees.category,
      status: 'en_attente',
      priority: isLppPlus ? 'high' : 'medium',
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
    if (typeof status === 'string') {
      if (status === 'active') {
        filtre.status = { $in: ['en_attente', 'en_cours'] };
      } else if (['en_attente', 'en_cours', 'termine'].includes(status)) {
        filtre.status = status;
      }
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
