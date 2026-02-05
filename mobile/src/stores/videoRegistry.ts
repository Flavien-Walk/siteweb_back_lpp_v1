/**
 * VideoRegistry V2 - Registre centralisé des refs vidéo
 * Garantit qu'une seule vidéo peut jouer à la fois via hard stop + unload fallback
 * Résout le problème de "ghost audio" avec le recyclage FlatList
 *
 * CHANGEMENTS V2:
 * - Promise queue robuste (pas de boolean mutex)
 * - Vérification post-stop avec unloadAsync fallback si ghost détecté
 * - Logs détaillés pour diagnostic
 * - Stockage URI pour debug
 */

import { Video, AVPlaybackStatus } from 'expo-av';
import { videoPlaybackStore } from './videoPlaybackStore';

type VideoRef = Video | null;

interface RegisteredVideo {
  ref: VideoRef;
  postId: string;
  uri: string; // Pour debug
  registeredAt: number;
}

// Délai avant vérification post-stop
const POST_STOP_VERIFY_DELAY_MS = 150;

class VideoRegistry {
  private videos: Map<string, RegisteredVideo> = new Map();
  // Promise queue robuste - pas de boolean, juste la chaîne de Promises
  private stopQueue: Promise<void> = Promise.resolve();

  /**
   * Enregistrer une vidéo (appelé au mount du composant)
   */
  registerVideo(videoId: string, ref: VideoRef, postId: string, uri: string = ''): void {
    this.videos.set(videoId, {
      ref,
      postId,
      uri,
      registeredAt: Date.now()
    });
  }

  /**
   * Mettre à jour la ref d'une vidéo (si elle change)
   */
  updateVideoRef(videoId: string, ref: VideoRef, uri?: string): void {
    const existing = this.videos.get(videoId);
    if (existing) {
      existing.ref = ref;
      if (uri) existing.uri = uri;
    }
  }

  /**
   * Désenregistrer une vidéo (appelé au unmount)
   */
  unregisterVideo(videoId: string): void {
    this.videos.delete(videoId);
  }

  /**
   * Obtenir le status actuel d'une vidéo (pour diagnostic)
   */
  private async getVideoStatus(ref: VideoRef): Promise<AVPlaybackStatus | null> {
    if (!ref) return null;
    try {
      return await ref.getStatusAsync();
    } catch {
      return null;
    }
  }

  /**
   * Hard stop V2 avec vérification et fallback unloadAsync
   */
  private async hardStopVideoV2(videoId: string, registered: RegisteredVideo): Promise<boolean> {
    const { ref } = registered;
    if (!ref) return true;

    // STEP 1: setStatusAsync shouldPlay=false
    try {
      await ref.setStatusAsync({ shouldPlay: false });
    } catch {
      // Ignore errors
    }

    // STEP 2: stopAsync
    try {
      await ref.stopAsync();
    } catch {
      // Ignore errors
    }

    // STEP 3: Attendre puis vérifier
    await new Promise(resolve => setTimeout(resolve, POST_STOP_VERIFY_DELAY_MS));

    const statusAfter = await this.getVideoStatus(ref);

    // STEP 4: Ghost detection - si toujours en lecture, forcer unload
    if (statusAfter && statusAfter.isLoaded && statusAfter.isPlaying) {
      try {
        await ref.unloadAsync();
        const statusFinal = await this.getVideoStatus(ref);
        if (statusFinal && statusFinal.isLoaded && statusFinal.isPlaying) {
          return false;
        }
      } catch {
        // Ignore errors
      }
    }

    return true;
  }

  /**
   * Stopper toutes les vidéos SAUF celles du post actif
   */
  async stopAllExcept(activePostId: string | null): Promise<void> {
    this.stopQueue = this.stopQueue.then(async () => {
      const videosToStop: Array<[string, RegisteredVideo]> = [];

      for (const [videoId, registered] of this.videos.entries()) {
        if (registered.postId !== activePostId) {
          videosToStop.push([videoId, registered]);
        }
      }

      if (videosToStop.length === 0) return;

      await Promise.all(
        videosToStop.map(([videoId, registered]) =>
          this.hardStopVideoV2(videoId, registered)
        )
      );
    });

    return this.stopQueue;
  }

  /**
   * Stopper toutes les vidéos (utilisé pour navigation/background)
   */
  async stopAll(): Promise<void> {
    return this.stopAllExcept(null);
  }

  /**
   * Hard stop et unregister une vidéo spécifique (pour unmount)
   */
  async stopAndUnregister(videoId: string): Promise<void> {
    const registered = this.videos.get(videoId);
    if (registered) {
      await this.hardStopVideoV2(videoId, registered);
      this.unregisterVideo(videoId);
    }
  }

  /**
   * Vérifier si une vidéo est enregistrée
   */
  isRegistered(videoId: string): boolean {
    return this.videos.has(videoId);
  }

  /**
   * Obtenir le nombre de vidéos enregistrées (pour debug)
   */
  getRegisteredCount(): number {
    return this.videos.size;
  }

  /**
   * Obtenir les IDs des vidéos enregistrées (pour debug)
   */
  getRegisteredIds(): string[] {
    return Array.from(this.videos.keys());
  }

  /**
   * Debug: Obtenir l'état complet du registry
   */
  async getDebugState(): Promise<{
    count: number;
    videos: Array<{
      videoId: string;
      postId: string;
      uri: string;
      isPlaying: boolean | null;
      isLoaded: boolean | null;
    }>;
  }> {
    const videos: Array<{
      videoId: string;
      postId: string;
      uri: string;
      isPlaying: boolean | null;
      isLoaded: boolean | null;
    }> = [];

    for (const [videoId, registered] of this.videos.entries()) {
      const status = await this.getVideoStatus(registered.ref);
      videos.push({
        videoId,
        postId: registered.postId,
        uri: registered.uri,
        isPlaying: status?.isLoaded ? status.isPlaying : null,
        isLoaded: status?.isLoaded ?? null,
      });
    }

    return {
      count: this.videos.size,
      videos,
    };
  }

  /**
   * DEBUG: Log complet de l'état de toutes les vidéos enregistrées
   * Appelé pour diagnostiquer le ghost audio
   */
  async logAllVideoStates(): Promise<void> {
    console.log('\n========== [VideoRegistry] DEBUG STATE ==========');
    console.log(`Total registered videos: ${this.videos.size}`);
    console.log(`Active Post ID in store: ${videoPlaybackStore.getActivePostId()}`);
    console.log(`Active Video URL in store: ${videoPlaybackStore.getActiveVideo()}`);

    let playingCount = 0;
    for (const [videoId, registered] of this.videos.entries()) {
      const status = await this.getVideoStatus(registered.ref);
      const isPlaying = status?.isLoaded && status.isPlaying;
      if (isPlaying) playingCount++;

      console.log(`[${videoId}] postId=${registered.postId}`);
      console.log(`  → isLoaded=${status?.isLoaded ?? 'N/A'}`);
      console.log(`  → isPlaying=${status?.isLoaded ? status.isPlaying : 'N/A'}`);
      console.log(`  → position=${status?.isLoaded ? status.positionMillis : 'N/A'}ms`);
      console.log(`  → uri=${registered.uri.substring(0, 50)}...`);
    }

    console.log(`\n⚠️ PLAYING COUNT: ${playingCount} video(s) currently playing`);
    if (playingCount > 1) {
      console.error('❌ GHOST AUDIO DETECTED: More than 1 video is playing!');
    } else if (playingCount === 1) {
      console.log('✅ Single video playing - normal');
    } else {
      console.log('✅ No videos playing');
    }
    console.log('==================================================\n');
  }

  /**
   * Forcer le stop de toutes les vidéos qui sont encore en lecture
   */
  async forceStopAllPlaying(): Promise<number> {
    let stoppedCount = 0;

    for (const [videoId, registered] of this.videos.entries()) {
      const status = await this.getVideoStatus(registered.ref);
      if (status?.isLoaded && status.isPlaying) {
        await this.hardStopVideoV2(videoId, registered);
        stoppedCount++;
      }
    }

    return stoppedCount;
  }
}

// Singleton instance
export const videoRegistry = new VideoRegistry();

// Hook pour utiliser le registry dans les composants
import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook pour enregistrer une vidéo dans le registry
 * Gère automatiquement register/unregister et hard stop au unmount
 */
export function useVideoRegistry(
  videoId: string,
  postId: string,
  videoRef: React.RefObject<Video>,
  uri: string = ''
) {
  const isRegisteredRef = useRef(false);

  // Enregistrer au mount
  useEffect(() => {
    if (videoRef.current && !isRegisteredRef.current) {
      videoRegistry.registerVideo(videoId, videoRef.current, postId, uri);
      isRegisteredRef.current = true;
    }

    // Cleanup: hard stop + unregister au unmount
    return () => {
      if (isRegisteredRef.current) {
        videoRegistry.stopAndUnregister(videoId).catch(() => {});
        isRegisteredRef.current = false;
      }
    };
  }, [videoId, postId, uri]);

  // Mettre à jour la ref si elle change
  useEffect(() => {
    if (isRegisteredRef.current && videoRef.current) {
      videoRegistry.updateVideoRef(videoId, videoRef.current, uri);
    }
  }, [videoId, videoRef.current, uri]);

  // Exposer une fonction pour forcer le stop de cette vidéo
  const forceStop = useCallback(async () => {
    const registered = videoRegistry.isRegistered(videoId);
    if (registered) {
      await videoRegistry.stopAndUnregister(videoId);
    }
  }, [videoId]);

  return { forceStop };
}
