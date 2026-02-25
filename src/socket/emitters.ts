/**
 * Socket.io - Emitters (outbound events)
 *
 * Functions called from HTTP controllers to push events
 * to connected clients via Socket.io rooms.
 */

import type { SocketWithUser } from './rateLimiter.js';
import { getIO, getConnectedUsers } from './index.js';

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
  const io = getIO();
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
  const io = getIO();
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
  const io = getIO();
  if (!io) return;

  io.to(`user:${userId}`).emit('demande_ami', demande);

  console.log(`[SOCKET] demande_ami émis pour user: ${userId} (type: ${demande.type})`);
}

/**
 * RED-06: Force all sockets of a user to leave a conversation room
 * Called from HTTP controllers when a participant is removed from a conversation
 */
export function forceLeaveConversation(userId: string, conversationId: string): void {
  const io = getIO();
  if (!io) return;

  const connectedUsers = getConnectedUsers();
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
 * RED-17: Déconnecter de force un utilisateur (ban/suspension temps réel)
 * Appelé depuis les controllers de modération après une sanction
 */
export function forceDisconnectUser(userId: string, reason: string): void {
  const io = getIO();
  if (!io) return;

  const connectedUsers = getConnectedUsers();
  const userSocketIds = connectedUsers.get(userId);
  if (!userSocketIds) return;

  for (const socketId of userSocketIds) {
    const socket = io.sockets.sockets.get(socketId) as SocketWithUser | undefined;
    if (socket) {
      socket.emit('force_disconnect', { reason });
      socket.disconnect(true);
    }
  }

  connectedUsers.delete(userId);
  console.log(`[SOCKET] force_disconnect pour user: ${userId} (${reason})`);
}

/**
 * Vérifier si un utilisateur est connecté
 */
export function isUserConnected(userId: string): boolean {
  const connectedUsers = getConnectedUsers();
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

/**
 * Obtenir le nombre d'utilisateurs connectés
 */
export function getConnectedUsersCount(): number {
  const connectedUsers = getConnectedUsers();
  return connectedUsers.size;
}
