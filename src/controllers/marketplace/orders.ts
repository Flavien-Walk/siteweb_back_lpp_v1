/**
 * Controller des commandes marketplace
 * CRUD et gestion du cycle de vie des commandes (transitions de statut).
 */
import { Request, Response } from 'express';
import MarketplaceOrder, { TRANSITIONS_AUTORISEES, QUI_PEUT_TRANSITIONNER } from '../../models/MarketplaceOrder.js';
import MarketplaceService from '../../models/MarketplaceService.js';
import MarketplaceEvent from '../../models/MarketplaceEvent.js';
import { recomputeServiceStats } from './helpers.js';

/**
 * POST /api/marketplace/orders
 * Creer une nouvelle commande pour un service actif.
 * Body: { serviceId, optionsSelectionnees?: number[] }
 */
export const creerCommande = async (req: Request, res: Response) => {
  try {
    const { serviceId, optionsSelectionnees } = req.body;

    if (!serviceId) {
      return res.status(400).json({ succes: false, message: "Le serviceId est requis" });
    }

    // Verifier que le service existe et est actif
    const service = await MarketplaceService.findById(serviceId);
    if (!service) {
      return res.status(404).json({ succes: false, message: "Service introuvable" });
    }
    if (service.statut !== 'actif') {
      return res.status(400).json({ succes: false, message: "Ce service n'est pas disponible a la commande" });
    }

    // L'acheteur ne peut pas commander son propre service
    if (service.createur.equals((req as any).utilisateur._id)) {
      return res.status(403).json({ succes: false, message: "Vous ne pouvez pas commander votre propre service" });
    }

    // Construire le snapshot des options selectionnees
    const optionsSnapshot: Array<{ label: string; prix: number; devise: string }> = [];
    if (Array.isArray(optionsSelectionnees) && optionsSelectionnees.length > 0) {
      for (const index of optionsSelectionnees) {
        if (typeof index !== 'number' || index < 0 || index >= (service.options || []).length) {
          return res.status(400).json({
            succes: false,
            message: `Index d'option invalide: ${index}`,
          });
        }
        const opt = service.options[index];
        optionsSnapshot.push({
          label: opt.label,
          prix: opt.prix,
          devise: opt.devise || 'EUR',
        });
      }
    }

    // Calculer le montant total
    // Si le prix du service est null ("Sur devis"), montantTotal = 0 (placeholder)
    let montantTotal = 0;
    if (service.prix !== null && service.prix !== undefined) {
      montantTotal = service.prix;
      for (const opt of optionsSnapshot) {
        montantTotal += opt.prix;
      }
    }

    // Creer la commande
    const commande = await MarketplaceOrder.create({
      service: service._id,
      acheteur: (req as any).utilisateur._id,
      vendeur: service.createur,
      serviceSnapshot: {
        nom: service.nom,
        prix: service.prix,
        devise: service.devise || 'EUR',
      },
      optionsSelectionnees: optionsSnapshot,
      montantTotal,
      statut: 'en_attente',
      historique: [{
        de: 'en_attente',
        vers: 'en_attente',
        par: (req as any).utilisateur._id,
      }],
    });

    // Tracker l'evenement analytics
    await MarketplaceEvent.create({
      service: service._id,
      type: 'order',
      utilisateur: (req as any).utilisateur._id,
    });

    return res.status(201).json({ succes: true, data: { commande } });
  } catch (error) {
    console.error('[marketplace:orders] Erreur creerCommande:', error);
    return res.status(500).json({ succes: false, message: "Erreur lors de la creation de la commande" });
  }
};

/**
 * GET /api/marketplace/orders/achats
 * Recuperer les commandes passees par l'utilisateur connecte (role acheteur).
 * Query: page, limit
 */
export const getMesAchats = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filtre = { acheteur: (req as any).utilisateur._id };

    const [commandes, total] = await Promise.all([
      MarketplaceOrder.find(filtre)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .populate('service', 'nom image')
        .populate('vendeur', 'prenom nom avatar')
        .lean(),
      MarketplaceOrder.countDocuments(filtre),
    ]);

    return res.json({
      succes: true,
      data: {
        commandes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[marketplace:orders] Erreur getMesAchats:', error);
    return res.status(500).json({ succes: false, message: "Erreur lors de la recuperation des achats" });
  }
};

/**
 * GET /api/marketplace/orders/ventes
 * Recuperer les commandes recues par l'utilisateur connecte (role vendeur/entrepreneur).
 * Query: page, limit
 */
export const getMesVentes = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filtre = { vendeur: (req as any).utilisateur._id };

    const [commandes, total] = await Promise.all([
      MarketplaceOrder.find(filtre)
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(limit)
        .populate('service', 'nom image')
        .populate('acheteur', 'prenom nom avatar')
        .lean(),
      MarketplaceOrder.countDocuments(filtre),
    ]);

    return res.json({
      succes: true,
      data: {
        commandes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[marketplace:orders] Erreur getMesVentes:', error);
    return res.status(500).json({ succes: false, message: "Erreur lors de la recuperation des ventes" });
  }
};

/**
 * PATCH /api/marketplace/orders/:id/statut
 * Changer le statut d'une commande (machine a etats).
 * Body: { statut, commentaire? }
 */
export const changerStatutCommande = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { statut: nouveauStatut, commentaire } = req.body;

    if (!nouveauStatut) {
      return res.status(400).json({ succes: false, message: "Le nouveau statut est requis" });
    }

    // Charger la commande
    const commande = await MarketplaceOrder.findById(id);
    if (!commande) {
      return res.status(404).json({ succes: false, message: "Commande introuvable" });
    }

    // Verifier que la transition est autorisee
    const transitionsValides = TRANSITIONS_AUTORISEES[commande.statut];
    if (!transitionsValides || !transitionsValides.includes(nouveauStatut)) {
      return res.status(400).json({
        succes: false,
        message: `Transition impossible: ${commande.statut} -> ${nouveauStatut}`,
      });
    }

    // Verifier que l'utilisateur a le droit d'effectuer cette transition
    const cle = commande.statut + '->' + nouveauStatut;
    const regle = QUI_PEUT_TRANSITIONNER[cle];
    let autorise = false;

    switch (regle) {
      case 'acheteur':
        autorise = (req as any).utilisateur._id.equals(commande.acheteur);
        break;
      case 'vendeur':
        autorise = (req as any).utilisateur._id.equals(commande.vendeur);
        break;
      case 'both':
        autorise = (req as any).utilisateur._id.equals(commande.acheteur)
          || (req as any).utilisateur._id.equals(commande.vendeur);
        break;
      case 'staff':
        autorise = (req as any).utilisateur.isStaff();
        break;
      default:
        autorise = false;
    }

    if (!autorise) {
      return res.status(403).json({
        succes: false,
        message: "Vous n'etes pas autorise a effectuer cette transition",
      });
    }

    // Appliquer la transition
    const ancienStatut = commande.statut;
    commande.statut = nouveauStatut;
    commande.historique.push({
      de: ancienStatut,
      vers: nouveauStatut,
      date: new Date(),
      par: (req as any).utilisateur._id,
      commentaire: commentaire || undefined,
    });

    await commande.save();

    // Si la commande est terminee, recalculer les stats du service
    if (nouveauStatut === 'termine') {
      await recomputeServiceStats(commande.service);
    }

    return res.json({ succes: true, data: { commande } });
  } catch (error) {
    console.error('[marketplace:orders] Erreur changerStatutCommande:', error);
    return res.status(500).json({ succes: false, message: "Erreur lors du changement de statut" });
  }
};
