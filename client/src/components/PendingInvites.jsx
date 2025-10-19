import { Bell, Check, Clock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../config';

export function PendingInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvites();
    const interval = setInterval(fetchInvites, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchInvites = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

      if (!currentUser.id) {
        setError('User not logged in');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/invites/received?userId=${currentUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.ok) {
        const pending = data.invites?.filter(inv => inv.status === 'PENDING') || [];
        setInvites(pending);
      } else {
        setError(data.error || 'Failed to load invites');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (inviteId, matchId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const response = await fetch(`${API_URL}/api/invites/${inviteId}/accept`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await response.json();
      if (data.ok) {
        setInvites(invites.filter(inv => inv.inviteId !== inviteId));
        navigate(`/matchlobby/${matchId}`);
      } else {
        alert(data.error || 'Failed to accept invite');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to accept invite: ' + err.message);
    }
  };

  const handleDecline = async (inviteId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/invites/${inviteId}/decline`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.ok) {
        setInvites(invites.filter(inv => inv.inviteId !== inviteId));
      } else {
        alert(data.error || 'Failed to decline invite');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to decline invite');
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1f1f2e] rounded-xl p-4 border border-gray-800 shadow-inner">
        <p className="text-gray-400 text-center">Loading invites...</p>
      </div>
    );
  }

  if (invites.length === 0) return null;

  return (
    <div className="bg-[#1f1f2e] rounded-xl p-6 border border-gray-800 shadow-lg space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="text-yellow-500" size={24} />
        <h3 className="text-xl font-bold text-white">Pending Invitations ({invites.length})</h3>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {invites.map((invite) => (
          <div
            key={invite.inviteId}
            className="flex items-start justify-between p-4 bg-[#252537] rounded-xl border border-gray-700 hover:border-gray-600 transition shadow-sm"
          >
            <div className="flex-1">
              <p className="text-white font-medium mb-1">
                Match Invitation from{' '}
                <span className="text-blue-400">{invite.sender?.username || 'Unknown'}</span>
              </p>
              <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {new Date(invite.sentAt).toLocaleDateString()}
                </span>
                {invite.match?.difficulty && (
                  <span className="px-2 py-0.5 bg-gray-700 rounded-full text-xs uppercase">
                    {invite.match.difficulty}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(invite.inviteId, invite.matchId)}
                className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
              >
                <Check size={18} />
                Accept
              </button>
              <button
                onClick={() => handleDecline(invite.inviteId)}
                className="flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition"
              >
                <X size={18} />
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
