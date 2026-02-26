/**
 * Calcule le temps de reponse moyen d'un vendeur (en minutes)
 * Base sur les 30 dernieres conversations : temps entre un message entrant
 * et la premiere reponse du vendeur
 */
export declare const computeAvgResponseTime: (userId: any) => Promise<number | null>;
/**
 * Formate le temps de reponse en string lisible
 */
export declare const formatResponseTime: (minutes: number | null | undefined) => string;
export declare const formatDateMembre: (date: any) => string;
/**
 * Un service est "nouveau" s'il a ete cree il y a moins de 30 jours
 */
export declare const isNouveau: (dateCreation: any) => boolean;
/**
 * Recalcule les stats d'un service (note, avis, commandes)
 * A appeler apres chaque review create/update/delete et commande terminee
 */
export declare const recomputeServiceStats: (serviceId: any) => Promise<void>;
/**
 * Transforme un document MarketplaceService en shape MarketplaceProduct
 * compatible avec le type mobile existant
 *
 * @param service - Document Mongoose populate avec .createur
 * @param reviews - Array de reviews (optionnel, pour la liste on envoie [])
 */
export declare const formatServicePourMobile: (service: any, reviews?: any[]) => Promise<{
    id: any;
    nom: any;
    description: any;
    descriptionLongue: any;
    categorie: any;
    prix: any;
    devise: any;
    image: any;
    gallery: any;
    createur: {
        id: any;
        nom: string;
        avatar: any;
        note: any;
        ventesRealisees: number;
        tempsReponse: string;
        tauxCompletion: number;
        membreDepuis: string;
    };
    tags: any;
    estNouveau: boolean;
    delaiLivraison: any;
    commandesRealisees: any;
    noteGlobale: any;
    nombreAvis: any;
    reviews: {
        id: any;
        auteur: string;
        avatar: any;
        note: any;
        commentaire: any;
        date: string;
    }[];
    options: any;
    faq: any;
}>;
//# sourceMappingURL=helpers.d.ts.map