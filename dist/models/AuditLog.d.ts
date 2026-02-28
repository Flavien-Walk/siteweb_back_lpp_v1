import mongoose, { Document, Model } from 'mongoose';
/**
 * Types d'actions pouvant être enregistrées dans l'audit log
 */
export type AuditAction = 'user:warn' | 'user:warn_remove' | 'user:suspend' | 'user:unsuspend' | 'user:ban' | 'user:unban' | 'user:role_change' | 'user:permission_add' | 'user:permission_remove' | 'content:hide' | 'content:unhide' | 'content:delete' | 'content:restore' | 'content:edit' | 'user:surveillance_on' | 'user:surveillance_off' | 'report:process' | 'report:escalate' | 'report:dismiss' | 'report:assign' | 'config:update' | 'staff:login' | 'staff:logout' | 'marketplace:resolve_dispute';
/**
 * Types de cibles possibles pour une action
 */
export type AuditTargetType = 'utilisateur' | 'publication' | 'commentaire' | 'message' | 'story' | 'live' | 'projet' | 'report' | 'config' | 'system' | 'commande';
/**
 * Source de l'action (d'où provient l'action de modération)
 */
export type AuditSource = 'web' | 'mobile' | 'api' | 'system';
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
    eventId?: mongoose.Types.ObjectId;
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
    source: AuditSource;
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
    eventId?: mongoose.Types.ObjectId;
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
    source?: AuditSource;
}
declare const AuditLog: IAuditLogModel;
export default AuditLog;
//# sourceMappingURL=AuditLog.d.ts.map