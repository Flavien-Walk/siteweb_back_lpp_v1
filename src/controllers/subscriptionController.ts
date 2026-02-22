import { Request, Response, NextFunction } from 'express';
import Utilisateur from '../models/Utilisateur.js';
import { ErreurAPI } from '../middlewares/gestionErreurs.js';
import {
  envoyerEmailLppActivation,
  envoyerEmailLppResiliation,
  envoyerEmailLppReactivation,
} from '../services/emailService.js';

/**
 * GET /api/subscriptions/lpp-plus
 * Recuperer le statut d'abonnement LPP+ de l'utilisateur connecte
 */
export const getSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const utilisateur = await Utilisateur.findById(userId).select('lppPlus');

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouve.', 404);
    }

    const lppPlus = (utilisateur as any).lppPlus || {
      status: 'inactive',
      startedAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      renewalCount: 0,
    };

    res.json({
      succes: true,
      data: {
        lppPlus: {
          status: lppPlus.status || 'inactive',
          startedAt: lppPlus.startedAt || null,
          currentPeriodEnd: lppPlus.currentPeriodEnd || null,
          cancelAtPeriodEnd: lppPlus.cancelAtPeriodEnd || false,
          canceledAt: lppPlus.canceledAt || null,
          renewalCount: lppPlus.renewalCount || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subscriptions/lpp-plus/activate
 * Activer l'abonnement LPP+
 * NOTE: En production, cet endpoint sera appele apres validation du paiement (Stripe webhook, etc.)
 * Pour l'instant, activation directe pour le MVP
 */
export const activateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const utilisateur = await Utilisateur.findById(userId);

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouve.', 404);
    }

    const currentLppPlus = (utilisateur as any).lppPlus;

    // Idempotent : si deja actif, retourner l'etat actuel sans erreur
    if (currentLppPlus?.status === 'active') {
      res.json({
        succes: true,
        message: 'Abonnement LPP+ deja actif.',
        data: {
          lppPlus: {
            status: currentLppPlus.status,
            startedAt: currentLppPlus.startedAt,
            currentPeriodEnd: currentLppPlus.currentPeriodEnd,
            cancelAtPeriodEnd: currentLppPlus.cancelAtPeriodEnd || false,
            canceledAt: currentLppPlus.canceledAt || null,
            renewalCount: currentLppPlus.renewalCount || 0,
          },
        },
      });
      return;
    }

    // Activer l'abonnement (1 mois)
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    (utilisateur as any).lppPlus = {
      status: 'active',
      startedAt: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      renewalCount: (currentLppPlus?.renewalCount || 0),
    };

    await utilisateur.save();

    // Envoyer email d'activation (fire & forget)
    const dateFinStr = periodEnd.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    envoyerEmailLppActivation(utilisateur.email, utilisateur.prenom, dateFinStr)
      .catch(err => console.error('[LPP+] Erreur email activation:', err));

    res.json({
      succes: true,
      message: 'Abonnement LPP+ active avec succes.',
      data: {
        lppPlus: {
          status: 'active',
          startedAt: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subscriptions/lpp-plus/cancel
 * Resilier l'abonnement LPP+ (fin de periode)
 */
export const cancelSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const utilisateur = await Utilisateur.findById(userId);

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouve.', 404);
    }

    const currentLppPlus = (utilisateur as any).lppPlus;

    if (currentLppPlus?.status !== 'active') {
      throw new ErreurAPI('Aucun abonnement actif a resilier.', 400);
    }

    // Idempotent : si deja resilie, retourner l'etat actuel
    if (currentLppPlus.cancelAtPeriodEnd) {
      res.json({
        succes: true,
        message: 'Resiliation deja programmee.',
        data: {
          lppPlus: {
            status: currentLppPlus.status,
            currentPeriodEnd: currentLppPlus.currentPeriodEnd,
            cancelAtPeriodEnd: true,
            canceledAt: currentLppPlus.canceledAt,
          },
        },
      });
      return;
    }

    // Marquer comme resilie en fin de periode
    (utilisateur as any).lppPlus.status = 'canceled';
    (utilisateur as any).lppPlus.cancelAtPeriodEnd = true;
    (utilisateur as any).lppPlus.canceledAt = new Date();

    await utilisateur.save();

    // Envoyer email de resiliation (fire & forget)
    const dateFinStr = currentLppPlus.currentPeriodEnd
      ? new Date(currentLppPlus.currentPeriodEnd).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'inconnue';
    envoyerEmailLppResiliation(utilisateur.email, utilisateur.prenom, dateFinStr)
      .catch(err => console.error('[LPP+] Erreur email resiliation:', err));

    res.json({
      succes: true,
      message: 'Resiliation prise en compte. L\'abonnement reste actif jusqu\'a la fin de la periode.',
      data: {
        lppPlus: {
          status: 'canceled',
          currentPeriodEnd: currentLppPlus.currentPeriodEnd,
          cancelAtPeriodEnd: true,
          canceledAt: (utilisateur as any).lppPlus.canceledAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subscriptions/lpp-plus/reactivate
 * Reactiver un abonnement resilie (avant la fin de periode)
 */
export const reactivateSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.utilisateur!._id;
    const utilisateur = await Utilisateur.findById(userId);

    if (!utilisateur) {
      throw new ErreurAPI('Utilisateur non trouve.', 404);
    }

    const currentLppPlus = (utilisateur as any).lppPlus;

    if (currentLppPlus?.status !== 'canceled' || !currentLppPlus.cancelAtPeriodEnd) {
      throw new ErreurAPI('Aucune resiliation en cours a annuler.', 400);
    }

    // Verifier que la periode n'est pas deja terminee
    if (currentLppPlus.currentPeriodEnd && new Date(currentLppPlus.currentPeriodEnd) < new Date()) {
      throw new ErreurAPI('La periode est terminee. Veuillez souscrire a nouveau.', 400);
    }

    // Reactiver
    (utilisateur as any).lppPlus.status = 'active';
    (utilisateur as any).lppPlus.cancelAtPeriodEnd = false;
    (utilisateur as any).lppPlus.canceledAt = null;

    await utilisateur.save();

    // Envoyer email de reactivation (fire & forget)
    envoyerEmailLppReactivation(utilisateur.email, utilisateur.prenom)
      .catch(err => console.error('[LPP+] Erreur email reactivation:', err));

    res.json({
      succes: true,
      message: 'Abonnement reactive avec succes.',
      data: {
        lppPlus: {
          status: 'active',
          currentPeriodEnd: currentLppPlus.currentPeriodEnd,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
