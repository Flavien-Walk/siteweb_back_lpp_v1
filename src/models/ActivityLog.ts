import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Types d'activités utilisateur pouvant être enregistrées
 */
export type ActivityAction =
  | 'share'      // Partage de contenu
  | 'view'       // Vue de contenu
  | 'bookmark'   // Sauvegarde/favori
  | 'click';     // Clic sur un lien

/**
 * Types de cibles possibles pour une activité
 */
export type ActivityTargetType =
  | 'publication'
  | 'commentaire'
  | 'story'
  | 'live'
  | 'projet'
  | 'profil';

/**
 * Source de l'activité
 */
export type ActivitySource = 'web' | 'mobile' | 'api';

/**
 * Interface pour le document ActivityLog
 */
export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  // Qui a fait l'action
  actor: mongoose.Types.ObjectId;
  actorRole: string;
  // Quelle action
  action: ActivityAction;
  // Sur quoi
  targetType: ActivityTargetType;
  targetId: mongoose.Types.ObjectId;
  // Contexte optionnel
  metadata?: Record<string, unknown>;
  // Source de l'activité
  source: ActivitySource;
  // Timestamp
  dateCreation: Date;
}

/**
 * Interface pour les méthodes statiques
 */
export interface IActivityLogModel extends Model<IActivityLog> {
  logActivity(params: LogActivityParams): Promise<IActivityLog>;
}

/**
 * Paramètres pour créer un log d'activité
 */
export interface LogActivityParams {
  actor: mongoose.Types.ObjectId;
  actorRole: string;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  source?: ActivitySource;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, "L'acteur est requis"],
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['share', 'view', 'bookmark', 'click'],
      required: [true, "L'action est requise"],
      index: true,
    },
    targetType: {
      type: String,
      enum: ['publication', 'commentaire', 'story', 'live', 'projet', 'profil'],
      required: [true, 'Le type de cible est requis'],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "L'ID de la cible est requis"],
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'mobile',
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false, // Pas de mise à jour, les logs sont immuables
    },
  }
);

// Index composé pour les requêtes courantes
activityLogSchema.index({ dateCreation: -1 }); // Tri par date
activityLogSchema.index({ actor: 1, dateCreation: -1 }); // Activités d'un utilisateur
activityLogSchema.index({ targetType: 1, targetId: 1, dateCreation: -1 }); // Activités sur une cible
activityLogSchema.index({ action: 1, dateCreation: -1 }); // Filtrer par type d'action

// TTL - conserver les logs d'activité 90 jours
activityLogSchema.index({ dateCreation: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

/**
 * Méthode statique pour créer un log facilement
 */
activityLogSchema.statics.logActivity = async function (
  params: LogActivityParams
): Promise<IActivityLog> {
  const log = new this(params);
  await log.save();
  return log;
};

const ActivityLog = mongoose.model<IActivityLog, IActivityLogModel>('ActivityLog', activityLogSchema);

export default ActivityLog;
