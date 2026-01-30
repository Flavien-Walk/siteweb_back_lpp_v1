import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// Clé de chiffrement (OBLIGATOIRE en variable d'environnement)
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error('MESSAGE_ENCRYPTION_KEY est requis dans les variables d\'environnement');
}
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
  // Validation : chaîne non vide
  if (!texteCrypte || typeof texteCrypte !== 'string') {
    throw new Error('Contenu chiffré manquant');
  }

  // Validation du format : doit contenir exactement un ':'
  const colonIndex = texteCrypte.indexOf(':');
  if (colonIndex === -1) {
    // Pas de séparateur = texte non chiffré (données legacy ou corruption)
    // On retourne le texte tel quel pour compatibilité ascendante
    console.warn('[Message] Format non chiffré détecté, retour du texte brut');
    return texteCrypte;
  }

  const ivHex = texteCrypte.substring(0, colonIndex);
  const encryptedText = texteCrypte.substring(colonIndex + 1);

  // Validation : IV doit être exactement 32 caractères hex (16 bytes)
  if (ivHex.length !== 32 || !/^[0-9a-fA-F]+$/.test(ivHex)) {
    // Format invalide - peut-être du texte contenant ':'
    console.warn('[Message] IV invalide, retour du texte brut');
    return texteCrypte;
  }

  // Validation : le texte chiffré ne doit pas être vide
  if (!encryptedText || encryptedText.length === 0) {
    throw new Error('Contenu chiffré vide');
  }

  // Validation : le texte chiffré doit être du hex valide
  if (!/^[0-9a-fA-F]+$/.test(encryptedText)) {
    // Pas du hex = probablement pas chiffré
    console.warn('[Message] Texte chiffré non-hex détecté, retour du texte brut');
    return texteCrypte;
  }

  // Déchiffrement
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Types de messages
export type TypeMessage = 'texte' | 'image' | 'systeme';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  expediteur: mongoose.Types.ObjectId;
  type: TypeMessage;
  contenuCrypte: string; // Contenu chiffré en base (texte ou URL image)
  lecteurs: mongoose.Types.ObjectId[]; // Utilisateurs ayant lu le message
  dateCreation: Date;
  // Méthode virtuelle pour récupérer le contenu déchiffré
  contenu: string;
}

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  estGroupe: boolean;
  nomGroupe?: string;
  imageGroupe?: string;
  createur?: mongoose.Types.ObjectId; // Pour les groupes
  admins: mongoose.Types.ObjectId[]; // Admins du groupe
  dernierMessage?: mongoose.Types.ObjectId;
  muetPar: mongoose.Types.ObjectId[]; // Utilisateurs ayant mis en sourdine
  dateMiseAJour: Date;
  dateCreation: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    expediteur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['texte', 'image', 'systeme'],
      default: 'texte',
    },
    contenuCrypte: {
      type: String,
      required: true,
    },
    lecteurs: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
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

// Index pour récupérer les messages d'une conversation
messageSchema.index({ conversation: 1, dateCreation: -1 });
messageSchema.index({ expediteur: 1, dateCreation: -1 });

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    }],
    estGroupe: {
      type: Boolean,
      default: false,
    },
    nomGroupe: {
      type: String,
      maxlength: 100,
    },
    imageGroupe: {
      type: String,
    },
    createur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    },
    admins: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
    dernierMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    muetPar: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
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
conversationSchema.index({ estGroupe: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

export default Message;
