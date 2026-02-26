import { Request, Response } from 'express';
/**
 * Creer un avis sur un service apres une commande terminee
 * POST /api/marketplace/reviews
 */
export declare const creerReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Recuperer les avis d'un service (public)
 * GET /api/marketplace/reviews/:serviceId
 */
export declare const getReviewsService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Modifier un avis existant (proprietaire uniquement, dans les 7 jours)
 * PATCH /api/marketplace/reviews/:id
 */
export declare const modifierReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Supprimer un avis (proprietaire uniquement)
 * DELETE /api/marketplace/reviews/:id
 */
export declare const supprimerReview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=reviews.d.ts.map