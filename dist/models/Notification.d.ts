import mongoose, { Document } from 'mongoose';
export type TypeNotification = 'projet_cloture' | 'annonce' | 'live-rappel' | 'interaction' | 'demande_ami' | 'ami_accepte' | 'nouveau_commentaire' | 'nouveau_like' | 'like_commentaire' | 'mention' | 'sanction_ban' | 'sanction_suspend' | 'sanction_warn' | 'sanction_unban' | 'sanction_unsuspend' | 'sanction_unwarn' | 'moderation' | 'project_follow' | 'broadcast' | 'support_reponse' | 'commande_nouvelle' | 'commande_acceptee' | 'commande_refusee' | 'commande_en_cours' | 'commande_livree' | 'commande_terminee' | 'commande_annulee' | 'commande_litige' | 'commande_revision' | 'commande_deadline_extended' | 'commande_en_retard';
export interface INotificationData {
    userId?: string;
    userNom?: string;
    userPrenom?: string;
    userAvatar?: string;
    projetId?: string;
    projetNom?: string;
    publicationId?: string;
    commentaireId?: string;
    sanctionType?: 'ban' | 'suspend' | 'warn' | 'unban' | 'unsuspend' | 'unwarn';
    reason?: string;
    suspendedUntil?: string;
    postId?: string;
    postSnapshot?: {
        contenu?: string;
        mediaUrl?: string;
    };
    actorId?: string;
    actorRole?: string;
    eventId?: string;
    broadcastBadge?: 'actu' | 'maintenance' | 'mise_a_jour' | 'evenement' | 'important';
    broadcastId?: string;
    ticketId?: string;
    ticketSubject?: string;
    commandeId?: string;
    serviceNom?: string;
}
export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    destinataire: mongoose.Types.ObjectId;
    type: TypeNotification;
    titre: string;
    message: string;
    lien?: string;
    data?: INotificationData;
    lue: boolean;
    dateCreation: Date;
}
declare const Notification: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Notification;
//# sourceMappingURL=Notification.d.ts.map