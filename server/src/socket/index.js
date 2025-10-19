/**
 * WebSocket Server Initialization
 * 
 * Sets up Socket.io for real-time bidirectional communication.
 * Handles connection, authentication, and routes events to handlers.
 */

import { Server } from 'socket.io';
import { verifyAccessToken } from '../auth/service.js';
import { handleMatchEvents } from './matchEvents.js';

/**
 * Initialize Socket.io server with Express HTTP server
 * 
 * @param {http.Server} httpServer - Express HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    },
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000
  });


  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = verifyAccessToken(token);
      
      if (!decoded) {
        return next(new Error('Invalid or expired token'));
      }

      // Attach user info to socket
      socket.userId = decoded.id;
      socket.username = decoded.username;
      socket.role = decoded.role;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {

    // Set up match-related event handlers
    handleMatchEvents(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.username}:`, error);
    });
  });

  return io;
}
