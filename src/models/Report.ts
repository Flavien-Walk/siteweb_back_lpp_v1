import mongoose, { Document, Schema } from 'mongoose';

// Types pour les cibles de signalement
export type TargetType = 'post' | 'commentaire' | 'utilisateur';

// Raisons de signalement (alignées avec le mobile)
export type ReportReason =
  | 'spam'
  | 'harcelement'
  | 'contenu_inapproprie'
  | 'fausse_info'
  | 'nudite'
  | 'violence'
  | 'haine'
  | 'autre';

// Statuts de traitement
export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';

// Actions possibles par l'admin
export type ReportAction =
  | 'none'
  | 'hide_post'
  | 'delete_post'
  | 'warn_user'
  | 'suspend_user'
  | 'ban_user';

// Niveaux de priorité
export type ReportPriority = 'low' | 'medium' | 'high' | 'critical';

// Mapping raison -> priorité par défaut
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

// Seuils d'auto-escalade (nombre de reports sur la même cible)
export const AUTO_ESCALATION_THRESHOLDS: Record<ReportPriority, number> = {
  low: 5,
  medium: 3,
  high: 2,
  critical: 1, // Escalade immédiate
};

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  targetType: TargetType;
  targetId: mongoose.Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  // Priorité et assignation
  priority: ReportPriority;
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  // Escalade
  escalatedAt?: Date;
  escalatedBy?: mongoose.Types.ObjectId;
  escalationReason?: string;
  // Modération
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  action?: ReportAction;
  adminNote?: string;
  // Agrégats (nombre de signalements sur cette cible)
  aggregateCount?: number;
  // Timestamps
  dateCreation: Date;
  dateMiseAJour: Date;
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
      required: [true, 'L\'ID de la cible est requis'],
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
      maxlength: [500, 'Les détails ne peuvent pas dépasser 500 caractères'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'action_taken', 'dismissed'],
      default: 'pending',
      index: true,
    },
    // Priorité et assignation
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
    // Escalade
    escalatedAt: {
      type: Date,
    },
    escalatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    escalationReason: {
      type: String,
      maxlength: [500, 'La raison d\'escalade ne peut pas dépasser 500 caractères'],
    },
    // Modération
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
      maxlength: [1000, 'La note admin ne peut pas dépasser 1000 caractères'],
    },
    // Agrégats (mis à jour lors de la création d'un nouveau report sur la même cible)
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

// Index composé pour dédoublonnage : un user ne peut signaler qu'une fois la même cible
reportSchema.index(
  { reporter: 1, targetType: 1, targetId: 1 },
  { unique: true }
);

// Index pour les requêtes admin
reportSchema.index({ status: 1, dateCreation: -1 });
reportSchema.index({ targetId: 1, status: 1 });

// Index pour le tri par priorité et date
reportSchema.index({ status: 1, priority: -1, dateCreation: -1 });

// Index pour les reports assignés
reportSchema.index({ assignedTo: 1, status: 1 });

// Index pour les reports escaladés
reportSchema.index({ escalatedAt: 1, status: 1 });

// Middleware pre-save pour auto-calculer la priorité basée sur la raison
reportSchema.pre('save', function (next) {
  // Si c'est un nouveau document ou si la raison a changé
  if (this.isNew || this.isModified('reason')) {
    // Définir la priorité par défaut basée sur la raison
    if (!this.priority || this.isNew) {
      this.priority = REASON_PRIORITY_MAP[this.reason] || 'medium';
    }
  }
  next();
});

// Méthode statique pour obtenir le nombre de reports sur une cible
reportSchema.statics.getTargetReportCount = async function (
  targetType: TargetType,
  targetId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({ targetType, targetId });
};

// Méthode statique pour obtenir les reports agrégés par cible
reportSchema.statics.getAggregatedReports = async function () {
  return this.aggregate([
    { $match: { status: 'pending' } },
    {
      $group: {
        _id: { targetType: '$targetType', targetId: '$targetId' },
        count: { $sum: 1 },
        reasons: { $addToSet: '$reason' },
        maxPriority: { $max: '$priority' },
        firstReportDate: { $min: '$dateCreation' },
        lastReportDate: { $max: '$dateCreation' },
        reports: { $push: '$_id' },
      },
    },
    { $sort: { count: -1, 'maxPriority': -1 } },
  ]);
};

const Report = mongoose.model<IReport>('Report', reportSchema);

export default Report;
