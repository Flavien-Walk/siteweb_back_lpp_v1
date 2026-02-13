import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL, getToken } from '../services/api';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { utilisateur } = useAuth();

  useEffect(() => {
    if (!utilisateur) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = getToken();
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    // Gérer la déconnexion forcée (ban/suspension en temps réel)
    newSocket.on('force_disconnect', (data: { reason: string }) => {
      console.warn('[Socket] Force disconnect:', data.reason);
      localStorage.removeItem('lpp_token');
      localStorage.removeItem('lpp_utilisateur');
      window.location.href = '/connexion';
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [utilisateur]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}