import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketplaceReview extends Document {
  service: mongoose.Types.ObjectId;
  commande: mongoose.Types.ObjectId;
  auteur: mongoose.Types.ObjectId;
  note: number;
  commentaire: string;
  dateCreation: Date;
  dateMiseAJour: Date;
}

const marketplaceReviewSchema = new Schema<IMarketplaceReview>({
  service: { type: Schema.Types.ObjectId, ref: 'MarketplaceService', required: true },
  commande: { type: Schema.Types.ObjectId, ref: 'MarketplaceOrder', required: true, unique: true },
  auteur: { type: Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
  note: { type: Number, required: true, min: 1, max: 5 },
  commentaire: { type: String, required: true, minlength: 10, maxlength: 1000 },
}, { timestamps: { createdAt: 'dateCreation', updatedAt: 'dateMiseAJour' } });

marketplaceReviewSchema.index({ service: 1, dateCreation: -1 });

const MarketplaceReview = mongoose.model<IMarketplaceReview>('MarketplaceReview', marketplaceReviewSchema);
export default MarketplaceReview;
