/**
 * Controller des commandes marketplace
 * CRUD et gestion du cycle de vie des commandes (transitions de statut).
 */
import { Request, Response } from 'express';
/**
 * POST /api/marketplace/orders
 * Creer une nouvelle commande pour un service actif.
 * Body: { serviceId, optionsSelectionnees?: number[] }
 */
export declare const creerCommande: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/marketplace/orders/achats
 * Recuperer les commandes passees par l'utilisateur connecte (role acheteur).
 * Query: page, limit
 */
export declare const getMesAchats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/marketplace/orders/ventes
 * Recuperer les commandes recues par l'utilisateur connecte (role vendeur/entrepreneur).
 * Query: page, limit
 */
export declare const getMesVentes: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/marketplace/orders/:id/statut
 * Changer le statut d'une commande (machine a etats).
 * Body: { statut, commentaire? }
 */
export declare const changerStatutCommande: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=orders.d.ts.map