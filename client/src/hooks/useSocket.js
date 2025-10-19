/**
 * Base Socket.io Hook
 * 
 * Manages the WebSocket connection to the server.
 * Handles authentication, connection state, and reconnection.
 */

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Custom hook to manage Socket.io connection
 * 
 * @param {string} token - JWT access token for authentication
 * @returns {Object} { socket, isConnected, error }
 */
export function useSocket(token) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Don't connect if no token
    if (!token) {
      setIsConnected(false);
      return;
    }

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    socket.on('error', (err) => {
      console.error('WebSocket error:', err);
      setError(err.message || 'Socket error occurred');
    });

    // Cleanup on unmount
    return () => {
      console.log('🔌 Disconnecting WebSocket');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return {
    socket: socketRef.current,
    isConnected,
    error
  };
}
