import mongoose, { Document, Schema } from 'mongoose';

export interface ICommentaire extends Document {
  _id: mongoose.Types.ObjectId;
  publication: mongoose.Types.ObjectId;
  auteur: mongoose.Types.ObjectId;
  contenu: string;
  likes: mongoose.Types.ObjectId[];
  reponseA?: mongoose.Types.ObjectId; // Commentaire parent (pour les réponses)
  modifie: boolean; // Indique si le commentaire a été modifié
  dateCreation: Date;
  dateMiseAJour: Date;
}

const commentaireSchema = new Schema<ICommentaire>(
  {
    publication: {
      type: Schema.Types.ObjectId,
      ref: 'Publication',
      required: true,
      index: true,
    },
    auteur: {
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
      required: true,
    },
    contenu: {
      type: String,
      required: [true, 'Le contenu est requis'],
      maxlength: [1000, 'Le commentaire ne peut pas dépasser 1000 caractères'],
      trim: true,
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'Utilisateur',
    }],
    reponseA: {
      type: Schema.Types.ObjectId,
      ref: 'Commentaire',
      default: null,
    },
    modifie: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'dateCreation',
      updatedAt: 'dateMiseAJour',
    },
  }
);

// Index pour récupérer les commentaires d'une publication rapidement
commentaireSchema.index({ publication: 1, dateCreation: -1 });
// Index pour les réponses à un commentaire
commentaireSchema.index({ reponseA: 1 });
// Index pour récupérer les commentaires d'un utilisateur
commentaireSchema.index({ auteur: 1, dateCreation: -1 });

const Commentaire = mongoose.model<ICommentaire>('Commentaire', commentaireSchema);

export default Commentaire;
