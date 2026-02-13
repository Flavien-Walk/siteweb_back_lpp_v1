import mongoose, { Schema, Document } from 'mongoose';

export type SecurityEventType =
  | 'brute_force'          // Tentatives de login echouees
  | 'rate_limit_hit'       // Rate limiter declenche (429)
  | 'unauthorized_access'  // Acces sans token ou token invalide (401)
  | 'forbidden_access'     // Permission insuffisante (403)
  | 'injection_attempt'    // Payload suspect (NoSQL, XSS, path traversal)
  | 'suspicious_signup'    // Inscription suspecte (pattern bot)
  | 'token_forgery'        // JWT invalide / algo none / signature invalide
  | 'cors_violation'       // Origin non autorisee
  | 'anomaly';             // Comportement anormal detecte

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ISecurityEvent extends Document {
  type: SecurityEventType;
  severity: SeverityLevel;
  ip: string;
  userAgent: string;
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
        'brute_force',
        'rate_limit_hit',
        'unauthorized_access',
        'forbidden_access',
        'injection_attempt',
        'suspicious_signup',
        'token_forgery',
        'cors_violation',
        'anomaly',
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
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, default: 0 },
    details: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    userId: { type: String, default: null },
    blocked: { type: Boolean, default: false },
    dateCreation: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: 'securityevents',
  }
);

// TTL: auto-suppression apres 90 jours
SecurityEventSchema.index({ dateCreation: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Index compose pour les requetes frequentes du dashboard
SecurityEventSchema.index({ type: 1, dateCreation: -1 });
SecurityEventSchema.index({ ip: 1, dateCreation: -1 });
SecurityEventSchema.index({ severity: 1, dateCreation: -1 });

export default mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema);
