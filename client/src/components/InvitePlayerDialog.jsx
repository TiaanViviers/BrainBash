/**
 * Dialog component for inviting players to a match.
 * Displays a searchable list of users and allows sending match invitations.
 */

import { Search, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import API_URL from '../config';

/**
 * InvitePlayerDialog modal component.
 * @param {Object} props - Component props
 * @param {number} props.matchId - ID of the match to invite players to
 * @param {boolean} props.isOpen - Whether the dialog is visible
 * @param {Function} props.onClose - Callback to close the dialog
 * @returns {JSX.Element|null} Dialog element or null if not open
 */
export function InvitePlayerDialog({ matchId, isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) fetchUsers();
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_URL}/api/users/search?q=a&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.ok) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        setUsers((data.users || []).filter(u => u.user_id !== currentUser.id));
      } else {
        setError(data.error || 'Failed to load users');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async (recipientId) => {
    setSending(true);
    setError('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('accessToken');
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      const res = await fetch(`${API_URL}/api/invites`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: parseInt(matchId),
          senderId: currentUser.id,
          recipientId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessMessage('Invite sent successfully!');
        setUsers(users.map(u => u.user_id === recipientId ? { ...u, invited: true } : u));
      } else {
        setError(data.error || 'Failed to send invite');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to send invite');
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1f1f2e] rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">Invite Players</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-700 bg-[#252537] text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {searchTerm ? 'No users found matching your search' : 'No users available'}
            </div>
          ) : (
            filteredUsers.map(user => (
              <div
                key={user.user_id}
                className="flex items-center justify-between p-4 bg-[#252537] rounded-lg hover:bg-[#2a2a3e] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {user.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.username}</p>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => sendInvite(user.user_id)}
                  disabled={sending || user.invited}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    user.invited
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  <UserPlus size={18} />
                  {user.invited ? 'Invited' : 'Invite'}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
