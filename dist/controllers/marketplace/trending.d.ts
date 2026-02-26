import { Request, Response } from 'express';
/**
 * Recuperer les services tendance (public)
 * GET /api/marketplace/trending?periode=7&limit=10
 *
 * Algorithme :
 * 1. Aggreger les evenements (views, contacts, orders) sur la periode
 * 2. Calculer un score pondere : views*1 + contacts*5 + orders*20
 * 3. Appliquer un bonus de notation : finalScore = score * (1 + noteGlobale/10)
 * 4. Trier par score final decroissant
 */
export declare const getTrending: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=trending.d.ts.map