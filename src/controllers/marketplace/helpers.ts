import mongoose from 'mongoose';
import { Request, Response } from 'express';
import MarketplaceReview from '../../models/MarketplaceReview.js';
import MarketplaceOrder from '../../models/MarketplaceOrder.js';
import MarketplaceService from '../../models/MarketplaceService.js';
import { Conversation, Message } from '../../models/Message.js';

/**
 * Calcule le temps de reponse moyen d'un vendeur (en minutes)
 * Base sur les 30 dernieres conversations : temps entre un message entrant
 * et la premiere reponse du vendeur
 */
export const computeAvgResponseTime = async (userId: any): Promise<number | null> => {
  try {
    // Recuperer les 30 dernieres conversations du vendeur
    const conversations = await Conversation.find({ participants: userId })
      .sort({ dateMiseAJour: -1 })
      .limit(30)
      .select('_id');

    if (conversations.length === 0) return null;

    const convIds = conversations.map(c => c._id);

    // Recuperer les messages de ces conversations (derniers 500)
    const messages = await Message.find({
      conversation: { $in: convIds },
      type: { $ne: 'systeme' },
    })
      .sort({ conversation: 1, dateCreation: 1 })
      .limit(500)
      .select('conversation expediteur dateCreation')
      .lean();

    // Grouper par conversation
    const parConversation: Record<string, any[]> = {};
    for (const msg of messages) {
      const convId = msg.conversation.toString();
      if (!parConversation[convId]) parConversation[convId] = [];
      parConversation[convId].push(msg);
    }

    // Pour chaque conversation, trouver les paires (message entrant -> reponse vendeur)
    const delais: number[] = [];
    const userIdStr = userId.toString();

    for (const convMsgs of Object.values(parConversation)) {
      for (let i = 0; i < convMsgs.length - 1; i++) {
        const msg = convMsgs[i];
        // Message entrant (pas du vendeur)
        if (msg.expediteur.toString() === userIdStr) continue;

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

    if (delais.length < 3) return null;

    // Mediane (plus robuste que la moyenne)
    delais.sort((a, b) => a - b);
    const mid = Math.floor(delais.length / 2);
    return delais.length % 2 === 0
      ? (delais[mid - 1] + delais[mid]) / 2
      : delais[mid];
  } catch (error) {
    console.error('[marketplace:helpers] Erreur computeAvgResponseTime:', error);
    return null;
  }
};

/**
 * Formate le temps de reponse en string lisible
 */
export const formatResponseTime = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return 'N/A';
  if (minutes < 60) return '< 1h';
  if (minutes < 120) return '< 2h';
  if (minutes < 360) return '< 6h';
  if (minutes < 1440) return '< 24h';
  return '> 24h';
};

/**
 * Formate une date en "Mois Annee" (ex: "Mars 2025")
 */
const MOIS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

export const formatDateMembre = (date: any): string => {
  if (!date) return 'Recemment';
  const d = new Date(date);
  return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Un service est "nouveau" s'il a ete cree il y a moins de 30 jours
 */
export const isNouveau = (dateCreation: any): boolean => {
  if (!dateCreation) return false;
  const trentJours = 30 * 24 * 3600 * 1000;
  return (Date.now() - new Date(dateCreation).getTime()) < trentJours;
};

/**
 * Recalcule les stats d'un service (note, avis, commandes)
 * A appeler apres chaque review create/update/delete et commande terminee
 */
export const recomputeServiceStats = async (serviceId: any): Promise<void> => {
  try {
    const objectId = new mongoose.Types.ObjectId(serviceId);

    // Aggregation reviews
    const reviewStats = await MarketplaceReview.aggregate([
      { $match: { service: objectId } },
      { $group: {
        _id: null,
        noteGlobale: { $avg: '$note' },
        nombreAvis: { $sum: 1 },
      } },
    ]);

    // Compter les commandes terminees
    const commandesRealisees = await MarketplaceOrder.countDocuments({
      service: objectId,
      statut: 'termine',
    });

    await MarketplaceService.findByIdAndUpdate(serviceId, {
      'statsCache.noteGlobale': reviewStats[0]
        ? Math.round(reviewStats[0].noteGlobale * 10) / 10
        : 0,
      'statsCache.nombreAvis': reviewStats[0]?.nombreAvis || 0,
      'statsCache.commandesRealisees': commandesRealisees,
    });
  } catch (error) {
    console.error('[marketplace:helpers] Erreur recomputeServiceStats:', error);
  }
};

/**
 * Transforme un document MarketplaceService en shape MarketplaceProduct
 * compatible avec le type mobile existant
 *
 * @param service - Document Mongoose populate avec .createur
 * @param reviews - Array de reviews (optionnel, pour la liste on envoie [])
 */
export const formatServicePourMobile = async (service: any, reviews: any[] = []) => {
  const createur = service.createur;
  if (!createur) {
    throw new Error('Service sans createur populate');
  }

  // Stats vendeur
  const commandesVendeur = await MarketplaceOrder.countDocuments({
    vendeur: createur._id,
    statut: 'termine',
  });
  const toutesCommandes = await MarketplaceOrder.countDocuments({
    vendeur: createur._id,
    statut: { $in: ['paye', 'en_cours', 'livre', 'termine'] },
  });
  const tauxCompletion = toutesCommandes > 0
    ? Math.round((commandesVendeur / toutesCommandes) * 100)
    : 100;

  // Temps de reponse
  const avgMinutes = await computeAvgResponseTime(createur._id);
  const tempsReponse = formatResponseTime(avgMinutes);

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
      membreDepuis: formatDateMembre(createur.dateCreation),
    },
    tags: service.tags || [],
    estNouveau: isNouveau(service.dateCreation),
    delaiLivraison: service.delaiLivraison,
    commandesRealisees: service.statsCache?.commandesRealisees || 0,
    noteGlobale: service.statsCache?.noteGlobale || 0,
    nombreAvis: service.statsCache?.nombreAvis || 0,
    reviews: formattedReviews,
    options: (service.options || []).map((opt: any, i: number) => ({
      id: opt._id?.toString() || `opt-${service._id}-${i}`,
      label: opt.label,
      description: opt.description || '',
      prix: opt.prix,
      devise: opt.devise || 'EUR',
    })),
    faq: service.faq || [],
  };
};
