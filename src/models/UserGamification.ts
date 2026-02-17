import mongoose, { Document, Schema } from 'mongoose';

// === TYPES ===

export type GamificationRole = 'visiteur' | 'entrepreneur';

export interface IQuestProgress {
  questId: string;
  progress: number;
  target: number;
  completedAt?: Date;
}

export interface IOnboardingState {
  version: number;
  currentStep: number;
  completedSteps: string[];
  dismissedAt?: Date;
}

export interface IDedupEntry {
  key: string; // ex: "like_post_6712abc" ou "follow_user_6712def"
  at: Date;
}

export interface IUserGamification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  roleContext: GamificationRole;
  level: number;
  xp: number;
  xpThisWeek: number;
  xpThisMonth: number;
  streakDays: number;
  lastActiveDate?: Date;
  onboarding: IOnboardingState;
  activeQuickQuests: IQuestProgress[];
  quickQuestCycle: number;
  activeQuests: IQuestProgress[];
  lastEventsDedup: IDedupEntry[];
  dateCreation: Date;
  dateMiseAJour: Date;
}

// === SCHEMA ===

const questProgressSchema = new Schema<IQuestProgress>(
  {
    questId: { type: String, required: true },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const onboardingSchema = new Schema<IOnboardingState>(
  {
    version: { type: Number, default: 1 },
    currentStep: { type: Number, default: 0 },
    completedSteps: [{ type: String }],
    dismissedAt: { type: Date, default: null },
  },
  { _id: false }
);

const dedupEntrySchema = new Schema<IDedupEntry>(
  {
    key: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false }
);

const userGamificationSchema = new Schema<IUserGamification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
      unique: true,
      index: true,
    },
    roleContext: {
      type: String,
      enum: ['visiteur', 'entrepreneur'],
      default: 'visiteur',
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    xpThisWeek: {
      type: Number,
      default: 0,
    },
    xpThisMonth: {
      type: Number,
      default: 0,
    },
    streakDays: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
    onboarding: {
      type: onboardingSchema as any,
      default: () => ({ version: 1, currentStep: 0, completedSteps: [], dismissedAt: null }),
    },
    activeQuickQuests: {
      type: [questProgressSchema],
      default: [],
    },
    quickQuestCycle: {
      type: Number,
      default: 1,
      min: 1,
    },
    activeQuests: {
      type: [questProgressSchema],
      default: [],
    },
    lastEventsDedup: {
      type: [dedupEntrySchema],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// Index pour les leaderboards futurs
userGamificationSchema.index({ xp: -1 });
userGamificationSchema.index({ level: -1, xp: -1 });

const UserGamification = mongoose.model<IUserGamification>('UserGamification', userGamificationSchema);

export default UserGamification;
