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
  | 'suspend_user';

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  targetType: TargetType;
  targetId: mongoose.Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  // Modération
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  action?: ReportAction;
  adminNote?: string;
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
      enum: ['none', 'hide_post', 'delete_post', 'warn_user', 'suspend_user'],
    },
    adminNote: {
      type: String,
      maxlength: [1000, 'La note admin ne peut pas dépasser 1000 caractères'],
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

const Report = mongoose.model<IReport>('Report', reportSchema);

export default Report;
