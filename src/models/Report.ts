import mongoose, { Document, Schema, Model } from 'mongoose';

// Types
export type ReportTargetType = 'post' | 'commentaire' | 'utilisateur';
export type ReportReason = 'spam' | 'harcelement' | 'contenu_inapproprie' | 'fausse_info' | 'nudite' | 'violence' | 'haine' | 'autre';
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';
export type ReportAction = 'none' | 'hide_post' | 'delete_post' | 'warn_user' | 'suspend_user' | 'ban_user';

// Mapping raison -> priorite par defaut
export const REASON_PRIORITY_MAP: Record<ReportReason, ReportPriority> = {
  spam: 'low',
  autre: 'low',
  fausse_info: 'medium',
  contenu_inapproprie: 'medium',
  nudite: 'high',
  harcelement: 'high',
  violence: 'critical',
  haine: 'critical',
};

// Seuils d'auto-escalade (nombre de reports sur la meme cible)
export const AUTO_ESCALATION_THRESHOLDS: Record<ReportPriority, number> = {
  low: 5,
  medium: 3,
  high: 2,
  critical: 1, // Escalade immediate
};

// Interface pour le document Report
export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  targetType: ReportTargetType;
  targetId: mongoose.Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  escalatedAt?: Date;
  escalatedBy?: mongoose.Types.ObjectId;
  escalationReason?: string;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  action?: ReportAction;
  adminNote?: string;
  aggregateCount: number;
  dateCreation: Date;
  dateMiseAJour: Date;
}

// Interface pour les methodes statiques
interface IReportModel extends Model<IReport> {
  getTargetReportCount(targetType: ReportTargetType, targetId: mongoose.Types.ObjectId): Promise<number>;
}

const reportSchema = new Schema<IReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, 'Le signaleur est requis'],
      index: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'commentaire', 'utilisateur'],
      required: [true, 'Le type de cible est requis'],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "L'ID de la cible est requis"],
      index: true,
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'harcelement',
        'contenu_inapproprie',
        'fausse_info',
        'nudite',
        'violence',
        'haine',
        'autre',
      ],
      required: [true, 'La raison est requise'],
    },
    details: {
      type: String,
      maxlength: [500, 'Les details ne peuvent pas depasser 500 caracteres'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'action_taken', 'dismissed'],
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      index: true,
    },
    assignedAt: {
      type: Date,
    },
    escalatedAt: {
      type: Date,
    },
    escalatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    escalationReason: {
      type: String,
      maxlength: [500, "La raison d'escalade ne peut pas depasser 500 caracteres"],
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    moderatedAt: {
      type: Date,
    },
    action: {
      type: String,
      enum: ['none', 'hide_post', 'delete_post', 'warn_user', 'suspend_user', 'ban_user'],
    },
    adminNote: {
      type: String,
      maxlength: [1000, 'La note admin ne peut pas depasser 1000 caracteres'],
    },
    aggregateCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// Index compose pour dedoublonnage : un user ne peut signaler qu'une fois la meme cible
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

// Index pour les requetes admin
reportSchema.index({ status: 1, dateCreation: -1 });
reportSchema.index({ targetId: 1, status: 1 });

// Index pour le tri par priorite et date
reportSchema.index({ status: 1, priority: -1, dateCreation: -1 });

// Index pour les reports assignes
reportSchema.index({ assignedTo: 1, status: 1 });

// Index pour les reports escalades
reportSchema.index({ escalatedAt: 1, status: 1 });

// Middleware pre-save pour auto-calculer la priorite basee sur la raison
reportSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('reason')) {
    if (!this.priority || this.isNew) {
      this.priority = REASON_PRIORITY_MAP[this.reason] || 'medium';
    }
  }
  next();
});

// Methode statique pour obtenir le nombre de reports sur une cible
reportSchema.statics.getTargetReportCount = async function (
  targetType: ReportTargetType,
  targetId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({ targetType, targetId });
};

const Report = mongoose.model<IReport, IReportModel>('Report', reportSchema);

export default Report;
