"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatServicePourMobile = exports.recomputeServiceStats = exports.isNouveau = exports.formatDateMembre = exports.formatResponseTime = exports.computeAvgResponseTime = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const MarketplaceReview_js_1 = __importDefault(require("../../models/MarketplaceReview.js"));
const MarketplaceOrder_js_1 = __importDefault(require("../../models/MarketplaceOrder.js"));
const MarketplaceService_js_1 = __importDefault(require("../../models/MarketplaceService.js"));
const Message_js_1 = require("../../models/Message.js");
/**
 * Calcule le temps de reponse moyen d'un vendeur (en minutes)
 * Base sur les 30 dernieres conversations : temps entre un message entrant
 * et la premiere reponse du vendeur
 */
const computeAvgResponseTime = async (userId) => {
    try {
        // Recuperer les 30 dernieres conversations du vendeur
        const conversations = await Message_js_1.Conversation.find({ participants: userId })
            .sort({ dateMiseAJour: -1 })
            .limit(30)
            .select('_id');
        if (conversations.length === 0)
            return null;
        const convIds = conversations.map(c => c._id);
        // Recuperer les messages de ces conversations (derniers 500)
        const messages = await Message_js_1.Message.find({
            conversation: { $in: convIds },
            type: { $ne: 'systeme' },
        })
            .sort({ conversation: 1, dateCreation: 1 })
            .limit(500)
            .select('conversation expediteur dateCreation')
            .lean();
        // Grouper par conversation
        const parConversation = {};
        for (const msg of messages) {
            const convId = msg.conversation.toString();
            if (!parConversation[convId])
                parConversation[convId] = [];
            parConversation[convId].push(msg);
        }
        // Pour chaque conversation, trouver les paires (message entrant -> reponse vendeur)
        const delais = [];
        const userIdStr = userId.toString();
        for (const convMsgs of Object.values(parConversation)) {
            for (let i = 0; i < convMsgs.length - 1; i++) {
                const msg = convMsgs[i];
                // Message entrant (pas du vendeur)
                if (msg.expediteur.toString() === userIdStr)
                    continue;
                // Chercher la prochaine reponse du vendeur
                for (let j = i + 1; j < convMsgs.length; j++) {
                    const reponse = convMsgs[j];
                    if (reponse.expediteur.toString() === userIdStr) {
                        const delta = (reponse.dateCreation - msg.dateCreation) / (1000 * 60);
                        // Ignorer les delais > 7 jours (probablement pas une vraie reponse)
                        if (delta <= 7 * 24 * 60) {
                            delais.push(delta);
                        }
                        break;
                    }
                }
            }
        }
        if (delais.length < 3)
            return null;
        // Mediane (plus robuste que la moyenne)
        delais.sort((a, b) => a - b);
        const mid = Math.floor(delais.length / 2);
        return delais.length % 2 === 0
            ? (delais[mid - 1] + delais[mid]) / 2
            : delais[mid];
    }
    catch (error) {
        console.error('[marketplace:helpers] Erreur computeAvgResponseTime:', error);
        return null;
    }
};
exports.computeAvgResponseTime = computeAvgResponseTime;
/**
 * Formate le temps de reponse en string lisible
 */
const formatResponseTime = (minutes) => {
    if (minutes === null || minutes === undefined)
        return 'N/A';
    if (minutes < 60)
        return '< 1h';
    if (minutes < 120)
        return '< 2h';
    if (minutes < 360)
        return '< 6h';
    if (minutes < 1440)
        return '< 24h';
    return '> 24h';
};
exports.formatResponseTime = formatResponseTime;
/**
 * Formate une date en "Mois Annee" (ex: "Mars 2025")
 */
const MOIS = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];
const formatDateMembre = (date) => {
    if (!date)
        return 'Recemment';
    const d = new Date(date);
    return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
};
exports.formatDateMembre = formatDateMembre;
/**
 * Un service est "nouveau" s'il a ete cree il y a moins de 30 jours
 */
const isNouveau = (dateCreation) => {
    if (!dateCreation)
        return false;
    const trentJours = 30 * 24 * 3600 * 1000;
    return (Date.now() - new Date(dateCreation).getTime()) < trentJours;
};
exports.isNouveau = isNouveau;
/**
 * Recalcule les stats d'un service (note, avis, commandes)
 * A appeler apres chaque review create/update/delete et commande terminee
 */
const recomputeServiceStats = async (serviceId) => {
    try {
        const objectId = new mongoose_1.default.Types.ObjectId(serviceId);
        // Aggregation reviews
        const reviewStats = await MarketplaceReview_js_1.default.aggregate([
            { $match: { service: objectId } },
            { $group: {
                    _id: null,
                    noteGlobale: { $avg: '$note' },
                    nombreAvis: { $sum: 1 },
                } },
        ]);
        // Compter les commandes terminees
        const commandesRealisees = await MarketplaceOrder_js_1.default.countDocuments({
            service: objectId,
            statut: 'termine',
        });
        await MarketplaceService_js_1.default.findByIdAndUpdate(serviceId, {
            'statsCache.noteGlobale': reviewStats[0]
                ? Math.round(reviewStats[0].noteGlobale * 10) / 10
                : 0,
            'statsCache.nombreAvis': reviewStats[0]?.nombreAvis || 0,
            'statsCache.commandesRealisees': commandesRealisees,
        });
    }
    catch (error) {
        console.error('[marketplace:helpers] Erreur recomputeServiceStats:', error);
    }
};
exports.recomputeServiceStats = recomputeServiceStats;
/**
 * Transforme un document MarketplaceService en shape MarketplaceProduct
 * compatible avec le type mobile existant
 *
 * @param service - Document Mongoose populate avec .createur
 * @param reviews - Array de reviews (optionnel, pour la liste on envoie [])
 */
const formatServicePourMobile = async (service, reviews = []) => {
    const createur = service.createur;
    if (!createur) {
        throw new Error('Service sans createur populate');
    }
    // Stats vendeur
    const commandesVendeur = await MarketplaceOrder_js_1.default.countDocuments({
        vendeur: createur._id,
        statut: 'termine',
    });
    const toutesCommandes = await MarketplaceOrder_js_1.default.countDocuments({
        vendeur: createur._id,
        statut: { $in: ['paye', 'en_cours', 'livre', 'termine'] },
    });
    const tauxCompletion = toutesCommandes > 0
        ? Math.round((commandesVendeur / toutesCommandes) * 100)
        : 100;
    // Temps de reponse
    const avgMinutes = await (0, exports.computeAvgResponseTime)(createur._id);
    const tempsReponse = (0, exports.formatResponseTime)(avgMinutes);
    // Formater les reviews
    const formattedReviews = reviews.slice(0, 10).map(r => ({
        id: r._id.toString(),
        auteur: r.auteur
            ? `${r.auteur.prenom || ''} ${(r.auteur.nom || '').charAt(0)}.`.trim()
            : 'Utilisateur',
        avatar: r.auteur?.avatar || undefined,
        note: r.note,
        commentaire: r.commentaire,
        date: r.dateCreation
            ? new Date(r.dateCreation).toISOString().split('T')[0]
            : '',
    }));
    return {
        id: service._id.toString(),
        nom: service.nom,
        description: service.description,
        descriptionLongue: service.descriptionLongue || service.description,
        categorie: service.categorie,
        prix: service.prix,
        devise: service.devise || 'EUR',
        image: service.image,
        gallery: service.gallery || [],
        createur: {
            id: createur._id.toString(),
            nom: `${createur.prenom || ''} ${createur.nom || ''}`.trim(),
            avatar: createur.avatar || undefined,
            note: service.statsCache?.noteGlobale || 0,
            ventesRealisees: commandesVendeur,
            tempsReponse,
            tauxCompletion,
            membreDepuis: (0, exports.formatDateMembre)(createur.dateCreation),
        },
        tags: service.tags || [],
        estNouveau: (0, exports.isNouveau)(service.dateCreation),
        delaiLivraison: service.delaiLivraison,
        commandesRealisees: service.statsCache?.commandesRealisees || 0,
        noteGlobale: service.statsCache?.noteGlobale || 0,
        nombreAvis: service.statsCache?.nombreAvis || 0,
        reviews: formattedReviews,
        options: (service.options || []).map((opt, i) => ({
            id: opt._id?.toString() || `opt-${service._id}-${i}`,
            label: opt.label,
            description: opt.description || '',
            prix: opt.prix,
            devise: opt.devise || 'EUR',
        })),
        faq: service.faq || [],
    };
};
exports.formatServicePourMobile = formatServicePourMobile;
//# sourceMappingURL=helpers.js.map