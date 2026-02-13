import mongoose, { Schema, Document } from 'mongoose';

export type SecurityEventType =
  | 'brute_force'
  | 'rate_limit_hit'
  | 'unauthorized_access'
  | 'forbidden_access'
  | 'injection_attempt'
  | 'suspicious_signup'
  | 'token_forgery'
  | 'cors_violation'
  | 'ip_blocked'
  | 'anomaly';

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ISecurityEvent extends Document {
  type: SecurityEventType;
  severity: SeverityLevel;
  ip: string;
  userAgent: string;
  navigateur: string;
  os: string;
  appareil: string;
  method: string;
  path: string;
  statusCode: number;
  details: string;
  metadata: Record<string, unknown>;
  userId?: string;
  blocked: boolean;
  dateCreation: Date;
}

const SecurityEventSchema = new Schema<ISecurityEvent>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'brute_force', 'rate_limit_hit', 'unauthorized_access', 'forbidden_access',
        'injection_attempt', 'suspicious_signup', 'token_forgery', 'cors_violation',
        'ip_blocked', 'anomaly',
      ],
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      index: true,
    },
    ip: { type: String, required: true, index: true },
    userAgent: { type: String, default: '' },
    navigateur: { type: String, default: 'Inconnu' },
    os: { type: String, default: 'Inconnu' },
    appareil: { type: String, default: 'Inconnu' },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, default: 0 },
    details: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    userId: { type: String, default: null },
    blocked: { type: Boolean, default: false },
    dateCreation: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, collection: 'securityevents' }
);

SecurityEventSchema.index({ dateCreation: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
SecurityEventSchema.index({ type: 1, dateCreation: -1 });
SecurityEventSchema.index({ ip: 1, dateCreation: -1 });
SecurityEventSchema.index({ severity: 1, dateCreation: -1 });

export default mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema);
