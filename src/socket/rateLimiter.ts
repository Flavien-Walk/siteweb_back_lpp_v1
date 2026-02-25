/**
 * Socket.io - Rate limiting (RED-04)
 *
 * Sliding-window rate limiter per socket per event type.
 * Also holds security constants for max sockets / max rooms.
 */

import { Socket } from 'socket.io';

// ============================================
// Types
// ============================================
export interface AuthPayload {
  id: string;
  email: string;
}

export interface SocketWithUser extends Socket {
  userId?: string;
  userName?: string;
  _joinedRooms?: Set<string>; // RED-15: track conversation rooms
}

// ============================================
// RED-04: Socket event rate limiter (sliding window)
// ============================================
export class SocketRateLimiter {
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
export const rateLimiters = {
  get_unread_counts: new SocketRateLimiter(5, 60_000),   // 5/min
  join_conversation: new SocketRateLimiter(20, 60_000),   // 20/min
  typing: new SocketRateLimiter(30, 60_000),              // 30/min
  message_read: new SocketRateLimiter(30, 60_000),        // 30/min
};

// RED-05: Max sockets per user
export const MAX_SOCKETS_PER_USER = 5;

// RED-15: Max conversation rooms per socket
export const MAX_ROOMS_PER_SOCKET = 50;

/**
 * RED-04: Check rate limit for a socket event
 */
export function checkRateLimit(
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
