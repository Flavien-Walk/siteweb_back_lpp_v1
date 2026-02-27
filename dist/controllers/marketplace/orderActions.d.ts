/**
 * Actions commandes marketplace — workflow ComeUp/Fiverr
 * Accept/refuse/start/deliver/complete/revision/cancel/dispute/progress
 */
import { Request, Response } from 'express';
/**
 * POST /api/marketplace/orders/:id/accept
 * Vendeur accepte la commande → acceptee, puis auto-start → en_cours
 */
export declare const accepterCommande: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/marketplace/orders/:id/refuse
 * Vendeur refuse la commande
 */
export declare const refuserCommande: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/marketplace/orders/:id/progress
 * Vendeur ajoute une mise a jour d'avancement
 */
export declare const ajouterProgression: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/marketplace/orders/:id/deliver
 * Vendeur ajoute des livrables et/ou marque la commande comme livree
 */
export declare const livrerCommande: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/marketplace/orders/:id/complete
 * Acheteur valide la livraison → termine
 */
export declare const validerCommande: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/marketplace/orders/:id/revision
 * Acheteur demande une revision → retour en_cours
 */
export declare const demanderRevision: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/marketplace/orders/:id/cancel
 * Annuler la commande (regles strictes)
 */
export declare const annulerCommande: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/marketplace/orders/:id/dispute
 * Ouvrir un litige
 */
export declare const ouvrirLitige: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=orderActions.d.ts.map