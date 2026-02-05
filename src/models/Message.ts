import mongoose, { Document, Schema } from 'mongoose';
import {
  chiffrerMessage,
  dechiffrerMessage,
  detectVersion,
  migrateToV2,
} from '../utils/cryptoMessage.js';

// Ré-exporter les fonctions de chiffrement pour compatibilité avec les imports existants
export { chiffrerMessage, dechiffrerMessage, detectVersion, migrateToV2 };

// Types de messages
export type TypeMessage = 'texte' | 'image' | 'video' | 'systeme';

// Types de réactions (Instagram-like)
export type TypeReaction = 'heart' | 'laugh' | 'wow' | 'sad' | 'angry' | 'like';

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  type: TypeReaction;
  createdAt: Date;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  expediteur: mongoose.Types.ObjectId;
  type: TypeMessage;
  contenuCrypte: string; // Contenu chiffré en base (texte ou URL image)
  lecteurs: mongoose.Types.ObjectId[]; // Utilisateurs ayant lu le message
  replyTo?: mongoose.Types.ObjectId; // Message auquel on répond
  reactions: IReaction[]; // Réactions au message
  dateCreation: Date;
  dateModification?: Date; // Date de derniere modification (si edite)
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
      enum: ['texte', 'image', 'video', 'systeme'],
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
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: undefined,
    },
    reactions: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'Utilisateur',
        required: true,
      },
      type: {
        type: String,
        enum: ['heart', 'laugh', 'wow', 'sad', 'angry', 'like'],
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    dateModification: {
      type: Date,
      default: undefined,
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
