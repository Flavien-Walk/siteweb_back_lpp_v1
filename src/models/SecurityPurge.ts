import mongoose, { Schema } from 'mongoose';

const SecurityPurgeSchema = new Schema(
  {
    purgePar: { type: Schema.Types.Mixed, required: true },
    note: { type: String, default: '' },
    stats: {
      events: { type: Number, default: 0 },
      blockedIPs: { type: Number, default: 0 },
      bannedDevices: { type: Number, default: 0 },
    },
    archivedEvents: [Schema.Types.Mixed],
    archivedBlockedIPs: [Schema.Types.Mixed],
    archivedBannedDevices: [Schema.Types.Mixed],
    dateCreation: { type: Date, default: Date.now },
  },
  { timestamps: false, collection: 'securitypurges', strict: false }
);

export default mongoose.model('SecurityPurge', SecurityPurgeSchema);
