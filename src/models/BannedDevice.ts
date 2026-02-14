import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * Modele BannedDevice - Bannissement par empreinte d'appareil
 *
 * Quand une IP est dynamique (change a chaque reconnexion), le ban IP
 * est inefficace. Ce modele permet de bannir un appareil via un hash
 * de son User-Agent + d'autres caracteristiques.
 *
 * Le fingerprint est un SHA-256 du User-Agent normalise.
 * Meme si l'IP change, le navigateur/OS/appareil restent identiques.
 */
export interface IBannedDevice extends Document {
  fingerprint: string; // SHA-256 du User-Agent normalise
  userAgentRaw: string; // UA original pour reference humaine
  navigateur: string;
  os: string;
  appareil: string;
  raison: string;
  bloquePar: mongoose.Types.ObjectId | string | null;
  actif: boolean;
  ipsConnues: string[]; // IPs historiques de cet appareil
  dateCreation: Date;
  expireAt?: Date | null;
}

const bannedDeviceSchema = new Schema<IBannedDevice>(
  {
    fingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAgentRaw: { type: String, default: '' },
    navigateur: { type: String, default: 'Inconnu' },
    os: { type: String, default: 'Inconnu' },
    appareil: { type: String, default: 'Inconnu' },
    raison: { type: String, required: true },
    bloquePar: {
      type: Schema.Types.Mixed,
      default: null,
    },
    actif: { type: Boolean, default: true },
    ipsConnues: [{ type: String }],
    dateCreation: { type: Date, default: Date.now },
    expireAt: { type: Date, default: null },
  },
  { timestamps: false, collection: 'banneddevices' }
);

// Index TTL optionnel: supprime auto si expireAt est defini
bannedDeviceSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0, sparse: true });
bannedDeviceSchema.index({ actif: 1 });

/**
 * Genere un fingerprint SHA-256 a partir du User-Agent
 * On normalise (lowercase, trim) pour eviter les variations mineures
 */
export const generateDeviceFingerprint = (userAgent: string): string => {
  const normalized = (userAgent || '').toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Verifie si un appareil est banni
 */
export const isDeviceBanned = async (userAgent: string): Promise<IBannedDevice | null> => {
  if (!userAgent || userAgent.length < 5) return null;
  const fingerprint = generateDeviceFingerprint(userAgent);
  const banned = await BannedDevice.findOne({ fingerprint, actif: true }).lean();
  return banned as IBannedDevice | null;
};

const BannedDevice = mongoose.model<IBannedDevice>('BannedDevice', bannedDeviceSchema);
export default BannedDevice;
