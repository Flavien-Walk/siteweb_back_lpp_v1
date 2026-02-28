/**
 * Admin marketplace - Litiges
 * Listing et resolution des litiges marketplace pour le panel de moderation
 */
import { Request, Response, NextFunction } from 'express';
/**
 * GET /api/admin/marketplace/litiges
 * Liste paginee des commandes en litige
 */
export declare const listerLitiges: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/admin/marketplace/litiges/:id/resoudre
 * Resoudre un litige : reprendre le travail ou annuler la commande
 */
export declare const resoudreLitige: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/admin/marketplace/litiges/:id/mediation
 * Recupere tous les messages de mediation (les deux canaux) pour le moderateur
 */
export declare const getMediationMessages: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/admin/marketplace/litiges/:id/mediation
 * Envoyer un message de mediation en tant que moderateur (sur un canal specifique)
 */
export declare const sendMediationMessage: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=litiges.d.ts.map