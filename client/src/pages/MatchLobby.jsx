import { Clock, Crown, Play, Trophy, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/Card';
import API_URL from '../config';
import { useSocket } from '../hooks/useSocket';

export function MatchLobby() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [matchData, setMatchData] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const token = localStorage.getItem('accessToken');
  const { socket, isConnected } = useSocket(token);
  const isHost = matchData?.hostId === currentUser.id;

  console.log('MatchLobby Debug:', {
    matchDataHostId: matchData?.hostId,
    currentUserId: currentUser.id,
    isHost,
    matchData
  });

  // Listen for match start and delete events
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Join match room
    socket.emit('match:join', { matchId: parseInt(matchId), userId: currentUser.id });

    // Listen for match started event
    const handleMatchStarted = (data) => {
      console.log('🎮 Match started! Redirecting to match play...', data);
      navigate(`/match/${matchId}/play`);
    };

    // Listen for match deleted event
    const handleMatchDeleted = (data) => {
      console.log('🗑️ Match deleted by host', data);
      alert('This match has been deleted by the host.');
      navigate('/MyMatch');
    };

    socket.on('match:started', handleMatchStarted);
    socket.on('match:deleted', handleMatchDeleted);

    return () => {
      socket.off('match:started', handleMatchStarted);
      socket.off('match:deleted', handleMatchDeleted);
      socket.emit('match:leave', { matchId: parseInt(matchId), userId: currentUser.id });
    };
  }, [socket, isConnected, matchId, currentUser.id, navigate]);

  useEffect(() => {
    fetchMatchData();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchMatchData, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  const fetchMatchData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/match/${matchId}/state`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.ok || data.matchId) {
        setMatchData(data);
        setPlayers(data.players || []);
        setError('');
      } else {
        setError(data.error || 'Failed to load match data');
      }
    } catch (err) {
      console.error('Error fetching match:', err);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!isHost) {
      alert('Only the host can start the match');
      return;
    }

    if (!socket || !isConnected) {
      alert('Not connected to server. Please refresh the page.');
      return;
    }

    // Emit WebSocket event to start match (will broadcast to all players)
    console.log('🎮 Host starting match via WebSocket...');
    socket.emit('match:start', { matchId: parseInt(matchId) });
    
    // Navigation will happen when we receive match:started event
  };

  const handleDeleteMatch = async () => {
    if (!isHost) {
      alert('Only the host can delete the match');
      return;
    }

    if (!confirm('Are you sure you want to delete this match? This action cannot be undone. All invitations will be cancelled.')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/match/${matchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.ok) {
        // Notify all players via WebSocket that match was deleted
        if (socket && isConnected) {
          socket.emit('match:deleted', { matchId: parseInt(matchId) });
        }
        
        // Navigate back to matches page
        navigate('/MyMatch');
      } else {
        alert(data.error || 'Failed to delete match');
      }
    } catch (err) {
      console.error('Error deleting match:', err);
      alert('Failed to delete match. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading match lobby...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="text-red-500 mx-auto mb-4" size={48} />
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/MyMatch')}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              Back to My Matches
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                Match Lobby
              </h1>
              {isHost && (
                <span className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-semibold">
                  <Crown size={16} />
                  HOST
                </span>
              )}
            </div>

            {/* Match Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-[#252537] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Difficulty</p>
                <p className="text-white font-semibold text-lg capitalize">
                  {matchData?.difficulty || 'Medium'}
                </p>
              </div>
              <div className="bg-[#252537] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Questions</p>
                <p className="text-white font-semibold text-lg">
                  {matchData?.total || 0} questions
                </p>
              </div>
              <div className="bg-[#252537] rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-1">Status</p>
                <p className="text-green-400 font-semibold text-lg capitalize">
                  {matchData?.status || 'Waiting'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players List */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users size={24} />
                Players ({players.length})
              </h2>
            </div>

            {players.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users size={48} className="mx-auto mb-2 opacity-50" />
                <p>No players yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div
                    key={player.userId || index}
                    className="flex items-center justify-between bg-[#252537] rounded-lg p-4 hover:bg-[#2a2a3e] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {player.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium flex items-center gap-2">
                          {player.username}
                          {player.userId === matchData?.hostId && (
                            <Crown size={16} className="text-yellow-500" />
                          )}
                        </p>
                        <p className="text-gray-400 text-sm">Score: {player.score || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        player.status === 'READY' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {player.status || 'Waiting'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Host Controls */}
        {isHost && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-white mb-4">Host Controls</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleStartMatch}
                  disabled={players.length === 0}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
                    players.length === 0
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  <Play size={20} />
                  Start Match
                </button>
                <button
                  onClick={handleDeleteMatch}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
                >
                  <XCircle size={20} />
                  Delete Match
                </button>
              </div>
              {players.length === 0 && (
                <p className="text-gray-400 text-sm mt-2">
                  ⓘ Invite at least one player to start the match
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Guest View - Waiting */}
        {!isHost && (
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="text-blue-400 mx-auto mb-4" size={48} />
              <h2 className="text-xl font-bold text-white mb-2">Waiting for Host</h2>
              <p className="text-gray-400">
                The host will start the match when ready. You'll be redirected automatically.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default MatchLobby;
