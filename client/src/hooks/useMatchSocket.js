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

    socket.emit('match:join', { matchId, userId });

    // Request initial state
    socket.emit('match:state:request', { matchId });

    // Cleanup: leave room on unmount
    return () => {
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
    };

    const onPlayerJoined = (data) => {
      setPlayers(prev => [...prev, data]);
    };

    const onPlayerLeft = (data) => {
      setPlayers(prev => prev.filter(p => p.userId !== data.userId));
    };

    // ===================================
    // MATCH STATE EVENTS
    // ===================================
    
    const onMatchState = (data) => {
      setMatchState(data);
      
      if (data.question) {
        setCurrentQuestion(data.question);
      }
      
      if (data.players) {
        setPlayers(data.players);
      }
    };

    const onMatchStarted = (data) => {
      setCurrentQuestion(data.question);
    };

    const onMatchFinished = (data) => {
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
      setScoreboard(data.scoreboard);
      
      // Update matchState players with new scores
      if (data.scoreboard) {
        setMatchState(prev => {
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
      setRecentAnswers(prev => {
        // Check if already added to avoid duplicates
        const alreadyAdded = prev.some(a => a.userId === userId);
        if (alreadyAdded) return prev;
        
        const updated = [...prev, { 
          userId: userId, 
          username: 'You',
          timestamp: new Date() 
        }];
        return updated;
      });
    };

    const onAnswerReceived = (data) => {
      setRecentAnswers(prev => {
        const updated = [...prev, data];
        return updated;
      });
    };

    // ===================================
    // SCOREBOARD EVENTS
    // ===================================
    
    const onScoreboardUpdate = (data) => {
      setScoreboard(data.players || data);
    };

    // ===================================
    // ERROR EVENTS
    // ===================================
    
    const onError = (data) => {
      console.error('Socket error:', data.message);
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
    socket,
    
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
