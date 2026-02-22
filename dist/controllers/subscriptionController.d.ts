import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/subscriptions/lpp-plus
 * Recuperer le statut d'abonnement LPP+ de l'utilisateur connecte
 */
export declare const getSubscription: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/subscriptions/lpp-plus/activate
 * Activer l'abonnement LPP+
 * NOTE: En production, cet endpoint sera appele apres validation du paiement (Stripe webhook, etc.)
 * Pour l'instant, activation directe pour le MVP
 */
export declare const activateSubscription: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/subscriptions/lpp-plus/cancel
 * Resilier l'abonnement LPP+ (fin de periode)
 */
export declare const cancelSubscription: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/subscriptions/lpp-plus/reactivate
 * Reactiver un abonnement resilie (avant la fin de periode)
 */
export declare const reactivateSubscription: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=subscriptionController.d.ts.map