/**
 * Admin marketplace - Services
 * Listing et detail des services marketplace pour le panel de moderation
 */
import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/admin/marketplace/services
 * Liste paginee de tous les services avec filtres
 */
export declare const listerServices: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/admin/marketplace/services/:id
 * Detail complet d'un service avec stats et avis recents
 */
export declare const getServiceDetail: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=services.d.ts.map