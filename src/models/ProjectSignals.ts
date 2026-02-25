import mongoose, { Document, Schema } from 'mongoose';

// === TYPES ===

export interface IWindowStats {
  likes: number;
  comments: number;
  follows: number;
  shares: number;
  views: number;
  clicks: number;
  impressions: number;
  uniqueActors: number;
}

export interface ITrendingDebug {
  weightedEngagement: number;
  timeDecay: number;
  velocityMultiplier: number;
  qualityFactor: number;
  spamPenalty: number;
  rawScore: number;
}

// === INTERFACE ===

export interface IProjectSignals extends Document {
  _id: mongoose.Types.ObjectId;
  projet: mongoose.Types.ObjectId;

  // Compteurs par fenetre temporelle
  engagement_1h: IWindowStats;
  engagement_6h: IWindowStats;
  engagement_24h: IWindowStats;
  engagement_7d: IWindowStats;
  engagement_total: IWindowStats;

  // Score trending pre-calcule
  trendingScore: number;
  trendingRank: number;
  trendingDebug: ITrendingDebug;

  // Qualite du profil projet (0-1)
  qualityScore: number;

  // Anti-spam metrics
  sameActorRatio: number; // Ratio du top acteur / total events
  newAccountRatio: number; // Ratio events venant de comptes < 48h

  // Derniere mise a jour
  lastComputed: Date;
}

// === SOUS-SCHEMA ===

const windowStatsSchema = new Schema<IWindowStats>(
  {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    follows: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    uniqueActors: { type: Number, default: 0 },
  },
  { _id: false }
);

const trendingDebugSchema = new Schema<ITrendingDebug>(
  {
    weightedEngagement: { type: Number, default: 0 },
    timeDecay: { type: Number, default: 0 },
    velocityMultiplier: { type: Number, default: 1 },
    qualityFactor: { type: Number, default: 0.3 },
    spamPenalty: { type: Number, default: 0 },
    rawScore: { type: Number, default: 0 },
  },
  { _id: false }
);

const defaultWindowStats = (): IWindowStats => ({
  likes: 0,
  comments: 0,
  follows: 0,
  shares: 0,
  views: 0,
  clicks: 0,
  impressions: 0,
  uniqueActors: 0,
});

// === SCHEMA PRINCIPAL ===

const projectSignalsSchema = new Schema<IProjectSignals>(
  {
    projet: {
      type: Schema.Types.ObjectId,
      ref: 'Projet',
      required: true,
      unique: true,
      index: true,
    },

    engagement_1h: { type: windowStatsSchema, default: defaultWindowStats },
    engagement_6h: { type: windowStatsSchema, default: defaultWindowStats },
    engagement_24h: { type: windowStatsSchema, default: defaultWindowStats },
    engagement_7d: { type: windowStatsSchema, default: defaultWindowStats },
    engagement_total: { type: windowStatsSchema, default: defaultWindowStats },

    trendingScore: { type: Number, default: 0 },
    trendingRank: { type: Number, default: 0 },
    trendingDebug: { type: trendingDebugSchema, default: () => ({}) },

    qualityScore: { type: Number, default: 0.3, min: 0, max: 1 },

    sameActorRatio: { type: Number, default: 0, min: 0, max: 1 },
    newAccountRatio: { type: Number, default: 0, min: 0, max: 1 },

    lastComputed: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Index pour le classement trending
projectSignalsSchema.index({ trendingScore: -1 });
projectSignalsSchema.index({ trendingRank: 1 });

const ProjectSignals = mongoose.model<IProjectSignals>('ProjectSignals', projectSignalsSchema);

export default ProjectSignals;
