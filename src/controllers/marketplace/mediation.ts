/**
 * Marketplace - Mediation (user-facing)
 * Permet a l'acheteur/vendeur de lire et envoyer des messages de mediation sur son canal
 */
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import MarketplaceOrder from '../../models/MarketplaceOrder.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { stripHtml } from '../../utils/strings.js';

const schemaMediationMessage = z.object({
  contenu: z.string().min(1, 'Le message ne peut pas etre vide').max(2000),
});

/**
 * GET /api/marketplace/orders/:id/mediation
 * Recupere les messages de mediation pour le canal de l'utilisateur connecte
 */
export const getMesMediationMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).utilisateur._id.toString();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID commande invalide', 400);
    }

    const commande = await MarketplaceOrder.findById(id)
      .populate('mediationMessages.auteur', '_id prenom nom avatar')
      .select('mediationMessages acheteur vendeur statut serviceSnapshot')
      .lean();

    if (!commande) {
      throw new ErreurAPI('Commande introuvable', 404);
    }

    const isAcheteur = commande.acheteur.toString() === userId;
    const isVendeur = commande.vendeur.toString() === userId;

    if (!isAcheteur && !isVendeur) {
      throw new ErreurAPI("Vous n'etes pas partie de cette commande", 403);
    }

    const canal = isAcheteur ? 'acheteur' : 'vendeur';
    const messages = (commande.mediationMessages || [])
      .filter((m: any) => m.canal === canal)
      .sort((a: any, b: any) => new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime());

    // Marquer les messages du moderateur comme lus
    await MarketplaceOrder.updateOne(
      { _id: id },
      { $set: { 'mediationMessages.$[elem].lu': true } },
      { arrayFilters: [{ 'elem.canal': canal, 'elem.auteurRole': 'moderateur', 'elem.lu': false }] }
    );

    res.status(200).json({
      succes: true,
      data: { canal, messages },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/marketplace/orders/:id/mediation
 * Envoyer un message de mediation (utilisateur vers moderateur, sur son canal)
 */
export const envoyerMediationMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).utilisateur;
    const userId = user._id.toString();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ErreurAPI('ID commande invalide', 400);
    }

    const donnees = schemaMediationMessage.parse(req.body);

    const commande = await MarketplaceOrder.findById(id);
    if (!commande) {
      throw new ErreurAPI('Commande introuvable', 404);
    }

    const isAcheteur = commande.acheteur.toString() === userId;
    const isVendeur = commande.vendeur.toString() === userId;

    if (!isAcheteur && !isVendeur) {
      throw new ErreurAPI("Vous n'etes pas partie de cette commande", 403);
    }

    const canal: 'acheteur' | 'vendeur' = isAcheteur ? 'acheteur' : 'vendeur';
    const auteurRole: 'acheteur' | 'vendeur' = isAcheteur ? 'acheteur' : 'vendeur';

    const message = {
      canal,
      auteur: user._id,
      auteurRole,
      contenu: stripHtml(donnees.contenu.trim()),
      dateCreation: new Date(),
      lu: false,
    };

    commande.mediationMessages.push(message as any);
    await commande.save();

    res.status(201).json({
      succes: true,
      message: 'Message envoye.',
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};
