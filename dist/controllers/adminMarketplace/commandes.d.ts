/**
 * Admin marketplace - Commandes
 * Listing, detail, stats des commandes marketplace pour le panel de moderation
 */
import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/admin/marketplace/commandes
 * Liste paginee de toutes les commandes avec filtres
 */
export declare const listerCommandes: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/admin/marketplace/commandes/stats
 * Stats agregees des commandes
 */
export declare const getCommandesStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/admin/marketplace/commandes/:id
 * Detail complet d'une commande
 */
export declare const getCommandeDetail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=commandes.d.ts.map