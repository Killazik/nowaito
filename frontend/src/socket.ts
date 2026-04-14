import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const resolveSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:3000`;
  return 'http://localhost:3000';
};

export const getSocket = (token: string) => {
  if (socket?.connected) return socket;
  socket = io(resolveSocketUrl(), {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  return socket;
};

