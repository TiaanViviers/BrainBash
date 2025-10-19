/**
 * Server-Side Timer Management
 * 
 * Controls question timers and broadcasts to all players.
 * Ensures all players see the same countdown (synchronized).
 */

import { broadcastToMatch } from './matchRooms.js';

// Active timers: matchId -> { interval, timeRemaining, matchQuestionId }
const activeTimers = new Map();

// Default timer duration (in seconds)
const DEFAULT_QUESTION_TIME = 20;

/**
 * Start a timer for a question
 * 
 * @param {Server} io - Socket.io server instance
 * @param {number} matchId - Match ID
 * @param {number} matchQuestionId - Question ID
 * @param {number} duration - Duration in seconds (default: 20)
 */
export function startQuestionTimer(io, matchId, matchQuestionId, duration = DEFAULT_QUESTION_TIME) {
  // Stop any existing timer for this match
  stopQuestionTimer(matchId);

  let timeRemaining = duration;
  

  // Initial broadcast
  broadcastToMatch(io, matchId, 'timer:start', {
    matchId,
    matchQuestionId,
    duration,
    timeRemaining,
    serverTime: Date.now()
  });

  // Create interval that ticks every second
  const interval = setInterval(() => {
    timeRemaining--;

    // Broadcast tick to all players
    broadcastToMatch(io, matchId, 'timer:tick', {
      matchId,
      matchQuestionId,
      timeRemaining,
      serverTime: Date.now()
    });


    // Timer expired
    if (timeRemaining <= 0) {
      stopQuestionTimer(matchId);
      handleTimerExpired(io, matchId, matchQuestionId);
    }
  }, 1000); // Tick every 1 second

  // Store timer reference
  activeTimers.set(matchId, {
    interval,
    timeRemaining,
    matchQuestionId,
    duration
  });
}

/**
 * Stop the timer for a match
 * 
 * @param {number} matchId - Match ID
 */
export function stopQuestionTimer(matchId) {
  const timer = activeTimers.get(matchId);
  
  if (timer) {
    clearInterval(timer.interval);
    activeTimers.delete(matchId);
  }
}

/**
 * Pause the timer (for future use - e.g., host pauses match)
 * 
 * @param {Server} io - Socket.io server
 * @param {number} matchId - Match ID
 */
export function pauseQuestionTimer(io, matchId) {
  const timer = activeTimers.get(matchId);
  
  if (timer) {
    clearInterval(timer.interval);
    
    broadcastToMatch(io, matchId, 'timer:paused', {
      matchId,
      timeRemaining: timer.timeRemaining
    });
    
  }
}

/**
 * Resume a paused timer (for future use)
 * 
 * @param {Server} io - Socket.io server
 * @param {number} matchId - Match ID
 */
export function resumeQuestionTimer(io, matchId) {
  const timer = activeTimers.get(matchId);
  
  if (timer && !timer.interval) {
    startQuestionTimer(io, matchId, timer.matchQuestionId, timer.timeRemaining);
  }
}

/**
 * Get time remaining for a match
 * 
 * @param {number} matchId - Match ID
 * @returns {number|null} Time remaining in seconds, or null if no timer
 */
export function getTimeRemaining(matchId) {
  const timer = activeTimers.get(matchId);
  return timer ? timer.timeRemaining : null;
}

/**
 * Check if a timer is active for a match
 * 
 * @param {number} matchId - Match ID
 * @returns {boolean}
 */
export function isTimerActive(matchId) {
  return activeTimers.has(matchId);
}

/**
 * Handle timer expiration
 * Called when countdown reaches 0
 * 
 * @param {Server} io - Socket.io server
 * @param {number} matchId - Match ID
 * @param {number} matchQuestionId - Question ID
 */
async function handleTimerExpired(io, matchId, matchQuestionId) {

  // Import here to avoid circular dependency
  const { PrismaClient } = await import('../generated/prisma/index.js');
  const prisma = new PrismaClient();

  try {
    // Record skip answers for players who didn't answer
    const matchPlayers = await prisma.match_players.findMany({
      where: { match_id: matchId },
      select: { user_id: true }
    });

    const existingAnswers = await prisma.player_answers.findMany({
      where: { match_question_id: matchQuestionId },
      select: { user_id: true }
    });

    const answeredUserIds = existingAnswers.map(a => a.user_id);
    const unansweredPlayers = matchPlayers.filter(p => !answeredUserIds.includes(p.user_id));

    // Create "skip" answers for players who didn't answer (0 points, is_correct: false)
    if (unansweredPlayers.length > 0) {
      await prisma.player_answers.createMany({
        data: unansweredPlayers.map(p => ({
          match_question_id: matchQuestionId,
          user_id: p.user_id,
          selected_option: null, // No answer selected
          is_correct: false,
          points_awarded: 0,
          response_time_ms: 20000 // Max time (20 seconds in milliseconds)
        }))
      });

    }
  } catch (error) {
    console.error('Error creating skip answers:', error);
  }

  // Notify all players that time is up
  broadcastToMatch(io, matchId, 'timer:expired', {
    matchId,
    matchQuestionId,
    message: 'Time is up!',
    timestamp: Date.now()
  });

  // Import here to avoid circular dependency
  const { nextQuestion, getScoreboard } = await import('../match/service.js');

  // Wait a moment to let players see "time's up"
  setTimeout(async () => {
    try {
      // Get and broadcast current scoreboard before advancing
      const scoreboard = await getScoreboard(matchId);
      
      broadcastToMatch(io, matchId, 'question:ended', {
        matchId,
        correctAnswer: null, // Timer expired, no correct answer to show
        scoreboard: scoreboard.scores,
        timeExpired: true,
        timestamp: new Date()
      });


      // Auto-advance to next question
      const result = await nextQuestion(matchId);

      if (result.finished) {
        // Match is finished
        broadcastToMatch(io, matchId, 'match:finished', {
          matchId,
          finalScores: scoreboard.scores,
          winner: scoreboard.scores[0],
          timestamp: new Date()
        });

      } else {
        // Get next question from service
        const { getPublicState } = await import('../match/service.js');
        const state = await getPublicState(matchId);

        broadcastToMatch(io, matchId, 'question:new', {
          matchId,
          questionNumber: state.index + 1,
          totalQuestions: state.total,
          question: state.question,
          autoAdvanced: true,
          timestamp: new Date()
        });

        // Start timer for new question
        startQuestionTimer(io, matchId, state.question.id, DEFAULT_QUESTION_TIME);

      }
    } catch (error) {
      console.error(`Error auto-advancing match ${matchId}:`, error);
      broadcastToMatch(io, matchId, 'error', {
        message: 'Failed to advance to next question'
      });
    }
  }, 3000);
}

/**
 * Clean up all timers (call on server shutdown)
 */
export function cleanupAllTimers() {
  for (const [matchId, timer] of activeTimers.entries()) {
    clearInterval(timer.interval);
  }
  activeTimers.clear();
}
