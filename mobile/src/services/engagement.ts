/**
 * Service Engagement — Tracking d'events pour les recommandations
 * Buffer les events et les envoie en batch toutes les 10s ou quand 20 events accumules
 */

import api from './api';

// Types
export type EventType =
  | 'project_impression'
  | 'project_click'
  | 'project_view_time'
  | 'project_like'
  | 'project_follow'
  | 'project_comment'
  | 'project_share';

interface PendingEvent {
  type: EventType;
  targetId: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

// === BUFFER ===

const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 10_000; // 10 secondes
let eventBuffer: PendingEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let isFlushing = false;

/**
 * Demarrer le timer de flush automatique
 */
const startFlushTimer = () => {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (eventBuffer.length > 0) {
      flushEvents();
    }
  }, FLUSH_INTERVAL_MS);
};

/**
 * Arreter le timer de flush
 */
export const stopFlushTimer = () => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
};

/**
 * Envoyer les events bufferises au backend
 */
export const flushEvents = async (): Promise<void> => {
  if (isFlushing || eventBuffer.length === 0) return;
  isFlushing = true;

  // Prendre les events courants et vider le buffer
  const eventsToSend = [...eventBuffer];
  eventBuffer = [];

  try {
    await api.post('/events', { events: eventsToSend }, true);
  } catch (error) {
    // Remettre les events dans le buffer en cas d'echec
    eventBuffer = [...eventsToSend, ...eventBuffer].slice(0, 100);
    if (__DEV__) console.warn('[Engagement] Flush echoue, events remis en buffer:', error);
  } finally {
    isFlushing = false;
  }
};

/**
 * Tracker un event d'engagement
 */
export const trackEvent = (
  type: EventType,
  targetId: string,
  value?: number,
  metadata?: Record<string, unknown>
): void => {
  eventBuffer.push({ type, targetId, value, metadata });

  // Demarrer le timer si pas deja actif
  startFlushTimer();

  // Flush si on atteint la taille de batch
  if (eventBuffer.length >= BATCH_SIZE) {
    flushEvents();
  }
};

// === HELPERS SPECIFIQUES ===

/**
 * Tracker une impression (carte projet visible dans le viewport)
 */
export const trackImpression = (projetId: string): void => {
  trackEvent('project_impression', projetId);
};

/**
 * Tracker un clic (tap sur une carte projet)
 */
export const trackClick = (projetId: string): void => {
  trackEvent('project_click', projetId);
};

/**
 * Tracker le temps de vue (quand on quitte un detail projet)
 */
export const trackViewTime = (projetId: string, seconds: number): void => {
  if (seconds < 1) return; // Ignorer les vues < 1s
  trackEvent('project_view_time', projetId, Math.round(seconds));
};
