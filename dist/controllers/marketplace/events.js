"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackView = void 0;
const MarketplaceEvent_js_1 = __importDefault(require("../../models/MarketplaceEvent.js"));
const MarketplaceService_js_1 = __importDefault(require("../../models/MarketplaceService.js"));
/**
 * Enregistrer une vue sur un service (utilisateur optionnel)
 * POST /api/marketplace/events/view
 *
 * Debounce : une seule vue par utilisateur et service par heure
 * Si l'utilisateur n'est pas connecte, on enregistre sans debounce
 */
const trackView = async (req, res) => {
    try {
        const { serviceId } = req.body;
        if (!serviceId) {
            return res.status(400).json({
                succes: false,
                message: 'Le champ serviceId est requis.',
            });
        }
        // Verifier que le service existe
        const serviceExists = await MarketplaceService_js_1.default.exists({ _id: serviceId });
        if (!serviceExists) {
            return res.status(404).json({
                succes: false,
                message: 'Service introuvable.',
            });
        }
        // Utilisateur optionnel (middleware chargerUtilisateurOptionnel)
        const utilisateurId = req.utilisateur?._id || null;
        // Debounce : verifier si une vue existe deja dans la derniere heure
        if (utilisateurId) {
            const uneHeureAvant = new Date(Date.now() - 60 * 60 * 1000);
            const vuRecente = await MarketplaceEvent_js_1.default.findOne({
                service: serviceId,
                utilisateur: utilisateurId,
                type: 'view',
                date: { $gte: uneHeureAvant },
            });
            if (vuRecente) {
                // Vue deja enregistree recemment, pas de doublon
                return res.status(200).json({
                    succes: true,
                    message: 'Vue deja comptabilisee.',
                });
            }
        }
        // Creer l'evenement de vue
        await MarketplaceEvent_js_1.default.create({
            service: serviceId,
            type: 'view',
            utilisateur: utilisateurId,
        });
        // Incrementer le compteur de vues dans le cache du service
        await MarketplaceService_js_1.default.findByIdAndUpdate(serviceId, {
            $inc: { 'statsCache.vues': 1 },
        });
        return res.status(200).json({
            succes: true,
        });
    }
    catch (error) {
        console.error('[marketplace:events] Erreur trackView:', error);
        return res.status(500).json({
            succes: false,
            message: 'Erreur serveur lors de l\'enregistrement de la vue.',
        });
    }
};
exports.trackView = trackView;
//# sourceMappingURL=events.js.map