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
 * - force_leave (RED-06)
 * - force_disconnect (RED-05)
 * - rate_limited (RED-04)
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
  _joinedRooms?: Set<string>; // RED-15: track conversation rooms
}

// ============================================
// RED-04: Socket event rate limiter (sliding window)
// ============================================
class SocketRateLimiter {
  private windows = new Map<string, number[]>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  allow(key: string): boolean {
    const now = Date.now();
    let timestamps = this.windows.get(key);

    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }

    // Remove expired timestamps
    const cutoff = now - this.windowMs;
    while (timestamps.length > 0 && timestamps[0] <= cutoff) {
      timestamps.shift();
    }

    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    timestamps.push(now);
    return true;
  }

  cleanup(key: string) {
    // Remove all keys starting with this prefix
    for (const k of this.windows.keys()) {
      if (k.startsWith(key)) {
        this.windows.delete(k);
      }
    }
  }
}

// Rate limiters per event type (per socket)
const rateLimiters = {
  get_unread_counts: new SocketRateLimiter(5, 60_000),   // 5/min
  join_conversation: new SocketRateLimiter(20, 60_000),   // 20/min
  typing: new SocketRateLimiter(30, 60_000),              // 30/min
  message_read: new SocketRateLimiter(30, 60_000),        // 30/min
};

// RED-05: Max sockets per user
const MAX_SOCKETS_PER_USER = 5;

// RED-15: Max conversation rooms per socket
const MAX_ROOMS_PER_SOCKET = 50;

// Store des sockets connectés par userId
const connectedUsers = new Map<string, Set<string>>();

// Instance globale du serveur Socket.io
let io: Server | null = null;

/**
 * RED-04: Check rate limit for a socket event
 */
function checkRateLimit(
  socket: SocketWithUser,
  eventName: keyof typeof rateLimiters
): boolean {
  const limiter = rateLimiters[eventName];
  if (!limiter) return true;

  const key = `${socket.id}:${eventName}`;
  if (!limiter.allow(key)) {
    socket.emit('rate_limited', { event: eventName });
    return false;
  }
  return true;
}

/**
 * Initialiser Socket.io sur le serveur HTTP
 */
export function initializeSocket(httpServer: HttpServer): Server {
  // CORS: même whitelist que app.ts (JAMAIS de "*")
  const prodOrigins = [
    process.env.CLIENT_URL,
  ].filter(Boolean) as string[];

  const localModerationOrigins = process.env.LOCAL_MODERATION_ORIGINS
    ? process.env.LOCAL_MODERATION_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];

  const allowedOrigins = [...prodOrigins, ...localModerationOrigins];

  const vercelPreviewRegex =
    /^https:\/\/siteweb-front-lpp-v100-[a-z0-9-]+\.vercel\.app$/i;

  io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        // Apps mobiles natives (pas d'origin header)
        if (!origin) {
          return cb(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return cb(null, true);
        }
        if (vercelPreviewRegex.test(origin)) {
          return cb(null, true);
        }
        console.warn(`[SOCKET] Origin refusée: ${origin}`);
        return cb(new Error(`Origin non autorisée: ${origin}`));
      },
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
        const oldSocket = io!.sockets.sockets.get(oldestSocketId);
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
 * RED-06: Force all sockets of a user to leave a conversation room
 * Called from HTTP controllers when a participant is removed from a conversation
 */
export function forceLeaveConversation(userId: string, conversationId: string): void {
  if (!io) return;

  const userSocketIds = connectedUsers.get(userId);
  if (!userSocketIds) return;

  const roomName = `conversation:${conversationId}`;
  for (const socketId of userSocketIds) {
    const socket = io.sockets.sockets.get(socketId) as SocketWithUser | undefined;
    if (socket) {
      socket.leave(roomName);
      if (socket._joinedRooms) {
        socket._joinedRooms.delete(conversationId);
      }
      socket.emit('force_leave', {
        conversationId,
        reason: 'Vous avez été retiré de cette conversation.',
      });
    }
  }

  console.log(`[SOCKET] force_leave émis pour user: ${userId}, conversation: ${conversationId}`);
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
