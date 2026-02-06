import mongoose, { Document, Schema } from 'mongoose';

export type TypeNotification =
  | 'projet-update'
  | 'annonce'
  | 'live-rappel'
  | 'interaction'
  | 'demande_ami'
  | 'ami_accepte'
  | 'nouveau_commentaire'
  | 'nouveau_like'
  | 'like_commentaire'
  | 'sanction_ban'
  | 'sanction_suspend'
  | 'sanction_warn'
  | 'sanction_unban'
  | 'sanction_unsuspend'
  | 'sanction_unwarn'
  | 'moderation'
  | 'project_follow';

export interface INotificationData {
  userId?: string;
  userNom?: string;
  userPrenom?: string;
  userAvatar?: string;
  projetId?: string;
  projetNom?: string;
  publicationId?: string;
  commentaireId?: string;
  // Champs pour les sanctions
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
  // EventId pour idempotency des sanctions (anti-doublon)
  eventId?: string;
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

const notificationSchema = new Schema<INotification>(
  {
    destinataire: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    type: {
      type: String,
      enum: ['projet-update', 'annonce', 'live-rappel', 'interaction', 'demande_ami', 'ami_accepte', 'nouveau_commentaire', 'nouveau_like', 'like_commentaire', 'sanction_ban', 'sanction_suspend', 'sanction_warn', 'sanction_unban', 'sanction_unsuspend', 'sanction_unwarn', 'moderation', 'project_follow'],
      required: true,
    },
    titre: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    lien: {
      type: String,
    },
    data: {
      type: {
        userId: String,
        userNom: String,
        userPrenom: String,
        userAvatar: String,
        projetId: String,
        projetNom: String,
        publicationId: String,
        commentaireId: String,
        // Champs pour les sanctions
        sanctionType: { type: String, enum: ['ban', 'suspend', 'warn', 'unban', 'unsuspend', 'unwarn'] },
        reason: String,
        suspendedUntil: String,
        postId: String,
        postSnapshot: {
          contenu: String,
          mediaUrl: String,
        },
        actorId: String,
        actorRole: String,
        // EventId pour idempotency des sanctions (anti-doublon)
        eventId: String,
      },
      default: null,
    },
    lue: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

notificationSchema.index({ destinataire: 1, dateCreation: -1 });
notificationSchema.index({ destinataire: 1, lue: 1 });

// Index unique partiel pour éviter les doublons de notifications demande_ami/ami_accepte
// Un utilisateur ne peut recevoir qu'une seule notification de chaque type par expéditeur
notificationSchema.index(
  { destinataire: 1, type: 1, 'data.userId': 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: { $in: ['demande_ami', 'ami_accepte'] },
      'data.userId': { $exists: true, $ne: null },
    },
  }
);

// Index unique partiel pour éviter les doublons de notifications de sanctions
// Utilise eventId comme clé unique - si même eventId, c'est un doublon
notificationSchema.index(
  { 'data.eventId': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      type: { $in: ['sanction_ban', 'sanction_suspend', 'sanction_warn', 'sanction_unban', 'sanction_unsuspend', 'sanction_unwarn'] },
      'data.eventId': { $exists: true, $ne: null },
    },
  }
);

// Index unique partiel pour éviter les doublons de notifications project_follow
// Un membre de projet ne reçoit qu'une seule notification par follower par projet
notificationSchema.index(
  { destinataire: 1, type: 1, 'data.projetId': 1, 'data.userId': 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: 'project_follow',
      'data.projetId': { $exists: true, $ne: null },
      'data.userId': { $exists: true, $ne: null },
    },
  }
);

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
