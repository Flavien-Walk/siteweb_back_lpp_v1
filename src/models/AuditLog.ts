import mongoose, { Document, Schema, Model } from 'mongoose';

// Types
export type AuditAction =
  | 'user:warn'
  | 'user:warn_remove'
  | 'user:suspend'
  | 'user:unsuspend'
  | 'user:ban'
  | 'user:unban'
  | 'user:role_change'
  | 'user:permission_add'
  | 'user:permission_remove'
  | 'content:hide'
  | 'content:unhide'
  | 'content:delete'
  | 'content:restore'
  | 'report:process'
  | 'report:escalate'
  | 'report:dismiss'
  | 'report:assign'
  | 'config:update'
  | 'staff:login'
  | 'staff:logout';

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

// Interface pour le snapshot
export interface IAuditSnapshot {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// Interface pour le document AuditLog
export interface IAuditLog extends Document {
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
  dateCreation: Date;
}

// Interface pour les parametres de creation
export interface IAuditLogParams {
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

// Interface pour les methodes statiques
interface IAuditLogModel extends Model<IAuditLog> {
  logAction(params: IAuditLogParams): Promise<IAuditLog>;
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
        'user:warn',
        'user:warn_remove',
        'user:suspend',
        'user:unsuspend',
        'user:ban',
        'user:unban',
        'user:role_change',
        'user:permission_add',
        'user:permission_remove',
        'content:hide',
        'content:unhide',
        'content:delete',
        'content:restore',
        'report:process',
        'report:escalate',
        'report:dismiss',
        'report:assign',
        'config:update',
        'staff:login',
        'staff:logout',
      ],
      required: [true, "L'action est requise"],
      index: true,
    },
    targetType: {
      type: String,
      enum: [
        'utilisateur',
        'publication',
        'commentaire',
        'message',
        'story',
        'live',
        'report',
        'config',
        'system',
      ],
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
      maxlength: [1000, 'La raison ne peut pas depasser 1000 caracteres'],
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
      updatedAt: false, // Pas de mise a jour, les logs sont immuables
    },
  }
);

// Index compose pour les requetes courantes
auditLogSchema.index({ dateCreation: -1 }); // Tri par date
auditLogSchema.index({ actor: 1, dateCreation: -1 }); // Actions d'un moderateur
auditLogSchema.index({ targetType: 1, targetId: 1, dateCreation: -1 }); // Historique d'une cible
auditLogSchema.index({ action: 1, dateCreation: -1 }); // Filtrer par type d'action

/**
 * Methode statique pour creer un log facilement
 */
auditLogSchema.statics.logAction = async function (
  params: IAuditLogParams
): Promise<IAuditLog> {
  const log = new this(params);
  await log.save();
  return log;
};

const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', auditLogSchema);

export default AuditLog;
