import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Message, Conversation, chiffrerMessage, TypeMessage } from '../../models/Message.js';
import Utilisateur from '../../models/Utilisateur.js';
import { applyGamificationEvent } from '../../services/gamificationEngine.js';
import { ErreurAPI } from '../../middlewares/gestionErreurs.js';
import { isBase64DataUrl, isBase64VideoDataUrl, uploadPublicationMedia } from '../../utils/cloudinary.js';
import { emitNewMessage } from '../../socket/index.js';

// Schéma pour envoyer un message
// Note: pour les médias (image/video), contenu peut être un base64 data URL (jusqu'à 25MB)
const schemaEnvoyerMessage = z.object({
  conversationId: z.string().optional(),
  destinataireId: z.string().optional(), // Pour créer une nouvelle conversation privée
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(25_000_000, 'Le contenu est trop volumineux'), // 25MB max pour base64 media
  type: z.enum(['texte', 'image', 'video']).default('texte'),
  clientMessageId: z.string().max(100).optional(),
  replyTo: z.string().optional(), // ID du message auquel on répond
});

// Schéma pour modifier un message
const schemaModifierMessage = z.object({
  contenu: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères')
    .trim(),
});

/**
 * POST /api/messagerie/envoyer
 * Envoyer un message (crée la conversation si nécessaire)
 */
export const envoyerMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const donnees = schemaEnvoyerMessage.parse(req.body);
    const userId = req.utilisateur!._id;

    let conversation: any;

    // Si conversationId fourni, utiliser cette conversation
    if (donnees.conversationId) {
      if (!mongoose.Types.ObjectId.isValid(donnees.conversationId)) {
        throw new ErreurAPI('ID conversation invalide.', 400);
      }

      conversation = await Conversation.findById(donnees.conversationId);
      if (!conversation) {
        throw new ErreurAPI('Conversation non trouvée.', 404);
      }

      if (!conversation.participants.some((p: any) => p.toString() === userId.toString())) {
        throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
      }
    }
    // Sinon, créer ou trouver une conversation privée avec le destinataire
    else if (donnees.destinataireId) {
      if (!mongoose.Types.ObjectId.isValid(donnees.destinataireId)) {
        throw new ErreurAPI('ID destinataire invalide.', 400);
      }

      // Vérifier que le destinataire existe
      const destinataire = await Utilisateur.findById(donnees.destinataireId);
      if (!destinataire) {
        throw new ErreurAPI('Destinataire non trouvé.', 404);
      }

      // Empêcher de s'envoyer un message à soi-même
      if (donnees.destinataireId === userId.toString()) {
        throw new ErreurAPI('Vous ne pouvez pas vous envoyer un message.', 400);
      }

      // Trouver ou créer la conversation privée
      // Tri des participants pour garantir un ordre cohérent dans la requête
      const participantsTries = [userId.toString(), donnees.destinataireId].sort();

      // Chercher d'abord une conversation existante
      conversation = await Conversation.findOne({
        participants: { $all: participantsTries, $size: 2 },
        estGroupe: false,
      });

      // Si pas trouvée, créer une nouvelle conversation
      if (!conversation) {
        conversation = await Conversation.create({
          participants: participantsTries,
          estGroupe: false,
          admins: [],
          muetPar: [],
          dateMiseAJour: new Date(),
        });
      }
    } else {
      throw new ErreurAPI('conversationId ou destinataireId requis.', 400);
    }

    // Traiter le contenu selon le type
    let contenuFinal = donnees.contenu;
    let typeMessage: TypeMessage = donnees.type as TypeMessage;

    // Si c'est un média base64, uploader vers Cloudinary
    if (isBase64DataUrl(donnees.contenu)) {
      // Image base64
      try {
        const mediaUrl = await uploadPublicationMedia(donnees.contenu, `msg_${conversation._id}_${Date.now()}`);
        contenuFinal = mediaUrl;
        typeMessage = 'image';
      } catch (uploadError) {
        console.error('Erreur upload image message:', uploadError);
        throw new ErreurAPI('Erreur lors de l\'upload de l\'image.', 500);
      }
    } else if (isBase64VideoDataUrl(donnees.contenu)) {
      // Video base64
      try {
        const mediaUrl = await uploadPublicationMedia(donnees.contenu, `msg_${conversation._id}_${Date.now()}`);
        contenuFinal = mediaUrl;
        typeMessage = 'video';
      } catch (uploadError) {
        console.error('Erreur upload video message:', uploadError);
        throw new ErreurAPI('Erreur lors de l\'upload de la vidéo.', 500);
      }
    }

    // Validation taille pour les messages texte
    if (typeMessage === 'texte' && contenuFinal.length > 2000) {
      throw new ErreurAPI('Le message ne peut pas dépasser 2000 caractères.', 400);
    }

    // Chiffrer le contenu du message (URL ou texte)
    const contenuCrypte = chiffrerMessage(contenuFinal);

    // Vérifier replyTo si fourni
    let replyToId: mongoose.Types.ObjectId | undefined;
    if (donnees.replyTo) {
      if (!mongoose.Types.ObjectId.isValid(donnees.replyTo)) {
        throw new ErreurAPI('ID du message de réponse invalide.', 400);
      }
      const replyMessage = await Message.findById(donnees.replyTo);
      if (!replyMessage || replyMessage.conversation.toString() !== conversation._id.toString()) {
        throw new ErreurAPI('Message de réponse non trouvé dans cette conversation.', 404);
      }
      replyToId = replyMessage._id;
    }

    // Créer le message
    const message = await Message.create({
      conversation: conversation._id,
      expediteur: userId,
      type: typeMessage,
      contenuCrypte,
      lecteurs: [userId], // L'expéditeur a "lu" son propre message
      replyTo: replyToId,
      reactions: [],
    });

    // Mettre à jour la conversation
    conversation.dernierMessage = message._id;
    conversation.dateMiseAJour = new Date();
    await conversation.save();

    // Récupérer avec les infos de l'expéditeur et du message de réponse
    const messageComplet = await Message.findById(message._id)
      .populate('expediteur', 'prenom nom avatar')
      .populate({
        path: 'replyTo',
        select: 'contenuCrypte expediteur type',
        populate: { path: 'expediteur', select: 'prenom nom' },
      });

    // Formatter le replyTo pour la réponse
    let replyToData = null;
    if (messageComplet!.replyTo) {
      const replyMsg = messageComplet!.replyTo as any;
      replyToData = {
        _id: replyMsg._id,
        contenu: replyMsg.contenu,
        expediteur: replyMsg.expediteur,
        type: replyMsg.type,
      };
    }

    // Émettre via Socket.io pour les autres participants
    const expediteur = messageComplet!.expediteur as any;
    emitNewMessage(conversation._id.toString(), {
      _id: messageComplet!._id.toString(),
      contenu: messageComplet!.contenu,
      expediteur: {
        _id: expediteur._id.toString(),
        prenom: expediteur.prenom,
        nom: expediteur.nom,
        avatar: expediteur.avatar,
      },
      dateEnvoi: messageComplet!.dateCreation.toISOString(),
      lu: false,
    });

    // Gamification: XP pour envoi de message
    const gamification = await applyGamificationEvent(userId.toString(), 'send_message', conversation._id.toString()).catch(() => null);

    res.status(201).json({
      succes: true,
      message: 'Message envoyé avec succès.',
      data: {
        message: {
          _id: messageComplet!._id,
          expediteur: messageComplet!.expediteur,
          type: messageComplet!.type,
          contenu: messageComplet!.contenu,
          dateCreation: messageComplet!.dateCreation,
          replyTo: replyToData,
          reactions: [],
          estMoi: true,
        },
        conversationId: conversation._id,
      },
      ...(gamification ? { gamification } : {}),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/messagerie/conversations/:conversationId/messages/:messageId
 * Modifier un message (seulement par l'expediteur, dans les 15 minutes)
 */
export const modifierMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, messageId } = req.params;
    const donnees = schemaModifierMessage.parse(req.body);
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ErreurAPI('IDs invalides.', 400);
    }

    // Verifier que la conversation existe et que l'utilisateur y participe
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ErreurAPI('Conversation non trouvee.', 404);
    }

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
    }

    // Recuperer le message
    const message = await Message.findById(messageId);
    if (!message || message.conversation.toString() !== conversationId) {
      throw new ErreurAPI('Message non trouve.', 404);
    }

    // Verifier que l'utilisateur est l'expediteur
    if (message.expediteur.toString() !== userId.toString()) {
      throw new ErreurAPI('Vous ne pouvez modifier que vos propres messages.', 403);
    }

    // Verifier que le message n'est pas un message systeme
    if (message.type === 'systeme') {
      throw new ErreurAPI('Les messages systeme ne peuvent pas etre modifies.', 400);
    }

    // Verifier que le message n'est pas trop ancien (15 minutes)
    const LIMITE_MODIFICATION_MS = 15 * 60 * 1000;
    const ageMessage = Date.now() - message.dateCreation.getTime();
    if (ageMessage > LIMITE_MODIFICATION_MS) {
      throw new ErreurAPI('Vous ne pouvez plus modifier ce message (delai de 15 minutes depasse).', 400);
    }

    // Chiffrer le nouveau contenu
    const contenuCrypte = chiffrerMessage(donnees.contenu);

    // Mettre a jour le message
    message.contenuCrypte = contenuCrypte;
    message.dateModification = new Date();
    await message.save();

    // Retourner le message mis a jour
    const messageComplet = await Message.findById(messageId)
      .populate('expediteur', 'prenom nom avatar');

    res.json({
      succes: true,
      message: 'Message modifie avec succes.',
      data: {
        message: {
          _id: messageComplet!._id,
          expediteur: messageComplet!.expediteur,
          type: messageComplet!.type,
          contenu: messageComplet!.contenu,
          dateCreation: messageComplet!.dateCreation,
          dateModification: messageComplet!.dateModification,
          estModifie: true,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/messagerie/conversations/:conversationId/messages/:messageId
 * Supprimer un message (seulement par l'expediteur)
 */
export const supprimerMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.utilisateur!._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      throw new ErreurAPI('IDs invalides.', 400);
    }

    // Verifier que la conversation existe et que l'utilisateur y participe
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new ErreurAPI('Conversation non trouvee.', 404);
    }

    if (!conversation.participants.some((p) => p.toString() === userId.toString())) {
      throw new ErreurAPI('Vous ne faites pas partie de cette conversation.', 403);
    }

    // Recuperer le message
    const message = await Message.findById(messageId);
    if (!message || message.conversation.toString() !== conversationId) {
      throw new ErreurAPI('Message non trouve.', 404);
    }

    // Verifier que l'utilisateur est l'expediteur
    if (message.expediteur.toString() !== userId.toString()) {
      throw new ErreurAPI('Vous ne pouvez supprimer que vos propres messages.', 403);
    }

    // Verifier que le message n'est pas un message systeme
    if (message.type === 'systeme') {
      throw new ErreurAPI('Les messages systeme ne peuvent pas etre supprimes.', 400);
    }

    // Supprimer le message
    await Message.findByIdAndDelete(messageId);

    // Si c'etait le dernier message, mettre a jour la conversation
    if (conversation.dernierMessage?.toString() === messageId) {
      const dernierMessage = await Message.findOne({ conversation: conversationId })
        .sort({ dateCreation: -1 });

      conversation.dernierMessage = dernierMessage?._id || undefined;
      conversation.dateMiseAJour = new Date();
      await conversation.save();
    }

    res.json({
      succes: true,
      message: 'Message supprime avec succes.',
    });
  } catch (error) {
    next(error);
  }
};
