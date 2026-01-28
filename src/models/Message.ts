import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// Clé de chiffrement (à stocker dans les variables d'environnement en production)
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'lpp-default-key-32-chars-long!!';
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// Fonction pour chiffrer un message
export const chiffrerMessage = (texte: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(texte, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Fonction pour déchiffrer un message
export const dechiffrerMessage = (texteCrypte: string): string => {
  const [ivHex, encryptedText] = texteCrypte.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  expediteur: mongoose.Types.ObjectId;
  destinataire: mongoose.Types.ObjectId;
  contenuCrypte: string; // Contenu chiffré en base
  lu: boolean;
  dateCreation: Date;
  // Méthode virtuelle pour récupérer le contenu déchiffré
  contenu: string;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  dernierMessage?: mongoose.Types.ObjectId;
  dateMiseAJour: Date;
  dateCreation: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    expediteur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
      index: true,
    },
    destinataire: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
      index: true,
    },
    contenuCrypte: {
      type: String,
      required: true,
    },
    lu: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false,
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual pour déchiffrer le contenu à la lecture
messageSchema.virtual('contenu').get(function (this: IMessage) {
  try {
    return dechiffrerMessage(this.contenuCrypte);
  } catch {
    return '[Message illisible]';
  }
});

// Index pour récupérer les messages entre deux utilisateurs
messageSchema.index({ expediteur: 1, destinataire: 1, dateCreation: -1 });
messageSchema.index({ destinataire: 1, lu: 1 });

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    }],
    dernierMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    dateMiseAJour: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: false,
    },
  }
);

// Index pour trouver les conversations d'un utilisateur
conversationSchema.index({ participants: 1, dateMiseAJour: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Message;
