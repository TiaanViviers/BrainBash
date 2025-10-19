import { useEffect, useState } from 'react';
import { Progress } from '../components/Progress';

/**
 * SyncedTimer Component
 * Synchronized countdown timer visible to all players.
 * 
 * Props:
 * - socket: WebSocket instance
 * - matchId: ID of the current match
 * - onTimeUp: callback when timer reaches 0
 */
export function SyncedTimer({ socket, matchId, onTimeUp }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [duration, setDuration] = useState(20); // Default 20s
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onTimerStart = (data) => {
      if (data.matchId === matchId) {
        setDuration(data.duration);
        setTimeRemaining(data.timeRemaining);
        setIsActive(true);
      }
    };

    const onTimerTick = (data) => {
      if (data.matchId === matchId) {
        setTimeRemaining(data.timeRemaining);
        setIsActive(true);
      }
    };

    const onTimerExpired = (data) => {
      if (data.matchId === matchId) {
        setTimeRemaining(0);
        setIsActive(false);
        onTimeUp?.();
      }
    };

    const onTimerPaused = (data) => {
      if (data.matchId === matchId) {
        setIsActive(false);
      }
    };

    socket.on('timer:start', onTimerStart);
    socket.on('timer:tick', onTimerTick);
    socket.on('timer:expired', onTimerExpired);
    socket.on('timer:paused', onTimerPaused);

    return () => {
      socket.off('timer:start', onTimerStart);
      socket.off('timer:tick', onTimerTick);
      socket.off('timer:expired', onTimerExpired);
      socket.off('timer:paused', onTimerPaused);
    };
  }, [socket, matchId, onTimeUp]);

  if (timeRemaining === null) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
        <p className="text-gray-400 dark:text-gray-300 text-sm">
          Waiting for question...
        </p>
      </div>
    );
  }

  const progress = (timeRemaining / duration) * 100;
  const isWarning = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 space-y-4 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
          Time Remaining
        </h3>
        <div
          className={`text-4xl font-bold tabular-nums transition-colors ${
            isCritical 
              ? 'text-red-600 animate-pulse' 
              : isWarning 
              ? 'text-yellow-500' 
              : 'text-green-500'
          }`}
        >
          {timeRemaining}s
        </div>
      </div>

      {/* Progress Bar */}
      <Progress
        value={progress}
        className={`h-3 rounded-full ${
          isCritical
            ? '[&>div]:bg-red-500'
            : isWarning
            ? '[&>div]:bg-yellow-500'
            : '[&>div]:bg-green-500'
        }`}
      />

      {/* Messages */}
      {isCritical && timeRemaining > 0 && (
        <p className="text-center text-sm text-red-600 font-semibold animate-pulse">
          ⚠️ Hurry up! Time is running out.
        </p>
      )}

      {timeRemaining === 0 && (
        <p className="text-center text-sm text-gray-500">
          ⏰ Time's up! Moving to next question...
        </p>
      )}

      {!isActive && timeRemaining > 0 && (
        <p className="text-center text-sm text-gray-400">
          ⏸️ Timer paused
        </p>
      )}
    </div>
  );
}

export default SyncedTimer;
