import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config.js';

/** Una sola conexión para toda la app; Socket.io se reconecta por su cuenta. */
export const socket = io(API_URL);

function subscribeToConnection(onChange) {
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);
  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
  };
}

export function useSocketConnected() {
  return useSyncExternalStore(subscribeToConnection, () => socket.connected);
}
