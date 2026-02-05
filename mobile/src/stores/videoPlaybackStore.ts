/**
 * VideoPlaybackStore - Store global pour les sessions de lecture vidéo
 * Permet de conserver l'état de lecture (position, play/pause) entre preview et fullscreen
 */

export interface VideoPlaybackSession {
  positionMillis: number;
  shouldPlay: boolean;
  updatedAt: number;
}

type PlaybackListener = (videoUrl: string, session: VideoPlaybackSession) => void;
type ActiveVideoListener = (activeUrl: string | null) => void;
type ActivePostListener = (activePostId: string | null) => void;

class VideoPlaybackStore {
  private sessions: Map<string, VideoPlaybackSession> = new Map();
  private listeners: Set<PlaybackListener> = new Set();

  // Active video tracking - only one video can play at a time
  private activeVideoUrl: string | null = null;
  private activeVideoListeners: Set<ActiveVideoListener> = new Set();

  // ACTIVE POST ID - SOURCE OF TRUTH for shouldPlay
  // This is the primary mechanism for determining which video should play
  private activePostId: string | null = null;
  private activePostIdListeners: Set<ActivePostListener> = new Set();

  /**
   * Sauvegarder l'état de lecture d'une vidéo
   */
  saveSession(videoUrl: string, positionMillis: number, shouldPlay: boolean): void {
    const session: VideoPlaybackSession = {
      positionMillis,
      shouldPlay,
      updatedAt: Date.now(),
    };
    this.sessions.set(videoUrl, session);

    // Notifier les listeners
    this.listeners.forEach(listener => listener(videoUrl, session));
  }

  /**
   * Récupérer l'état de lecture d'une vidéo
   */
  getSession(videoUrl: string): VideoPlaybackSession | null {
    return this.sessions.get(videoUrl) || null;
  }

  /**
   * Supprimer une session (quand la vidéo n'est plus visible depuis longtemps)
   */
  clearSession(videoUrl: string): void {
    this.sessions.delete(videoUrl);
  }

  /**
   * Nettoyer les sessions anciennes (> 5 minutes)
   */
  cleanupOldSessions(maxAgeMs: number = 5 * 60 * 1000): void {
    const now = Date.now();
    this.sessions.forEach((session, videoUrl) => {
      if (now - session.updatedAt > maxAgeMs) {
        this.sessions.delete(videoUrl);
      }
    });
  }

  /**
   * S'abonner aux changements de session
   */
  subscribe(listener: PlaybackListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Vérifier si une session existe et est récente (< 30 secondes)
   */
  hasRecentSession(videoUrl: string, maxAgeMs: number = 30000): boolean {
    const session = this.sessions.get(videoUrl);
    if (!session) return false;
    return Date.now() - session.updatedAt < maxAgeMs;
  }

  // ========== ACTIVE VIDEO MANAGEMENT ==========

  /**
   * Définir la vidéo active (une seule à la fois)
   * Les autres vidéos doivent se mettre en pause
   */
  setActiveVideo(videoUrl: string | null): void {
    if (this.activeVideoUrl === videoUrl) return;

    this.activeVideoUrl = videoUrl;

    // Notifier tous les listeners
    this.activeVideoListeners.forEach(listener => listener(videoUrl));
  }

  /**
   * Récupérer l'URL de la vidéo active
   */
  getActiveVideo(): string | null {
    return this.activeVideoUrl;
  }

  /**
   * Vérifier si une vidéo est la vidéo active
   */
  isActiveVideo(videoUrl: string): boolean {
    return this.activeVideoUrl === videoUrl;
  }

  /**
   * S'abonner aux changements de vidéo active
   */
  subscribeToActiveVideo(listener: ActiveVideoListener): () => void {
    this.activeVideoListeners.add(listener);
    return () => this.activeVideoListeners.delete(listener);
  }

  // ========== ACTIVE POST ID (SOURCE OF TRUTH) ==========

  /**
   * Définir le post actif (source de vérité pour shouldPlay)
   * Utilisé par le kill-switch et le viewability tracking
   */
  setActivePostId(postId: string | null): void {
    if (this.activePostId === postId) return;
    this.activePostId = postId;

    // Notifier tous les listeners
    this.activePostIdListeners.forEach(listener => listener(postId));
  }

  /**
   * Récupérer l'ID du post actif
   */
  getActivePostId(): string | null {
    return this.activePostId;
  }

  /**
   * Vérifier si un post est le post actif
   */
  isActivePost(postId: string): boolean {
    return this.activePostId === postId;
  }

  /**
   * S'abonner aux changements de post actif
   */
  subscribeToActivePostId(listener: ActivePostListener): () => void {
    this.activePostIdListeners.add(listener);
    return () => this.activePostIdListeners.delete(listener);
  }
}

// Singleton instance
export const videoPlaybackStore = new VideoPlaybackStore();

// Hook React pour utiliser le store
import { useState, useEffect, useCallback } from 'react';

export function useVideoPlaybackSession(videoUrl: string) {
  const [session, setSession] = useState<VideoPlaybackSession | null>(
    () => videoPlaybackStore.getSession(videoUrl)
  );

  useEffect(() => {
    // S'abonner aux changements pour cette vidéo
    const unsubscribe = videoPlaybackStore.subscribe((url, newSession) => {
      if (url === videoUrl) {
        setSession(newSession);
      }
    });

    // Récupérer la session actuelle
    setSession(videoPlaybackStore.getSession(videoUrl));

    return unsubscribe;
  }, [videoUrl]);

  const saveSession = useCallback((positionMillis: number, shouldPlay: boolean) => {
    videoPlaybackStore.saveSession(videoUrl, positionMillis, shouldPlay);
  }, [videoUrl]);

  const clearSession = useCallback(() => {
    videoPlaybackStore.clearSession(videoUrl);
  }, [videoUrl]);

  return { session, saveSession, clearSession };
}

/**
 * Hook pour gérer la vidéo active
 */
export function useActiveVideo() {
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(
    () => videoPlaybackStore.getActiveVideo()
  );

  useEffect(() => {
    const unsubscribe = videoPlaybackStore.subscribeToActiveVideo((url) => {
      setActiveVideoUrl(url);
    });
    return unsubscribe;
  }, []);

  const setActive = useCallback((videoUrl: string | null) => {
    videoPlaybackStore.setActiveVideo(videoUrl);
  }, []);

  const isActive = useCallback((videoUrl: string) => {
    return videoPlaybackStore.isActiveVideo(videoUrl);
  }, []);

  return { activeVideoUrl, setActiveVideo: setActive, isActive };
}

/**
 * Hook pour savoir si une vidéo spécifique est active
 */
export function useIsVideoActive(videoUrl: string) {
  const [isActive, setIsActive] = useState<boolean>(
    () => videoPlaybackStore.isActiveVideo(videoUrl)
  );

  useEffect(() => {
    const unsubscribe = videoPlaybackStore.subscribeToActiveVideo((activeUrl) => {
      setIsActive(activeUrl === videoUrl);
    });
    // Check initial state
    setIsActive(videoPlaybackStore.isActiveVideo(videoUrl));
    return unsubscribe;
  }, [videoUrl]);

  return isActive;
}

/**
 * Hook pour savoir si un post spécifique est le post actif (SOURCE DE VÉRITÉ)
 * Utilisé pour déterminer si les vidéos d'un post doivent jouer
 */
export function useIsPostActive(postId: string) {
  const [isActive, setIsActive] = useState<boolean>(
    () => videoPlaybackStore.isActivePost(postId)
  );

  useEffect(() => {
    const unsubscribe = videoPlaybackStore.subscribeToActivePostId((activeId) => {
      setIsActive(activeId === postId);
    });
    // Check initial state
    setIsActive(videoPlaybackStore.isActivePost(postId));
    return unsubscribe;
  }, [postId]);

  return isActive;
}
