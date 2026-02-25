/**
 * Socket.io - Connection handlers
 *
 * Auth middleware + connection handler with all socket.on events.
 * Imports shared state (io, connectedUsers) from index.ts via getters.
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message, { Conversation } from '../models/Message.js';
import Notification from '../models/Notification.js';
import Utilisateur from '../models/Utilisateur.js';
import {
  type AuthPayload,
  type SocketWithUser,
  checkRateLimit,
  rateLimiters,
  MAX_SOCKETS_PER_USER,
  MAX_ROOMS_PER_SOCKET,
} from './rateLimiter.js';
import { getIO, getConnectedUsers } from './index.js';

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
 * Setup the authentication middleware on the io server
 */
export function setupAuthMiddleware(io: Server): void {
  io.use(async (socket: SocketWithUser, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;

      if (!token) {
        return next(new Error('Token manquant'));
      }

      // Vérifier le JWT (pas de fallback — JWT_SECRET DOIT être défini)
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('[SOCKET] FATAL: JWT_SECRET non défini');
        return next(new Error('Configuration serveur invalide'));
      }

      const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
      }) as AuthPayload;

      // Vérifier que l'userId correspond
      if (userId && decoded.id !== userId) {
        return next(new Error('UserId invalide'));
      }

      // Récupérer l'utilisateur et vérifier son statut
      const user = await Utilisateur.findById(decoded.id).select('prenom nom bannedAt suspendedUntil');
      if (!user) {
        return next(new Error('Utilisateur non trouvé'));
      }

      // RED-16: Bloquer les connexions socket des utilisateurs bannis/suspendus
      if (user.bannedAt) {
        return next(new Error('Compte banni'));
      }
      if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
        return next(new Error('Compte suspendu'));
      }

      socket.userId = decoded.id;
      socket.userName = `${user.prenom} ${user.nom}`;
      next();
    } catch (error) {
      console.error('[SOCKET] Erreur auth:', error);
      next(new Error('Authentification échouée'));
    }
  });
}

/**
 * Register the connection handler and all socket events
 */
export function registerConnectionHandlers(io: Server): void {
  const connectedUsers = getConnectedUsers();

  io.on('connection', (socket: SocketWithUser) => {
    const userId = socket.userId!;
    console.log(`[SOCKET] Utilisateur connecté: ${userId} (socket: ${socket.id})`);

    // SEC-SOCKET-01: Re-verifier le statut utilisateur sur chaque event entrant
    // (un user peut etre banni/suspendu APRES la connexion socket)
    let lastStatusCheck = Date.now();
    const STATUS_CHECK_INTERVAL = 30_000; // Re-verifier toutes les 30s max

    socket.use(async ([event], next) => {
      const now = Date.now();
      if (now - lastStatusCheck < STATUS_CHECK_INTERVAL) return next();
      lastStatusCheck = now;

      try {
        const user = await Utilisateur.findById(userId)
          .select('bannedAt suspendedUntil')
          .lean();

        if (!user) {
          socket.emit('force_disconnect', { reason: 'Compte introuvable' });
          socket.disconnect(true);
          return;
        }
        if (user.bannedAt) {
          socket.emit('force_disconnect', { reason: 'Compte banni' });
          socket.disconnect(true);
          return;
        }
        if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
          socket.emit('force_disconnect', { reason: 'Compte suspendu' });
          socket.disconnect(true);
          return;
        }
        next();
      } catch {
        next();
      }
    });

    // RED-15: Initialize room tracker
    socket._joinedRooms = new Set();

    // RED-05: Enforce max connections per user
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    const userSockets = connectedUsers.get(userId)!;

    if (userSockets.size >= MAX_SOCKETS_PER_USER) {
      // Disconnect oldest socket (first in Set = oldest)
      const oldestSocketId = userSockets.values().next().value;
      if (oldestSocketId) {
        const oldSocket = io.sockets.sockets.get(oldestSocketId);
        if (oldSocket) {
          (oldSocket as SocketWithUser).emit('force_disconnect', {
            reason: 'Trop de connexions simultanées',
          });
          oldSocket.disconnect(true);
        }
        userSockets.delete(oldestSocketId);
      }
    }

    userSockets.add(socket.id);

    // Joindre la room personnelle (pour recevoir les notifs)
    socket.join(`user:${userId}`);

    // === EVENT: Demander les compteurs non-lus ===
    socket.on('get_unread_counts', async () => {
      // RED-04: Rate limit
      if (!checkRateLimit(socket, 'get_unread_counts')) return;

      try {
        const counts = await getUnreadCounts(userId);
        socket.emit('unread_counts', counts);
      } catch (error) {
        console.error('[SOCKET] Erreur get_unread_counts:', error);
      }
    });

    // === EVENT: Rejoindre une conversation ===
    socket.on('join_conversation', async (payload: unknown) => {
      // RED-04: Rate limit
      if (!checkRateLimit(socket, 'join_conversation')) return;

      // RED-12: Validate payload
      if (!payload || typeof payload !== 'object' || !('conversationId' in payload)) return;
      const { conversationId } = payload as { conversationId: unknown };
      if (typeof conversationId !== 'string') return;

      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) return;

        // RED-15: Check rooms cap
        if (socket._joinedRooms && socket._joinedRooms.size >= MAX_ROOMS_PER_SOCKET) {
          socket.emit('rate_limited', { event: 'join_conversation', reason: 'Trop de rooms actives' });
          return;
        }

        // Vérifier que l'utilisateur est participant de la conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: new mongoose.Types.ObjectId(userId),
        }).select('_id');

        if (!conversation) {
          console.warn(`[SOCKET][SECURITY] ${userId} tentative join conversation non autorisée: ${conversationId}`);
          return;
        }

        socket.join(`conversation:${conversationId}`);
        if (socket._joinedRooms) {
          socket._joinedRooms.add(conversationId);
        }
      } catch (error) {
        console.error('[SOCKET] Erreur join_conversation:', error);
      }
    });

    // === EVENT: Quitter une conversation ===
    socket.on('leave_conversation', (payload: unknown) => {
      // RED-12: Validate payload
      if (!payload || typeof payload !== 'object' || !('conversationId' in payload)) return;
      const { conversationId } = payload as { conversationId: unknown };
      if (typeof conversationId !== 'string') return;

      socket.leave(`conversation:${conversationId}`);
      if (socket._joinedRooms) {
        socket._joinedRooms.delete(conversationId);
      }
    });

    // === EVENT: Indicateur de frappe ===
    socket.on('typing', async (payload: unknown) => {
      // RED-04: Rate limit
      if (!checkRateLimit(socket, 'typing')) return;

      // RED-12: Validate payload
      if (!payload || typeof payload !== 'object') return;
      const { conversationId, isTyping } = payload as { conversationId: unknown; isTyping: unknown };
      if (typeof conversationId !== 'string' || typeof isTyping !== 'boolean') return;

      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) return;

        // Vérifier appartenance avant d'émettre
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: new mongoose.Types.ObjectId(userId),
        }).select('_id');

        if (!conversation) return;

        socket.to(`conversation:${conversationId}`).emit('typing', {
          conversationId,
          userId,
          userName: socket.userName,
          isTyping,
        });
      } catch (error) {
        console.error('[SOCKET] Erreur typing:', error);
      }
    });

    // === EVENT: Message lu ===
    socket.on('message_read', async (payload: unknown) => {
      // RED-04: Rate limit
      if (!checkRateLimit(socket, 'message_read')) return;

      // RED-12: Validate payload
      if (!payload || typeof payload !== 'object') return;
      const { conversationId, messageId } = payload as { conversationId: unknown; messageId: unknown };
      if (typeof conversationId !== 'string' || typeof messageId !== 'string') return;

      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId) || !mongoose.Types.ObjectId.isValid(messageId)) return;

        // Vérifier que l'utilisateur est participant de la conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: new mongoose.Types.ObjectId(userId),
        }).select('_id');

        if (!conversation) {
          console.warn(`[SOCKET][SECURITY] ${userId} tentative message_read non autorisée: ${conversationId}`);
          return;
        }

        // Vérifier que le message appartient bien à cette conversation
        await Message.findOneAndUpdate(
          { _id: messageId, conversation: conversationId },
          { $addToSet: { lecteurs: new mongoose.Types.ObjectId(userId) } }
        );

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
      const sockets = connectedUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          connectedUsers.delete(userId);
        }
      }

      // RED-04: Cleanup rate limiter entries for this socket
      for (const limiter of Object.values(rateLimiters)) {
        limiter.cleanup(socket.id);
      }
    });
  });
}
