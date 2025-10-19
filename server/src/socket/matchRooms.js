/**
 * Match Room Management
 * 
 * Handles players joining/leaving match rooms.
 * Each match is a Socket.io room where all players receive broadcast updates.
 */

import { PrismaClient } from '../generated/prisma/index.js';
import * as matchService from '../match/service.js';

const prisma = new PrismaClient();

/**
 * Handle player joining a match room
 * 
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Client socket
 * @param {Object} data - { matchId, userId }
 */
export async function handleJoinMatch(io, socket, data) {
  try {
    const { matchId, userId } = data;

    // Validate match exists
    const match = await prisma.matches.findUnique({
      where: { match_id: matchId },
      include: {
        match_players: {
          include: {
            user: {
              select: {
                user_id: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!match) {
      socket.emit('error', { message: 'Match not found' });
      return;
    }

    // Verify user is a player in this match
    const isPlayer = match.match_players.some(p => p.user_id === userId);
    
    if (!isPlayer) {
      socket.emit('error', { message: 'You are not a player in this match' });
      return;
    }

    // Join the match room
    const roomName = `match:${matchId}`;
    socket.join(roomName);

    // Notify user they successfully joined
    socket.emit('match:joined', {
      matchId,
      roomName,
      playerCount: match.match_players.length
    });

    // Notify other players in the room
    socket.to(roomName).emit('player:joined', {
      userId: socket.userId,
      username: socket.username,
      timestamp: new Date()
    });

    // Send current match state to the joining player using the full public state
    const publicState = await matchService.getPublicState(matchId);
    socket.emit('match:state', publicState);

  } catch (error) {
    console.error('Error joining match:', error);
    socket.emit('error', { message: 'Failed to join match' });
  }
}

/**
 * Handle player leaving a match room
 * 
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Client socket
 * @param {Object} data - { matchId, userId }
 */
export async function handleLeaveMatch(io, socket, data) {
  try {
    const { matchId, userId } = data;
    const roomName = `match:${matchId}`;

    // Leave the room
    socket.leave(roomName);

    // Notify others in the room
    socket.to(roomName).emit('player:left', {
      userId,
      username: socket.username,
      timestamp: new Date()
    });

    // Confirm to the user
    socket.emit('match:left', {
      matchId,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error leaving match:', error);
    socket.emit('error', { message: 'Failed to leave match' });
  }
}

/**
 * Get active players in a match room
 * 
 * @param {Server} io - Socket.io server instance
 * @param {number} matchId - Match ID
 * @returns {Promise<number>} Number of connected players
 */
export async function getActivePlayersInMatch(io, matchId) {
  const roomName = `match:${matchId}`;
  const sockets = await io.in(roomName).fetchSockets();
  return sockets.length;
}

/**
 * Broadcast to all players in a match
 * 
 * @param {Server} io - Socket.io server instance
 * @param {number} matchId - Match ID
 * @param {string} event - Event name
 * @param {Object} data - Data to send
 */
export function broadcastToMatch(io, matchId, event, data) {
  const roomName = `match:${matchId}`;
  io.to(roomName).emit(event, data);
}
