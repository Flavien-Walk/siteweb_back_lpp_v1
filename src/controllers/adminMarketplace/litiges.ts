/**
 * Admin marketplace - Litiges
 * Listing et resolution des litiges marketplace pour le panel de moderation
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import MarketplaceOrder, { TRANSITIONS_AUTORISEES, OrderStatut } from '../../models/MarketplaceOrder.js';
import Notification from '../../models/Notification.js';
import { emitNewNotification } from '../../socket/emitters.js';
import { auditLogger } from '../../utils/auditLogger.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';

const schemaResoudreLitige = z.object({
  resolution: z.string().min(10, 'La resolution doit faire au moins 10 caracteres').max(2000),
  action: z.enum(['reprendre', 'annuler'], {
    errorMap: () => ({ message: "L'action doit etre 'reprendre' ou 'annuler'" }),
  }),
});

/**
 * GET /api/admin/marketplace/litiges
 * Liste paginee des commandes en litige
 */
export const listerLitiges = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    const includeResolved = req.query.includeResolved === 'true';
    if (includeResolved) {
      filter['historique.vers'] = 'litige';
    } else {
      filter.statut = 'litige';
    }

    const acheteurId = req.query.acheteurId as string;
    if (acheteurId && mongoose.Types.ObjectId.isValid(acheteurId)) {
      filter.acheteur = new mongoose.Types.ObjectId(acheteurId);
    }

    const vendeurId = req.query.vendeurId as string;
    if (vendeurId && mongoose.Types.ObjectId.isValid(vendeurId)) {
      filter.vendeur = new mongoose.Types.ObjectId(vendeurId);
    }

    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
      filter.dateCreation = dateFilter;
    }

    const [commandes, total] = await Promise.all([
      MarketplaceOrder.find(filter)
        .populate('acheteur', '_id prenom nom avatar email')
        .populate('vendeur', '_id prenom nom avatar email')
        .populate('service', '_id nom image categorie')
        .sort({ dateMiseAJour: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MarketplaceOrder.countDocuments(filter),
    ]);

    const litiges = commandes.map((c: any) => {
      const litigeEvent = [...(c.historique || [])].reverse().find(
        (h: any) => h.vers === 'litige'
      );
      return {
        ...c,
        litigeInfo: litigeEvent
          ? { raison: litigeEvent.commentaire, ouvertPar: litigeEvent.par, dateOuverture: litigeEvent.date }
          : null,
      };
    });

    res.status(200).json({
      succes: true,
      data: {
        litiges,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/marketplace/litiges/:id/resoudre
 * Resoudre un litige : reprendre le travail ou annuler la commande
 */
export const resoudreLitige = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const moderator = (req as any).utilisateur;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID commande invalide', 400);
    }

    const donnees = schemaResoudreLitige.parse(req.body);

    const commande = await MarketplaceOrder.findById(id);
    if (!commande) {
      throw new ErreurAPI('Commande introuvable', 404);
    }

    if (commande.statut !== 'litige') {
      throw new ErreurAPI("Cette commande n'est pas en litige", 400);
    }

    const nouveauStatut: OrderStatut = donnees.action === 'reprendre' ? 'en_cours' : 'annule';

    const transitions = TRANSITIONS_AUTORISEES[commande.statut];
    if (!transitions || !transitions.includes(nouveauStatut)) {
      throw new ErreurAPI(`Transition litige → ${nouveauStatut} non autorisee`, 400);
    }

    const ancienStatut = commande.statut;

    commande.statut = nouveauStatut;
    commande.historique.push({
      de: ancienStatut,
      vers: nouveauStatut,
      date: new Date(),
      par: moderator._id,
      commentaire: `[ADMIN] Resolution litige: ${donnees.resolution}`,
    });

    await commande.save();

    // Audit log
    await auditLogger.log(req, {
      action: 'marketplace:resolve_dispute',
      targetType: 'commande',
      targetId: commande._id as mongoose.Types.ObjectId,
      reason: donnees.resolution,
      metadata: {
        action: donnees.action,
        ancienStatut,
        nouveauStatut,
        acheteurId: commande.acheteur.toString(),
        vendeurId: commande.vendeur.toString(),
        montantTotal: commande.montantTotal,
      },
      snapshot: {
        before: { statut: ancienStatut },
        after: { statut: nouveauStatut },
      },
    });

    // Notifier les deux parties
    const serviceNom = commande.serviceSnapshot?.nom || 'Service';
    const messageResolution = donnees.action === 'reprendre'
      ? `Le litige sur "${serviceNom}" a ete resolu. La commande reprend.`
      : `Le litige sur "${serviceNom}" a ete resolu. La commande a ete annulee.`;

    await Promise.all([
      notifierResolutionLitige(commande._id.toString(), serviceNom, messageResolution, commande.acheteur.toString()),
      notifierResolutionLitige(commande._id.toString(), serviceNom, messageResolution, commande.vendeur.toString()),
    ]);

    res.status(200).json({
      succes: true,
      message: `Litige resolu: commande ${donnees.action === 'reprendre' ? 'reprise' : 'annulee'}.`,
      data: { commande },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cree une notification de resolution de litige + push socket
 */
async function notifierResolutionLitige(
  commandeId: string,
  serviceNom: string,
  message: string,
  destinataireId: string,
) {
  try {
    const notif = await Notification.create({
      destinataire: destinataireId,
      type: 'interaction',
      titre: 'Litige resolu',
      message,
      data: { commandeId, serviceNom },
    });

    emitNewNotification(destinataireId, {
      _id: notif._id.toString(),
      type: notif.type,
      titre: notif.titre,
      message: notif.message,
      lu: false,
      dateCreation: notif.dateCreation.toISOString(),
    });
  } catch (err) {
    console.error('[adminMarketplace] Erreur notif resolution litige:', err);
  }
}
