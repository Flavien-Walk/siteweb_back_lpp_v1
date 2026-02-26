import { Request, Response } from 'express';
/**
 * Enregistrer une vue sur un service (utilisateur optionnel)
 * POST /api/marketplace/events/view
 *
 * Debounce : une seule vue par utilisateur et service par heure
 * Si l'utilisateur n'est pas connecte, on enregistre sans debounce
 */
export declare const trackView: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=events.d.ts.map