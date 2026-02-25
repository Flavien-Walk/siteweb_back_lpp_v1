/**
 * Socket.io - Point d'entrée et état partagé
 *
 * Owns the shared mutable state (io, connectedUsers) and exposes getters
 * so that handlers.ts and emitters.ts can access them without circular
 * import issues (getters are called at runtime, not at import time).
 *
 * Re-exports every public symbol so that existing imports
 * from '../socket/index.js' continue to work unchanged.
 */

import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { socketCorsOptions } from '../config/cors.js';
import { setupAuthMiddleware, registerConnectionHandlers } from './handlers.js';

// ============================================
// Shared mutable state
// ============================================

/** Instance globale du serveur Socket.io */
let io: Server | null = null;

/** Store des sockets connectés par userId */
const connectedUsers = new Map<string, Set<string>>();

// ============================================
// State accessors (used by handlers & emitters)
// ============================================

export function getIO(): Server | null {
  return io;
}

export function getConnectedUsers(): Map<string, Set<string>> {
  return connectedUsers;
}

// ============================================
// Initialisation
// ============================================

/**
 * Initialiser Socket.io sur le serveur HTTP
 */
export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: socketCorsOptions,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  setupAuthMiddleware(io);
  registerConnectionHandlers(io);

  console.log('[SOCKET] Socket.io initialisé');
  return io;
}

// ============================================
// Re-exports
// ============================================

export {
  emitNewMessage,
  emitNewNotification,
  emitDemandeAmi,
  forceLeaveConversation,
  forceDisconnectUser,
  isUserConnected,
  getConnectedUsersCount,
} from './emitters.js';

export { io };
