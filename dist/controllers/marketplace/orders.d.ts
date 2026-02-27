/**
 * Controller des commandes marketplace
 * Creation, listing (achats/ventes), detail.
 */
import { Request, Response } from 'express';
/**
 * POST /api/marketplace/orders
 * Creer une nouvelle commande avec brief acheteur.
 * Body: { serviceId, optionsSelectionnees?: number[], buyerBrief?: { message, attachments? } }
 */
export declare const creerCommande: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/marketplace/orders/:id
 * Detail complet d'une commande (acheteur ou vendeur uniquement)
 */
export declare const getOrderDetail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/marketplace/orders/achats
 * Mes achats. Query: ?statut, ?page, ?limit
 */
export declare const getMesAchats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/marketplace/orders/ventes
 * Mes ventes. Query: ?statut, ?page, ?limit
 */
export declare const getMesVentes: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=orders.d.ts.map