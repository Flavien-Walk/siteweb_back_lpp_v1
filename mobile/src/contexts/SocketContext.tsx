/**
 * SocketContext - Gestion temps reel avec Socket.io
 *
 * Fonctionnalites:
 * - Connexion/deconnexion automatique selon l'etat d'authentification
 * - Gestion de l'AppState (deconnexion en background, reconnexion au foreground)
 * - Events pour messages, notifications, demandes d'amis
 * - Fallback sur polling si WebSocket echoue
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constantes/config';
import { getTokenSync } from '../services/api';

// Types pour les events socket
export interface MessageSocketEvent {
  conversationId: string;
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
  };
}

export interface NotificationSocketEvent {
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

export interface DemandeAmiSocketEvent {
  _id: string;
  type: 'received' | 'accepted' | 'rejected';
  utilisateur: {
    _id: string;
    prenom: string;
    nom: string;
    avatar?: string;
  };
}

export interface TypingSocketEvent {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface UnreadCountsEvent {
  messages: number;
  notifications: number;
  demandesAmis: number;
}

// Interface du contexte
interface SocketContextType {
  isConnected: boolean;
  socket: Socket | null;
  // Compteurs non-lus
  unreadMessages: number;
  unreadNotifications: number;
  unreadDemandesAmis: number;
  // Actions
  connect: () => void;
  disconnect: () => void;
  // Listeners
  onNewMessage: (callback: (event: MessageSocketEvent) => void) => () => void;
  onNewNotification: (callback: (event: NotificationSocketEvent) => void) => () => void;
  onDemandeAmi: (callback: (event: DemandeAmiSocketEvent) => void) => () => void;
  onTyping: (callback: (event: TypingSocketEvent) => void) => () => void;
  // Emitters
  emitTyping: (conversationId: string, isTyping: boolean) => void;
  emitMessageRead: (conversationId: string, messageId: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  // Refresh counts
  refreshUnreadCounts: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
  userId: string | null;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, userId }) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadDemandesAmis, setUnreadDemandesAmis] = useState(0);
  const appStateRef = useRef(AppState.currentState);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs pour stocker les callbacks des composants (permet de les appeler meme si socket connecte apres)
  const messageCallbacksRef = useRef<Set<(event: MessageSocketEvent) => void>>(new Set());
  const notificationCallbacksRef = useRef<Set<(event: NotificationSocketEvent) => void>>(new Set());
  const demandeAmiCallbacksRef = useRef<Set<(event: DemandeAmiSocketEvent) => void>>(new Set());
  const typingCallbacksRef = useRef<Set<(event: TypingSocketEvent) => void>>(new Set());

  // Connexion au socket
  const connect = useCallback(() => {
    if (!userId) {
      if (__DEV__) console.log('[SOCKET] Pas de userId, connexion ignoree');
      return;
    }

    const token = getTokenSync();
    if (!token) {
      if (__DEV__) console.log('[SOCKET] Pas de token, connexion ignoree');
      return;
    }

    // Deconnexion existante si necessaire
    if (socketRef.current?.connected) {
      if (__DEV__) console.log('[SOCKET] Deja connecte, skip');
      return;
    }

    if (__DEV__) console.log('[SOCKET] Connexion en cours...');

    socketRef.current = io(SOCKET_URL, {
      auth: { token, userId },
      transports: ['websocket', 'polling'], // WebSocket prioritaire, polling en fallback
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Event handlers
    socketRef.current.on('connect', () => {
      if (__DEV__) console.log('[SOCKET] Connecte! ID:', socketRef.current?.id);
      setIsConnected(true);

      // Demander les compteurs initiaux
      socketRef.current?.emit('get_unread_counts');
    });

    socketRef.current.on('disconnect', (reason) => {
      if (__DEV__) console.log('[SOCKET] Deconnecte:', reason);
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      if (__DEV__) console.log('[SOCKET] Erreur connexion:', error.message);
      setIsConnected(false);
    });

    // Compteurs non-lus
    socketRef.current.on('unread_counts', (data: UnreadCountsEvent) => {
      if (__DEV__) console.log('[SOCKET] Compteurs recus:', data);
      setUnreadMessages(data.messages || 0);
      setUnreadNotifications(data.notifications || 0);
      setUnreadDemandesAmis(data.demandesAmis || 0);
    });

    // Nouveaux messages - update du compteur + appeler les callbacks des composants
    socketRef.current.on('new_message', (event: MessageSocketEvent) => {
      if (__DEV__) console.log('[SOCKET] new_message recu:', event?.conversationId, event?.message?._id);
      setUnreadMessages((prev) => prev + 1);
      // Appeler tous les callbacks enregistres
      messageCallbacksRef.current.forEach((callback) => {
        try {
          callback(event);
        } catch (e) {
          console.error('[SOCKET] Erreur callback new_message:', e);
        }
      });
    });

    // Nouvelles notifications - update du compteur + appeler les callbacks
    socketRef.current.on('new_notification', (event: NotificationSocketEvent) => {
      if (__DEV__) console.log('[SOCKET] new_notification recu:', event?.type, event?._id);
      setUnreadNotifications((prev) => prev + 1);
      // Appeler tous les callbacks enregistres
      notificationCallbacksRef.current.forEach((callback) => {
        try {
          callback(event);
        } catch (e) {
          console.error('[SOCKET] Erreur callback new_notification:', e);
        }
      });
    });

    // Nouvelles demandes d'amis - update du compteur + appeler les callbacks
    socketRef.current.on('demande_ami', (event: DemandeAmiSocketEvent) => {
      if (__DEV__) console.log('[SOCKET] demande_ami recu:', event?.type, event?.utilisateur?._id);
      if (event.type === 'received') {
        setUnreadDemandesAmis((prev) => prev + 1);
      }
      // Appeler tous les callbacks enregistres
      demandeAmiCallbacksRef.current.forEach((callback) => {
        try {
          callback(event);
        } catch (e) {
          console.error('[SOCKET] Erreur callback demande_ami:', e);
        }
      });
    });

    // Typing events - appeler les callbacks
    socketRef.current.on('typing', (event: TypingSocketEvent) => {
      if (__DEV__) console.log('[SOCKET] typing recu:', event?.conversationId, event?.isTyping);
      typingCallbacksRef.current.forEach((callback) => {
        try {
          callback(event);
        } catch (e) {
          console.error('[SOCKET] Erreur callback typing:', e);
        }
      });
    });

  }, [userId]);

  // Deconnexion du socket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      if (__DEV__) console.log('[SOCKET] Deconnexion...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Gestion de l'AppState
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // Retour au foreground - reconnecter
        if (__DEV__) console.log('[SOCKET] App au foreground, reconnexion...');
        if (userId && !socketRef.current?.connected) {
          connect();
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // Passage en background - garder la connexion mais en mode economie
        if (__DEV__) console.log('[SOCKET] App en background');
        // On ne deconnecte pas pour garder les notifs push
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [userId, connect]);

  // Connexion/deconnexion selon userId
  useEffect(() => {
    if (userId) {
      connect();
    } else {
      disconnect();
    }

    return () => disconnect();
  }, [userId, connect, disconnect]);

  // Listener pour nouveaux messages - utilise les refs pour garantir que les callbacks fonctionnent
  // meme si le socket se connecte apres l'enregistrement du callback
  const onNewMessage = useCallback((callback: (event: MessageSocketEvent) => void) => {
    if (__DEV__) console.log('[SOCKET] Enregistrement callback onNewMessage');
    messageCallbacksRef.current.add(callback);
    return () => {
      if (__DEV__) console.log('[SOCKET] Desenregistrement callback onNewMessage');
      messageCallbacksRef.current.delete(callback);
    };
  }, []);

  // Listener pour nouvelles notifications
  const onNewNotification = useCallback((callback: (event: NotificationSocketEvent) => void) => {
    if (__DEV__) console.log('[SOCKET] Enregistrement callback onNewNotification');
    notificationCallbacksRef.current.add(callback);
    return () => {
      notificationCallbacksRef.current.delete(callback);
    };
  }, []);

  // Listener pour demandes d'amis
  const onDemandeAmi = useCallback((callback: (event: DemandeAmiSocketEvent) => void) => {
    if (__DEV__) console.log('[SOCKET] Enregistrement callback onDemandeAmi');
    demandeAmiCallbacksRef.current.add(callback);
    return () => {
      demandeAmiCallbacksRef.current.delete(callback);
    };
  }, []);

  // Listener pour typing
  const onTyping = useCallback((callback: (event: TypingSocketEvent) => void) => {
    typingCallbacksRef.current.add(callback);
    return () => {
      typingCallbacksRef.current.delete(callback);
    };
  }, []);

  // Emettre typing event
  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { conversationId, isTyping });
  }, []);

  // Emettre message lu
  const emitMessageRead = useCallback((conversationId: string, messageId: string) => {
    socketRef.current?.emit('message_read', { conversationId, messageId });
    // Decrementer le compteur
    setUnreadMessages((prev) => Math.max(0, prev - 1));
  }, []);

  // Rejoindre une conversation (pour recevoir les messages en temps reel)
  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current?.connected) {
      if (__DEV__) console.log('[SOCKET] Impossible de rejoindre conversation (socket non connecte):', conversationId);
      return;
    }
    if (__DEV__) console.log('[SOCKET] Rejoindre conversation:', conversationId, 'socket:', socketRef.current.id);
    socketRef.current.emit('join_conversation', { conversationId });
  }, []);

  // Quitter une conversation
  const leaveConversation = useCallback((conversationId: string) => {
    if (__DEV__) console.log('[SOCKET] Quitter conversation:', conversationId);
    socketRef.current?.emit('leave_conversation', { conversationId });
  }, []);

  // Rafraichir les compteurs
  const refreshUnreadCounts = useCallback(() => {
    socketRef.current?.emit('get_unread_counts');
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<SocketContextType>(() => ({
    isConnected,
    socket: socketRef.current,
    unreadMessages,
    unreadNotifications,
    unreadDemandesAmis,
    connect,
    disconnect,
    onNewMessage,
    onNewNotification,
    onDemandeAmi,
    onTyping,
    emitTyping,
    emitMessageRead,
    joinConversation,
    leaveConversation,
    refreshUnreadCounts,
  }), [
    isConnected,
    unreadMessages,
    unreadNotifications,
    unreadDemandesAmis,
    connect,
    disconnect,
    onNewMessage,
    onNewNotification,
    onDemandeAmi,
    onTyping,
    emitTyping,
    emitMessageRead,
    joinConversation,
    leaveConversation,
    refreshUnreadCounts,
  ]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook pour utiliser le contexte socket
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket doit etre utilise dans un SocketProvider');
  }
  return context;
};

// Hook optionnel qui ne throw pas si pas de provider (pour composants qui peuvent etre hors contexte)
export const useSocketOptional = (): SocketContextType | null => {
  return useContext(SocketContext) || null;
};

export default SocketContext;
