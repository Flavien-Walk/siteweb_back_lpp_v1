import mongoose, { Schema, Document } from 'mongoose';

export interface IBlockedIP extends Document {
  ip: string;
  raison: string;
  bloquePar: mongoose.Types.ObjectId;
  dateCreation: Date;
  expireAt?: Date;
  actif: boolean;
}

const BlockedIPSchema = new Schema<IBlockedIP>(
  {
    ip: { type: String, required: true, unique: true, index: true },
    raison: { type: String, required: true },
    bloquePar: { type: Schema.Types.Mixed, required: true },
    dateCreation: { type: Date, default: Date.now },
    expireAt: { type: Date, default: null },
    actif: { type: Boolean, default: true, index: true },
  },
  { timestamps: false, collection: 'blocked_ips' }
);

// TTL optionnel pour les blocages temporaires
BlockedIPSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expireAt: { $exists: true, $ne: null } } });

export default mongoose.model<IBlockedIP>('BlockedIP', BlockedIPSchema);
