import mongoose, { Document, Schema } from 'mongoose';

export type EventType = 'view' | 'contact' | 'order';

export interface IMarketplaceEvent extends Document {
  service: mongoose.Types.ObjectId;
  type: EventType;
  utilisateur: mongoose.Types.ObjectId | null;
  date: Date;
}

const marketplaceEventSchema = new Schema<IMarketplaceEvent>({
  service: { type: Schema.Types.ObjectId, ref: 'MarketplaceService', required: true, index: true },
  type: { type: String, enum: ['view', 'contact', 'order'], required: true, index: true },
  utilisateur: { type: Schema.Types.ObjectId, ref: 'Utilisateur', default: null },
  date: { type: Date, default: Date.now },
}, { timestamps: false });

marketplaceEventSchema.index({ date: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
marketplaceEventSchema.index({ service: 1, type: 1, date: -1 });
marketplaceEventSchema.index({ service: 1, utilisateur: 1, type: 1, date: -1 });

const MarketplaceEvent = mongoose.model<IMarketplaceEvent>('MarketplaceEvent', marketplaceEventSchema);
export default MarketplaceEvent;
