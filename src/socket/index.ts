/**
 * Socket.io - Gestion temps réel
 *
 * Events gérés:
 * - connection / disconnect
 * - join_conversation / leave_conversation
 * - typing / message_read
 * - get_unread_counts -> unread_counts
 *
 * Events émis:
 * - new_message
 * - new_notification
 * - demande_ami
 * - typing
 * - unread_counts
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message, { Conversation } from '../models/Message.js';
import Notification from '../models/Notification.js';
import Utilisateur from '../models/Utilisateur.js';

// Types
interface AuthPayload {
  id: string;
  email: string;
}

interface SocketWithUser extends Socket {
  userId?: string;
  userName?: string;
}

// Store des sockets connectés par userId
const connectedUsers = new Map<string, Set<string>>();

// Instance globale du serveur Socket.io
let io: Server | null = null;

/**
 * Initialiser Socket.io sur le serveur HTTP
 */
export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // En prod, restreindre aux domaines autorisés
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware d'authentification
  io.use(async (socket: SocketWithUser, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;

      if (!token) {
        return next(new Error('Token manquant'));
      }

      // Vérifier le JWT
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'secret'
      ) as AuthPayload;

      // Vérifier que l'userId correspond
      if (userId && decoded.id !== userId) {
        return next(new Error('UserId invalide'));
      }

      // Récupérer le nom de l'utilisateur
      const user = await Utilisateur.findById(decoded.id).select('prenom nom');
      if (!user) {
        return next(new Error('Utilisateur non trouvé'));
      }

      socket.userId = decoded.id;
      socket.userName = `${user.prenom} ${user.nom}`;
      next();
    } catch (error) {
      console.error('[SOCKET] Erreur auth:', error);
      next(new Error('Authentification échouée'));
    }
  });

  // Gestion des connexions
  io.on('connection', (socket: SocketWithUser) => {
    const userId = socket.userId!;
    console.log(`[SOCKET] Utilisateur connecté: ${userId} (socket: ${socket.id})`);

    // Ajouter à la liste des connectés
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Joindre la room personnelle (pour recevoir les notifs)
    socket.join(`user:${userId}`);

    // === EVENT: Demander les compteurs non-lus ===
    socket.on('get_unread_counts', async () => {
      try {
        const counts = await getUnreadCounts(userId);
        socket.emit('unread_counts', counts);
      } catch (error) {
        console.error('[SOCKET] Erreur get_unread_counts:', error);
      }
    });

    // === EVENT: Rejoindre une conversation ===
    socket.on('join_conversation', ({ conversationId }: { conversationId: string }) => {
      console.log(`[SOCKET] ${userId} rejoint conversation: ${conversationId}`);
      socket.join(`conversation:${conversationId}`);
    });

    // === EVENT: Quitter une conversation ===
    socket.on('leave_conversation', ({ conversationId }: { conversationId: string }) => {
      console.log(`[SOCKET] ${userId} quitte conversation: ${conversationId}`);
      socket.leave(`conversation:${conversationId}`);
    });

    // === EVENT: Indicateur de frappe ===
    socket.on('typing', ({ conversationId, isTyping }: { conversationId: string; isTyping: boolean }) => {
      // Émettre aux autres membres de la conversation
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        userName: socket.userName,
        isTyping,
      });
    });

    // === EVENT: Message lu ===
    socket.on('message_read', async ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      try {
        // Mettre à jour le message en base
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { lecteurs: new mongoose.Types.ObjectId(userId) }
        });

        // Notifier les autres (pour mettre à jour les checkmarks)
        socket.to(`conversation:${conversationId}`).emit('message_read', {
          conversationId,
          messageId,
          readBy: userId,
        });
      } catch (error) {
        console.error('[SOCKET] Erreur message_read:', error);
      }
    });

    // === EVENT: Déconnexion ===
    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] Utilisateur déconnecté: ${userId} (${reason})`);

      // Retirer de la liste des connectés
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
        }
      }
    });
  });

  console.log('[SOCKET] Socket.io initialisé');
  return io;
}

/**
 * Récupérer les compteurs non-lus pour un utilisateur
 */
async function getUnreadCounts(userId: string): Promise<{
  messages: number;
  notifications: number;
  demandesAmis: number;
}> {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Compteur messages non-lus (conversations où l'utilisateur est participant)
  const conversations = await Conversation.find({
    participants: userObjectId,
  }).select('_id');

  const conversationIds = conversations.map(c => c._id);

  const messagesNonLus = await Message.countDocuments({
    conversation: { $in: conversationIds },
    expediteur: { $ne: userObjectId },
    lecteurs: { $ne: userObjectId },
    type: { $ne: 'systeme' },
  });

  // Compteur notifications non-lues (exclure demandes d'ami)
  const notificationsNonLues = await Notification.countDocuments({
    destinataire: userObjectId,
    lue: false,
    type: { $nin: ['demande_ami'] },
  });

  // Compteur demandes d'amis en attente
  const user = await Utilisateur.findById(userId).select('demandesAmisRecues');
  const demandesAmis = user?.demandesAmisRecues?.length || 0;

  return {
    messages: messagesNonLus,
    notifications: notificationsNonLues,
    demandesAmis,
  };
}

/**
 * Émettre un nouveau message à une conversation
 */
export function emitNewMessage(
  conversationId: string,
  message: {
    _id: string;
    contenu: string;
    expediteur: {
      _id: string;
      prenom: string;
      nom: string;
      avatar?: string;
    };
    dateEnvoi: string;
    lu: boolean;
  }
): void {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit('new_message', {
    conversationId,
    message,
  });

  console.log(`[SOCKET] new_message émis pour conversation: ${conversationId}`);
}

/**
 * Émettre une nouvelle notification à un utilisateur
 */
export function emitNewNotification(
  userId: string,
  notification: {
    _id: string;
    type: string;
    titre: string;
    message: string;
    lu: boolean;
    lien?: string;
    dateCreation: string;
    expediteur?: {
      _id: string;
      prenom: string;
      nom: string;
      avatar?: string;
    };
  }
): void {
  if (!io) return;

  io.to(`user:${userId}`).emit('new_notification', notification);

  console.log(`[SOCKET] new_notification émis pour user: ${userId}`);
}

/**
 * Émettre une demande d'ami
 */
export function emitDemandeAmi(
  userId: string,
  demande: {
    _id: string;
    type: 'received' | 'accepted' | 'rejected';
    utilisateur: {
      _id: string;
      prenom: string;
      nom: string;
      avatar?: string;
    };
  }
): void {
  if (!io) return;

  io.to(`user:${userId}`).emit('demande_ami', demande);

  console.log(`[SOCKET] demande_ami émis pour user: ${userId} (type: ${demande.type})`);
}

/**
 * Vérifier si un utilisateur est connecté
 */
export function isUserConnected(userId: string): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

/**
 * Obtenir le nombre d'utilisateurs connectés
 */
export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

export { io };
