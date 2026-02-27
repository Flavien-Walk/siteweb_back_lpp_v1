import mongoose, { Document } from 'mongoose';
export type OrderStatut = 'en_attente' | 'acceptee' | 'refusee' | 'en_cours' | 'livre' | 'termine' | 'annule' | 'litige';
export interface IHistorique {
    de: string;
    vers: string;
    date: Date;
    par: mongoose.Types.ObjectId;
    commentaire?: string;
}
export interface IDeliverable {
    type: 'message' | 'file' | 'link';
    content: string;
    file?: {
        url: string;
        name: string;
        size: number;
        mimeType: string;
    };
    createdAt: Date;
    createdBy: mongoose.Types.ObjectId;
}
export interface IProgressUpdate {
    title: string;
    message: string;
    percent: number;
    createdAt: Date;
    createdBy: mongoose.Types.ObjectId;
}
export interface IAttachment {
    url: string;
    name: string;
    size: number;
    mimeType: string;
}
export interface IBuyerBrief {
    message: string;
    attachments: IAttachment[];
    submittedAt: Date;
}
export interface IMarketplaceOrder extends Document {
    service: mongoose.Types.ObjectId;
    acheteur: mongoose.Types.ObjectId;
    vendeur: mongoose.Types.ObjectId;
    serviceSnapshot: {
        nom: string;
        prix: number | null;
        devise: string;
        image?: string;
    };
    optionsSelectionnees: Array<{
        label: string;
        prix: number;
        devise: string;
    }>;
    montantTotal: number;
    devise: string;
    statut: OrderStatut;
    historique: IHistorique[];
    buyerBrief: IBuyerBrief;
    deliverables: IDeliverable[];
    progressUpdates: IProgressUpdate[];
    aReview: boolean;
    conversationId?: mongoose.Types.ObjectId;
    dateCreation: Date;
    dateMiseAJour: Date;
}
export declare const TRANSITIONS_AUTORISEES: Record<OrderStatut, OrderStatut[]>;
/**
 * Qui peut effectuer chaque transition (cle = "de->vers")
 * vendeur / acheteur / les_deux
 */
export declare const QUI_PEUT_TRANSITIONNER: Record<string, string>;
declare const MarketplaceOrder: mongoose.Model<IMarketplaceOrder, {}, {}, {}, mongoose.Document<unknown, {}, IMarketplaceOrder, {}, {}> & IMarketplaceOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default MarketplaceOrder;
//# sourceMappingURL=MarketplaceOrder.d.ts.map