/**
 * Match Event Handlers
 * 
 * Handles all WebSocket events related to match gameplay:
 * - Joining/leaving matches
 * - Submitting answers
 * - Advancing questions (host only)
 * - Starting matches (host only)
 */

import { PrismaClient } from '../generated/prisma/index.js';
import { getPublicState, getScoreboard, nextQuestion, submitAnswer } from '../match/service.js';
import { broadcastToMatch, handleJoinMatch, handleLeaveMatch } from './matchRooms.js';
import { startQuestionTimer, stopQuestionTimer } from './timer.js';

const prisma = new PrismaClient();

/**
 * Set up all match-related event handlers for a socket
 * 
 * @param {Server} io - Socket.io server instance
 * @param {Socket} socket - Client socket
 */
export function handleMatchEvents(io, socket) {
  
  // ===================================
  // ROOM MANAGEMENT
  // ===================================
  
  /**
   * Join a match room
   * Event: match:join
   * Data: { matchId, userId }
   */
  socket.on('match:join', async (data) => {
    await handleJoinMatch(io, socket, data);
  });

  /**
   * Leave a match room
   * Event: match:leave
   * Data: { matchId, userId }
   */
  socket.on('match:leave', async (data) => {
    await handleLeaveMatch(io, socket, data);
  });

  // ===================================
  // MATCH CONTROL (HOST ONLY)
  // ===================================
  
  /**
   * Start a match
   * Event: match:start
   * Data: { matchId }
   */
  socket.on('match:start', async (data) => {
    try {
      const { matchId } = data;

      // Verify user is the host
      const match = await prisma.matches.findUnique({
        where: { match_id: matchId }
      });

      if (!match) {
        socket.emit('error', { message: 'Match not found' });
        return;
      }

      if (match.host_id !== socket.userId) {
        socket.emit('error', { message: 'Only the host can start the match' });
        return;
      }

      // Update match status
      await prisma.matches.update({
        where: { match_id: matchId },
        data: { 
          status: 'ONGOING',
          start_time: new Date()
        }
      });

      // Get first question
      const state = await getPublicState(matchId);

      // Broadcast to all players
      broadcastToMatch(io, matchId, 'match:started', {
        matchId,
        startTime: new Date(),
        question: state.question,
        totalQuestions: state.total
      });

      // Start timer for first question (20 seconds per spec)
      if (state.question) {
        startQuestionTimer(io, matchId, state.question.id, 20);
      }

    } catch (error) {
      console.error('Error starting match:', error);
      socket.emit('error', { message: 'Failed to start match' });
    }
  });

  /**
   * Match deleted by host
   * Event: match:deleted
   * Data: { matchId }
   */
  socket.on('match:deleted', async (data) => {
    try {
      const { matchId } = data;


      // Broadcast to all players in the match room
      broadcastToMatch(io, matchId, 'match:deleted', {
        matchId,
        message: 'This match has been deleted by the host'
      });

      // Stop any running timers
      stopQuestionTimer(matchId);

    } catch (error) {
      console.error('Error handling match deletion:', error);
      socket.emit('error', { message: 'Failed to process match deletion' });
    }
  });

  /**
   * Advance to next question
   * Event: question:advance
   * Data: { matchId }
   */
  socket.on('question:advance', async (data) => {
    try {
      const { matchId } = data;

      // Verify user is the host
      const match = await prisma.matches.findUnique({
        where: { match_id: matchId }
      });

      if (!match) {
        socket.emit('error', { message: 'Match not found' });
        return;
      }

      if (match.host_id !== socket.userId) {
        socket.emit('error', { message: 'Only the host can advance questions' });
        return;
      }

      // Advance question
      const result = await nextQuestion(matchId);

      // Stop current timer
      stopQuestionTimer(matchId);

      if (result.finished) {
        // Match is finished
        const scoreboard = await getScoreboard(matchId);
        
        broadcastToMatch(io, matchId, 'match:finished', {
          matchId,
          finalScores: scoreboard.scores,
          winner: scoreboard.scores[0], // Top scorer
          timestamp: new Date()
        });

      } else {
        // Get new question
        const state = await getPublicState(matchId);

        broadcastToMatch(io, matchId, 'question:new', {
          matchId,
          questionNumber: state.index + 1,
          totalQuestions: state.total,
          question: state.question,
          timestamp: new Date()
        });

        // Start timer for new question (20 seconds per spec)
        if (state.question) {
          startQuestionTimer(io, matchId, state.question.id, 20);
        }

      }

    } catch (error) {
      console.error('Error advancing question:', error);
      socket.emit('error', { message: 'Failed to advance question' });
    }
  });

  // ===================================
  // GAMEPLAY
  // ===================================
  
  /**
   * Submit an answer
   * Event: answer:submit
   * Data: { matchId, matchQuestionId, selectedOption, responseTimeMs }
   */
  socket.on('answer:submit', async (data) => {
    try {
      const { matchId, matchQuestionId, selectedOption, responseTimeMs } = data;

      // Submit answer via service
      const result = await submitAnswer(matchId, {
        userId: socket.userId,
        matchQuestionId,
        selectedOption,
        responseTimeMs
      });

      // Confirm to the player who submitted
      socket.emit('answer:confirmed', {
        matchId,
        isCorrect: result.isCorrect,
        points: result.points,
        timestamp: new Date()
      });

      // Notify other players someone answered (without revealing if correct)
      socket.to(`match:${matchId}`).emit('answer:received', {
        userId: socket.userId,
        username: socket.username,
        timestamp: new Date()
      });


      // Check if all players have answered
      const allAnswered = await checkAllPlayersAnswered(matchId, matchQuestionId);
      
      if (allAnswered) {
        // Everyone answered - reveal correct answer and scores
        const match = await prisma.matches.findUnique({
          where: { match_id: matchId },
          include: {
            match_questions: {
              where: { match_question_id: matchQuestionId }
            }
          }
        });

        const correctAnswer = match.match_questions[0].correct_option;
        const scoreboard = await getScoreboard(matchId);

        broadcastToMatch(io, matchId, 'question:ended', {
          matchId,
          correctAnswer,
          scoreboard: scoreboard.scores,
          allAnswered: true,
          timestamp: new Date()
        });

      }

    } catch (error) {
      console.error('Error submitting answer:', error);
      socket.emit('error', { message: error.message || 'Failed to submit answer' });
    }
  });

  // ===================================
  // STATE QUERIES
  // ===================================
  
  /**
   * Request current match state
   * Event: match:state:request
   * Data: { matchId }
   */
  socket.on('match:state:request', async (data) => {
    try {
      const { matchId } = data;
      const state = await getPublicState(matchId);
      
      socket.emit('match:state', state);
    } catch (error) {
      console.error('Error fetching match state:', error);
      socket.emit('error', { message: 'Failed to fetch match state' });
    }
  });

  /**
   * Request current scoreboard
   * Event: scoreboard:request
   * Data: { matchId }
   */
  socket.on('scoreboard:request', async (data) => {
    try {
      const { matchId } = data;
      const scoreboard = await getScoreboard(matchId);
      
      socket.emit('scoreboard:update', scoreboard);
    } catch (error) {
      console.error('Error fetching scoreboard:', error);
      socket.emit('error', { message: 'Failed to fetch scoreboard' });
    }
  });
}

/**
 * Check if all players have answered the current question
 * 
 * @param {number} matchId 
 * @param {number} matchQuestionId 
 * @returns {Promise<boolean>}
 */
async function checkAllPlayersAnswered(matchId, matchQuestionId) {
  const match = await prisma.matches.findUnique({
    where: { match_id: matchId },
    include: {
      match_players: true
    }
  });

  // player_answers table doesn't have match_id, only match_question_id
  const answers = await prisma.player_answers.findMany({
    where: {
      match_question_id: matchQuestionId
    }
  });

  return answers.length === match.match_players.length;
}
