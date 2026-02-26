import { Request, Response } from 'express';
/**
 * POST /api/marketplace/services
 * Creer un nouveau service marketplace
 */
export declare const creerService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * PATCH /api/marketplace/services/:id
 * Modifier un service existant (proprietaire uniquement)
 */
export declare const modifierService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * DELETE /api/marketplace/services/:id
 * Archiver un service (soft delete - proprietaire uniquement)
 */
export declare const archiverService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/marketplace/services
 * Lister les services actifs (public, pas d'auth requise)
 * Query: ?categorie=X&q=searchterm&page=1&limit=20&tri=recent|populaire|note
 */
export declare const listerServices: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/marketplace/services/:id
 * Detail d'un service (public)
 */
export declare const getService: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/marketplace/mes-services
 * Liste des services de l'entrepreneur connecte (tous statuts)
 */
export declare const getMesServices: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=services.d.ts.map