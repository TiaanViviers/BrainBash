import { Check, Clock, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../components/Avatar";
import { Card, CardContent } from "../components/Card";
import { SyncedTimer } from "../components/SyncedTimer";
import { useMatchSocket } from "../hooks/useMatchSocket";
import { resolveAvatar } from "../utils/avatarUtils";

export default function MatchPlay() {
  const { id: matchId } = useParams();
  const token = localStorage.getItem("accessToken");
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const userId = currentUser.id;

  // Debug info
  console.log('MatchPlay Debug:', { matchId, userId, currentUser });

  // Authentication checks
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-bold">Authentication required</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-bold">User ID not found. Please login again.</p>
      </div>
    );
  } 

  // Connect to match via socket
  const {
    isConnected,
    error,
    socket,
    matchState,
    currentQuestion,
    scoreboard,
    players,
    recentAnswers,
    submitAnswer,
    advanceQuestion,
  } = useMatchSocket(parseInt(matchId), parseInt(userId), token);

  // Local state for answering questions
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [matchStarted, setMatchStarted] = useState(false);

  // Automatically start the match if host and scheduled
  useEffect(() => {
    if (!socket || !matchState || matchStarted) return;

    const isHost = matchState.hostId === userId;
    const needsStart = matchState.status === 'SCHEDULED' && isHost;

    console.log('Match start check:', { 
      isHost, 
      status: matchState.status, 
      needsStart,
      matchId,
      userId 
    });

    if (needsStart) {
      console.log('🎮 Starting match as host...');
      socket.emit('match:start', { matchId: parseInt(matchId) });
      setMatchStarted(true);
    }
  }, [socket, matchState, matchId, userId, matchStarted]);

  // Reset answer state on new question
  useEffect(() => {
    if (currentQuestion) {
      setSelectedAnswer(null);
      setIsAnswered(false);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestion?.id]);

  // Handle answer selection
  const handleAnswer = (option) => {
    if (isAnswered || !currentQuestion) return;

    const responseTimeMs = Date.now() - questionStartTime;
    setSelectedAnswer(option);
    setIsAnswered(true);

    submitAnswer(currentQuestion.id, option, responseTimeMs);
  };

  const isHost = matchState?.hostId === userId;

  console.log('MatchPlay State:', {
    matchState,
    currentQuestion,
    scoreboard,
    players,
    total: matchState?.total,
    index: matchState?.index,
    finished: matchState?.finished,
    status: matchState?.status
  });

  console.log('Question details:', currentQuestion);
  console.log('Players:', players);

  // Match completed screen
  if (matchState?.finished || matchState?.status === 'FINISHED') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="p-8 text-center">
            <Trophy className="mx-auto text-yellow-500 mb-4" size={64} />
            <h1 className="text-3xl font-bold text-white mb-4">Match Complete!</h1>
            <p className="text-gray-400 mb-6">Great job! Here are the final results:</p>

            {/* Scoreboard */}
            <div className="space-y-2 mb-6">
              {players?.sort((a, b) => b.score - a.score).map((player, index) => (
                <div key={player.userId} className="flex items-center justify-between p-4 bg-[#252537] rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-500">#{index + 1}</span>
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={resolveAvatar(player.avatar || player.avatarUrl)} />
                      <AvatarFallback>{player.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-white font-medium">{player.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} />
                    <span className="text-xl font-bold text-white">{player.score || 0} pts</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => window.location.href = '/MyMatch'}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
            >
              Back to My Matches
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connection error screen
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-bold">{error}</p>
      </div>
    );
  }

  // Loading screen while connecting
  if (!isConnected || !matchState || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Connecting to match...</p>
      </div>
    );
  }

  // Debugging progress calculations
  const totalQuestions = matchState.total || 0;
  const currentQuestionNumber = (matchState.index ?? 0) + 1;
  const progress = totalQuestions > 0 ? (currentQuestionNumber / totalQuestions) * 100 : 0;

  console.log('Calculated values:', { totalQuestions, currentQuestionNumber, progress });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-6">
        {/* Main Match Area */}
        <div className="md:col-span-3 space-y-6">
          {/* Timer */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 font-mono text-3xl font-bold">
              <Clock className="h-6 w-6" />
              <SyncedTimer socket={socket} matchId={parseInt(matchId)} />
            </div>
          </div>

          {/* Question Card */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">{currentQuestion.text}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options?.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    disabled={isAnswered}
                    className={`h-auto min-h-[80px] p-6 text-left text-lg rounded-lg border-2 transition-all
                      ${selectedAnswer === option ? 'bg-blue-500/20 border-blue-500 font-semibold text-white' : 'bg-[#252537] border-gray-700 hover:bg-[#2a2a3e] text-white'}
                      ${isAnswered ? 'cursor-not-allowed opacity-60' : 'hover:border-gray-500'}`}
                  >
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                    {isAnswered && option === currentQuestion.correctAnswer && (
                      <Check className="ml-2 inline h-5 w-5 text-green-400" />
                    )}
                    {isAnswered && selectedAnswer === option && option !== currentQuestion.correctAnswer && (
                      <X className="ml-2 inline h-5 w-5 text-red-400" />
                    )}
                  </button>
                ))}
              </div>

              {isAnswered && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                  ✓ Answer submitted! Waiting for other players...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Match Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-2">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-muted-foreground">
              {currentQuestionNumber}/{totalQuestions}
            </span>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Scoreboard */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-white">Scoreboard</h3>
              </div>
              <div className="space-y-2">
                {players?.length > 0 ? (
                  players.sort((a, b) => (b.score || 0) - (a.score || 0)).map((player, idx) => (
                    <div
                      key={player.userId}
                      className={`flex items-center justify-between p-2 rounded ${
                        player.userId === userId ? 'bg-blue-500/20 border border-blue-500' : 'bg-[#252537]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold w-6 text-gray-400">#{idx + 1}</span>
                        <span className="text-white">{player.username}</span>
                      </div>
                      <span className="font-bold text-blue-400">{player.score || 0}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm">Loading players...</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Host Controls */}
          {isHost && (
            <Card>
              <CardContent className="p-4">
                <button
                  onClick={advanceQuestion}
                  disabled={recentAnswers.length < players.length}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                    recentAnswers.length < players.length
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                  title={recentAnswers.length < players.length ? 'Waiting for all players to answer' : 'Advance to next question'}
                >
                  ⏭️ Next Question
                  {recentAnswers.length < players.length && (
                    <span className="block text-xs mt-1">
                      ({recentAnswers.length}/{players.length} answered)
                    </span>
                  )}
                </button>
              </CardContent>
            </Card>
          )}

          {/* Recent Answers */}
          {recentAnswers.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Recent Answers</h3>
                <ul className="space-y-1">
                  {recentAnswers.slice(-5).map((answer, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      {answer.username} submitted an answer
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
