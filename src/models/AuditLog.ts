import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Types d'actions pouvant être enregistrées dans l'audit log
 */
export type AuditAction =
  // Actions sur les utilisateurs
  | 'user:warn'
  | 'user:warn_remove'
  | 'user:suspend'
  | 'user:unsuspend'
  | 'user:ban'
  | 'user:unban'
  | 'user:role_change'
  | 'user:permission_add'
  | 'user:permission_remove'
  // Actions sur le contenu
  | 'content:hide'
  | 'content:unhide'
  | 'content:delete'
  | 'content:restore'
  // Actions sur les signalements
  | 'report:process'
  | 'report:escalate'
  | 'report:dismiss'
  | 'report:assign'
  // Actions sur la configuration
  | 'config:update'
  // Actions d'authentification staff
  | 'staff:login'
  | 'staff:logout';

/**
 * Types de cibles possibles pour une action
 */
export type AuditTargetType =
  | 'utilisateur'
  | 'publication'
  | 'commentaire'
  | 'message'
  | 'story'
  | 'live'
  | 'report'
  | 'config'
  | 'system';

/**
 * Interface pour les données avant/après modification
 */
export interface IAuditSnapshot {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/**
 * Interface pour le document AuditLog
 */
export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  // Qui a fait l'action
  actor: mongoose.Types.ObjectId;
  actorRole: string;
  actorIp?: string;
  // Quelle action
  action: AuditAction;
  // Sur quoi
  targetType: AuditTargetType;
  targetId: mongoose.Types.ObjectId;
  // Contexte
  reason?: string;
  metadata?: Record<string, unknown>;
  snapshot?: IAuditSnapshot;
  // Lien vers un signalement si applicable
  relatedReport?: mongoose.Types.ObjectId;
  // Timestamp
  dateCreation: Date;
}

/**
 * Interface pour les méthodes statiques du modèle
 */
export interface IAuditLogModel extends Model<IAuditLog> {
  logAction(params: LogActionParams): Promise<IAuditLog>;
}

/**
 * Paramètres pour créer un log
 */
export interface LogActionParams {
  actor: mongoose.Types.ObjectId;
  actorRole: string;
  actorIp?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: mongoose.Types.ObjectId;
  reason?: string;
  metadata?: Record<string, unknown>;
  snapshot?: IAuditSnapshot;
  relatedReport?: mongoose.Types.ObjectId;
}

const auditLogSchema = new Schema<IAuditLog>(
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
    actorIp: {
      type: String,
    },
    action: {
      type: String,
      enum: [
        'user:warn', 'user:warn_remove', 'user:suspend', 'user:unsuspend',
        'user:ban', 'user:unban', 'user:role_change',
        'user:permission_add', 'user:permission_remove',
        'content:hide', 'content:unhide', 'content:delete', 'content:restore',
        'report:process', 'report:escalate', 'report:dismiss', 'report:assign',
        'config:update',
        'staff:login', 'staff:logout',
      ],
      required: [true, "L'action est requise"],
      index: true,
    },
    targetType: {
      type: String,
      enum: ['utilisateur', 'publication', 'commentaire', 'message', 'story', 'live', 'report', 'config', 'system'],
      required: [true, 'Le type de cible est requis'],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "L'ID de la cible est requis"],
      index: true,
    },
    reason: {
      type: String,
      maxlength: [1000, 'La raison ne peut pas dépasser 1000 caractères'],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    snapshot: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
    },
    relatedReport: {
      type: Schema.Types.ObjectId,
      ref: 'Report',
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
auditLogSchema.index({ dateCreation: -1 }); // Tri par date
auditLogSchema.index({ actor: 1, dateCreation: -1 }); // Actions d'un modérateur
auditLogSchema.index({ targetType: 1, targetId: 1, dateCreation: -1 }); // Historique d'une cible
auditLogSchema.index({ action: 1, dateCreation: -1 }); // Filtrer par type d'action

// TTL optionnel - conserver les logs 2 ans (commenté par défaut)
// auditLogSchema.index({ dateCreation: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

/**
 * Méthode statique pour créer un log facilement
 */
auditLogSchema.statics.logAction = async function (
  params: LogActionParams
): Promise<IAuditLog> {
  const log = new this(params);
  await log.save();
  return log;
};

const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema);

export default AuditLog;
