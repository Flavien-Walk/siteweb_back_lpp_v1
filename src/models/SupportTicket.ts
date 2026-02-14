import mongoose, { Document, Schema } from 'mongoose';

// Statuts du ticket
export type TicketStatus = 'en_attente' | 'en_cours' | 'termine';

// Categories de demande
export type TicketCategory = 'bug' | 'compte' | 'contenu' | 'signalement' | 'suggestion' | 'autre';

// Priorite (attribuee par le staff)
export type TicketPriority = 'low' | 'medium' | 'high';

// Un message dans le fil de conversation
export interface ITicketMessage {
  _id?: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  senderRole: 'user' | 'staff';
  content: string;
  dateCreation: Date;
}

// Interface du document
export interface ISupportTicket extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: mongoose.Types.ObjectId;
  messages: ITicketMessage[];
  dateCreation: Date;
  dateMiseAJour: Date;
  dateFermeture?: Date;
}

const ticketMessageSchema = new Schema<ITicketMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['user', 'staff'],
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Le contenu du message est requis'],
      maxlength: [2000, 'Le message ne peut pas depasser 2000 caracteres'],
      trim: true,
    },
    dateCreation: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: [true, "L'utilisateur est requis"],
      index: true,
    },
    subject: {
      type: String,
      required: [true, "L'objet est requis"],
      maxlength: [200, "L'objet ne peut pas depasser 200 caracteres"],
      trim: true,
    },
    category: {
      type: String,
      enum: ['bug', 'compte', 'contenu', 'signalement', 'suggestion', 'autre'],
      required: [true, 'La categorie est requise'],
    },
    status: {
      type: String,
      enum: ['en_attente', 'en_cours', 'termine'],
      default: 'en_attente',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      index: true,
    },
    messages: [ticketMessageSchema],
    dateFermeture: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// Index composites pour les requetes frequentes
supportTicketSchema.index({ status: 1, dateCreation: -1 });
supportTicketSchema.index({ user: 1, status: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model<ISupportTicket>('SupportTicket', supportTicketSchema);
