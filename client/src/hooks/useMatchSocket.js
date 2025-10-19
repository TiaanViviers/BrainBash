/**
 * Match-Specific Socket Hook
 * 
 * Manages WebSocket events for a specific match.
 * Handles joining rooms, receiving updates, and sending actions.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSocket } from './useSocket';

/**
 * Custom hook for match-specific WebSocket functionality
 * 
 * @param {number} matchId - Match ID to join
 * @param {number} userId - Current user ID
 * @param {string} token - JWT access token
 * @returns {Object} Match state and action functions
 */
export function useMatchSocket(matchId, userId, token) {
  const { socket, isConnected, error: connectionError } = useSocket(token);
  
  const [matchState, setMatchState] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  const [players, setPlayers] = useState([]);
  const [recentAnswers, setRecentAnswers] = useState([]);
  const [error, setError] = useState(null);

  // Join match room when socket connects
  useEffect(() => {
    if (!socket || !isConnected || !matchId || !userId) return;

    console.log(`🎮 Joining match ${matchId} as user ${userId}`);
    socket.emit('match:join', { matchId, userId });

    // Request initial state
    socket.emit('match:state:request', { matchId });

    // Cleanup: leave room on unmount
    return () => {
      console.log(`👋 Leaving match ${matchId}`);
      socket.emit('match:leave', { matchId, userId });
    };
  }, [socket, isConnected, matchId, userId]);

  // Set up event listeners
  useEffect(() => {
    if (!socket) return;

    // ===================================
    // ROOM EVENTS
    // ===================================
    
    const onMatchJoined = (data) => {
      console.log('✅ Joined match room:', data);
    };

    const onPlayerJoined = (data) => {
      console.log('👥 Player joined:', data.username);
      setPlayers(prev => [...prev, data]);
    };

    const onPlayerLeft = (data) => {
      console.log('👋 Player left:', data.username);
      setPlayers(prev => prev.filter(p => p.userId !== data.userId));
    };

    // ===================================
    // MATCH STATE EVENTS
    // ===================================
    
    const onMatchState = (data) => {
      console.log('📊 Match state update:', data);
      setMatchState(data);
      
      if (data.question) {
        setCurrentQuestion(data.question);
      }
      
      if (data.players) {
        setPlayers(data.players);
      }
    };

    const onMatchStarted = (data) => {
      console.log('🎮 Match started!', data);
      setCurrentQuestion(data.question);
    };

    const onMatchFinished = (data) => {
      console.log('🏁 Match finished!', data);
      console.log('Final scores:', data.finalScores);
      setMatchState(prev => ({ 
        ...prev, 
        status: 'FINISHED', 
        finished: true,
        players: data.finalScores || prev.players // Update players with final scores
      }));
      setScoreboard(data.finalScores);
      setPlayers(data.finalScores || []);
    };

    // ===================================
    // QUESTION EVENTS
    // ===================================
    
    const onQuestionNew = (data) => {
      console.log('❓ New question:', data.questionNumber);
      setCurrentQuestion(data.question);
      setRecentAnswers([]); // Clear previous answers
      
      // Update matchState with new index and total
      setMatchState(prev => ({
        ...prev,
        index: data.questionNumber - 1, // Backend sends 1-based questionNumber, we need 0-based index
        total: data.totalQuestions,
        question: data.question
      }));
    };

    const onQuestionEnded = (data) => {
      console.log('✅ Question ended. Correct answer:', data.correctAnswer);
      console.log('📊 Scoreboard data received:', JSON.stringify(data.scoreboard, null, 2));
      setScoreboard(data.scoreboard);
      
      // Update matchState players with new scores
      if (data.scoreboard) {
        console.log('🔄 Updating matchState.players with:', data.scoreboard);
        setMatchState(prev => {
          console.log('Previous matchState.players:', prev.players);
          return {
            ...prev,
            players: data.scoreboard
          };
        });
        setPlayers(data.scoreboard);
      }
    };

    // ===================================
    // ANSWER EVENTS
    // ===================================
    
    const onAnswerConfirmed = (data) => {
      console.log(`${data.isCorrect ? '✓' : '✗'} Answer confirmed:`, data);
      // Add own answer to recentAnswers since we don't receive answer:received for our own submission
      setRecentAnswers(prev => {
        // Check if already added to avoid duplicates
        const alreadyAdded = prev.some(a => a.userId === userId);
        if (alreadyAdded) return prev;
        
        const updated = [...prev, { 
          userId: userId, 
          username: 'You',
          timestamp: new Date() 
        }];
        console.log('📝 Added own answer. Total answers:', updated.length);
        return updated;
      });
    };

    const onAnswerReceived = (data) => {
      console.log('📝 Player answered:', data.username);
      console.log('📝 Current recentAnswers count:', recentAnswers.length);
      setRecentAnswers(prev => {
        const updated = [...prev, data];
        console.log('📝 Updated recentAnswers count:', updated.length);
        return updated;
      });
    };

    // ===================================
    // SCOREBOARD EVENTS
    // ===================================
    
    const onScoreboardUpdate = (data) => {
      console.log('📊 Scoreboard update:', data);
      setScoreboard(data.players || data);
    };

    // ===================================
    // ERROR EVENTS
    // ===================================
    
    const onError = (data) => {
      console.error('❌ Socket error:', data.message);
      // Don't show error if match is finishing
      if (data.message !== 'Failed to advance question') {
        setError(data.message);
      }
    };

    // Register all event listeners
    socket.on('match:joined', onMatchJoined);
    socket.on('player:joined', onPlayerJoined);
    socket.on('player:left', onPlayerLeft);
    socket.on('match:state', onMatchState);
    socket.on('match:started', onMatchStarted);
    socket.on('match:finished', onMatchFinished);
    socket.on('question:new', onQuestionNew);
    socket.on('question:ended', onQuestionEnded);
    socket.on('answer:confirmed', onAnswerConfirmed);
    socket.on('answer:received', onAnswerReceived);
    socket.on('scoreboard:update', onScoreboardUpdate);
    socket.on('error', onError);

    // Cleanup: remove all listeners
    return () => {
      socket.off('match:joined', onMatchJoined);
      socket.off('player:joined', onPlayerJoined);
      socket.off('player:left', onPlayerLeft);
      socket.off('match:state', onMatchState);
      socket.off('match:started', onMatchStarted);
      socket.off('match:finished', onMatchFinished);
      socket.off('question:new', onQuestionNew);
      socket.off('question:ended', onQuestionEnded);
      socket.off('answer:confirmed', onAnswerConfirmed);
      socket.off('answer:received', onAnswerReceived);
      socket.off('scoreboard:update', onScoreboardUpdate);
      socket.off('error', onError);
    };
  }, [socket]);

  // ===================================
  // ACTION FUNCTIONS
  // ===================================
  
  /**
   * Submit an answer to the current question
   */
  const submitAnswer = useCallback((matchQuestionId, selectedOption, responseTimeMs) => {
    if (!socket || !isConnected) {
      console.error('Cannot submit answer: not connected');
      return;
    }

    console.log('📤 Submitting answer:', selectedOption);
    socket.emit('answer:submit', {
      matchId,
      matchQuestionId,
      selectedOption,
      responseTimeMs
    });
  }, [socket, isConnected, matchId]);

  /**
   * Start the match (host only)
   */
  const startMatch = useCallback(() => {
    if (!socket || !isConnected) {
      console.error('Cannot start match: not connected');
      return;
    }

    console.log('🎮 Starting match...');
    socket.emit('match:start', { matchId });
  }, [socket, isConnected, matchId]);

  /**
   * Advance to next question (host only)
   */
  const advanceQuestion = useCallback(() => {
    if (!socket || !isConnected) {
      console.error('Cannot advance question: not connected');
      return;
    }

    console.log('⏭️ Advancing to next question...');
    socket.emit('question:advance', { matchId });
  }, [socket, isConnected, matchId]);

  /**
   * Request current match state
   */
  const refreshState = useCallback(() => {
    if (!socket || !isConnected) return;
    
    socket.emit('match:state:request', { matchId });
  }, [socket, isConnected, matchId]);

  /**
   * Request current scoreboard
   */
  const refreshScoreboard = useCallback(() => {
    if (!socket || !isConnected) return;
    
    socket.emit('scoreboard:request', { matchId });
  }, [socket, isConnected, matchId]);

  return {
    // Connection state
    isConnected,
    error: error || connectionError,
    socket, // Expose socket for timer and other components
    
    // Match data
    matchState,
    currentQuestion,
    scoreboard,
    players,
    recentAnswers,
    
    // Actions
    submitAnswer,
    startMatch,
    advanceQuestion,
    refreshState,
    refreshScoreboard
  };
}
