"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMediationMessage = exports.getMediationMessages = exports.resoudreLitige = exports.listerLitiges = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const MarketplaceOrder_js_1 = __importStar(require("../../models/MarketplaceOrder.js"));
const Notification_js_1 = __importDefault(require("../../models/Notification.js"));
const emitters_js_1 = require("../../socket/emitters.js");
const auditLogger_js_1 = require("../../utils/auditLogger.js");
const gestionErreurs_js_1 = require("../../middlewares/gestionErreurs.js");
const schemaMediationMessage = zod_1.z.object({
    canal: zod_1.z.enum(['acheteur', 'vendeur'], {
        errorMap: () => ({ message: "Le canal doit etre 'acheteur' ou 'vendeur'" }),
    }),
    contenu: zod_1.z.string().min(1, 'Le message ne peut pas etre vide').max(2000),
});
const schemaResoudreLitige = zod_1.z.object({
    resolution: zod_1.z.string().min(10, 'La resolution doit faire au moins 10 caracteres').max(2000),
    action: zod_1.z.enum(['reprendre', 'annuler'], {
        errorMap: () => ({ message: "L'action doit etre 'reprendre' ou 'annuler'" }),
    }),
});
/**
 * GET /api/admin/marketplace/litiges
 * Liste paginee des commandes en litige
 */
const listerLitiges = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const filter = {};
        const includeResolved = req.query.includeResolved === 'true';
        if (includeResolved) {
            filter['historique.vers'] = 'litige';
        }
        else {
            filter.statut = 'litige';
        }
        const acheteurId = req.query.acheteurId;
        if (acheteurId && mongoose_1.default.Types.ObjectId.isValid(acheteurId)) {
            filter.acheteur = new mongoose_1.default.Types.ObjectId(acheteurId);
        }
        const vendeurId = req.query.vendeurId;
        if (vendeurId && mongoose_1.default.Types.ObjectId.isValid(vendeurId)) {
            filter.vendeur = new mongoose_1.default.Types.ObjectId(vendeurId);
        }
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;
        if (dateFrom || dateTo) {
            const dateFilter = {};
            if (dateFrom)
                dateFilter.$gte = dateFrom;
            if (dateTo)
                dateFilter.$lte = dateTo;
            filter.dateCreation = dateFilter;
        }
        const [commandes, total] = await Promise.all([
            MarketplaceOrder_js_1.default.find(filter)
                .populate('acheteur', '_id prenom nom avatar email')
                .populate('vendeur', '_id prenom nom avatar email')
                .populate('service', '_id nom image categorie')
                .sort({ dateMiseAJour: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            MarketplaceOrder_js_1.default.countDocuments(filter),
        ]);
        const litiges = commandes.map((c) => {
            const litigeEvent = [...(c.historique || [])].reverse().find((h) => h.vers === 'litige');
            return {
                ...c,
                litigeInfo: litigeEvent
                    ? { raison: litigeEvent.commentaire, ouvertPar: litigeEvent.par, dateOuverture: litigeEvent.date }
                    : null,
            };
        });
        res.status(200).json({
            succes: true,
            data: {
                litiges,
                pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listerLitiges = listerLitiges;
/**
 * POST /api/admin/marketplace/litiges/:id/resoudre
 * Resoudre un litige : reprendre le travail ou annuler la commande
 */
const resoudreLitige = async (req, res, next) => {
    try {
        const { id } = req.params;
        const moderator = req.utilisateur;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new gestionErreurs_js_1.ErreurAPI('ID commande invalide', 400);
        }
        const donnees = schemaResoudreLitige.parse(req.body);
        const commande = await MarketplaceOrder_js_1.default.findById(id);
        if (!commande) {
            throw new gestionErreurs_js_1.ErreurAPI('Commande introuvable', 404);
        }
        if (commande.statut !== 'litige') {
            throw new gestionErreurs_js_1.ErreurAPI("Cette commande n'est pas en litige", 400);
        }
        const nouveauStatut = donnees.action === 'reprendre' ? 'en_cours' : 'annule';
        const transitions = MarketplaceOrder_js_1.TRANSITIONS_AUTORISEES[commande.statut];
        if (!transitions || !transitions.includes(nouveauStatut)) {
            throw new gestionErreurs_js_1.ErreurAPI(`Transition litige → ${nouveauStatut} non autorisee`, 400);
        }
        const ancienStatut = commande.statut;
        commande.statut = nouveauStatut;
        commande.historique.push({
            de: ancienStatut,
            vers: nouveauStatut,
            date: new Date(),
            par: moderator._id,
            commentaire: `[ADMIN] Resolution litige: ${donnees.resolution}`,
        });
        await commande.save();
        // Audit log
        await auditLogger_js_1.auditLogger.log(req, {
            action: 'marketplace:resolve_dispute',
            targetType: 'commande',
            targetId: commande._id,
            reason: donnees.resolution,
            metadata: {
                action: donnees.action,
                ancienStatut,
                nouveauStatut,
                acheteurId: commande.acheteur.toString(),
                vendeurId: commande.vendeur.toString(),
                montantTotal: commande.montantTotal,
            },
            snapshot: {
                before: { statut: ancienStatut },
                after: { statut: nouveauStatut },
            },
        });
        // Notifier les deux parties
        const serviceNom = commande.serviceSnapshot?.nom || 'Service';
        const messageResolution = donnees.action === 'reprendre'
            ? `Le litige sur "${serviceNom}" a ete resolu. La commande reprend.`
            : `Le litige sur "${serviceNom}" a ete resolu. La commande a ete annulee.`;
        await Promise.all([
            notifierResolutionLitige(commande._id.toString(), serviceNom, messageResolution, commande.acheteur.toString()),
            notifierResolutionLitige(commande._id.toString(), serviceNom, messageResolution, commande.vendeur.toString()),
        ]);
        res.status(200).json({
            succes: true,
            message: `Litige resolu: commande ${donnees.action === 'reprendre' ? 'reprise' : 'annulee'}.`,
            data: { commande },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resoudreLitige = resoudreLitige;
/**
 * GET /api/admin/marketplace/litiges/:id/mediation
 * Recupere tous les messages de mediation (les deux canaux) pour le moderateur
 */
const getMediationMessages = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new gestionErreurs_js_1.ErreurAPI('ID commande invalide', 400);
        }
        const commande = await MarketplaceOrder_js_1.default.findById(id)
            .populate('mediationMessages.auteur', '_id prenom nom avatar role')
            .populate('acheteur', '_id prenom nom avatar email')
            .populate('vendeur', '_id prenom nom avatar email')
            .select('mediationMessages acheteur vendeur statut litigeInfo serviceSnapshot montantTotal historique')
            .lean();
        if (!commande) {
            throw new gestionErreurs_js_1.ErreurAPI('Commande introuvable', 404);
        }
        const messages = commande.mediationMessages || [];
        const messagesAcheteur = messages
            .filter((m) => m.canal === 'acheteur')
            .sort((a, b) => new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime());
        const messagesVendeur = messages
            .filter((m) => m.canal === 'vendeur')
            .sort((a, b) => new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime());
        res.status(200).json({
            succes: true,
            data: {
                acheteur: commande.acheteur,
                vendeur: commande.vendeur,
                messagesAcheteur,
                messagesVendeur,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMediationMessages = getMediationMessages;
/**
 * POST /api/admin/marketplace/litiges/:id/mediation
 * Envoyer un message de mediation en tant que moderateur (sur un canal specifique)
 */
const sendMediationMessage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const moderator = req.utilisateur;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            throw new gestionErreurs_js_1.ErreurAPI('ID commande invalide', 400);
        }
        const donnees = schemaMediationMessage.parse(req.body);
        const commande = await MarketplaceOrder_js_1.default.findById(id);
        if (!commande) {
            throw new gestionErreurs_js_1.ErreurAPI('Commande introuvable', 404);
        }
        const message = {
            canal: donnees.canal,
            auteur: moderator._id,
            auteurRole: 'moderateur',
            contenu: donnees.contenu.trim(),
            dateCreation: new Date(),
            lu: false,
        };
        commande.mediationMessages.push(message);
        await commande.save();
        // Recuperer le message cree avec l'auteur populated
        const updatedCommande = await MarketplaceOrder_js_1.default.findById(id)
            .populate('mediationMessages.auteur', '_id prenom nom avatar role')
            .select('mediationMessages')
            .lean();
        const createdMessage = updatedCommande?.mediationMessages?.[(updatedCommande.mediationMessages?.length || 1) - 1];
        // Audit log
        await auditLogger_js_1.auditLogger.log(req, {
            action: 'marketplace:mediation_message',
            targetType: 'commande',
            targetId: commande._id,
            reason: `Message mediation (canal: ${donnees.canal})`,
            metadata: {
                canal: donnees.canal,
                messageLength: donnees.contenu.length,
            },
        });
        // Notifier la partie ciblee
        const destinataireId = donnees.canal === 'acheteur'
            ? commande.acheteur.toString()
            : commande.vendeur.toString();
        const serviceNom = commande.serviceSnapshot?.nom || 'Service';
        try {
            const notif = await Notification_js_1.default.create({
                destinataire: destinataireId,
                type: 'interaction',
                titre: 'Nouveau message de mediation',
                message: `Un moderateur vous a envoye un message concernant le litige sur "${serviceNom}".`,
                data: {
                    commandeId: commande._id.toString(),
                    serviceNom,
                    type: 'mediation',
                },
            });
            (0, emitters_js_1.emitNewNotification)(destinataireId, {
                _id: notif._id.toString(),
                type: notif.type,
                titre: notif.titre,
                message: notif.message,
                lu: false,
                dateCreation: notif.dateCreation.toISOString(),
            });
        }
        catch (notifError) {
            console.error('[adminMarketplace] Erreur notif mediation:', notifError);
        }
        res.status(201).json({
            succes: true,
            message: 'Message de mediation envoye.',
            data: { message: createdMessage },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.sendMediationMessage = sendMediationMessage;
/**
 * Cree une notification de resolution de litige + push socket
 */
async function notifierResolutionLitige(commandeId, serviceNom, message, destinataireId) {
    try {
        const notif = await Notification_js_1.default.create({
            destinataire: destinataireId,
            type: 'interaction',
            titre: 'Litige resolu',
            message,
            data: { commandeId, serviceNom },
        });
        (0, emitters_js_1.emitNewNotification)(destinataireId, {
            _id: notif._id.toString(),
            type: notif.type,
            titre: notif.titre,
            message: notif.message,
            lu: false,
            dateCreation: notif.dateCreation.toISOString(),
        });
    }
    catch (err) {
        console.error('[adminMarketplace] Erreur notif resolution litige:', err);
    }
}
//# sourceMappingURL=litiges.js.map