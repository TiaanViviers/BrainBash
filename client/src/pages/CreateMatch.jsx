import { Search, UserPlus, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/Card';
import API_URL from '../config';

export function CreateMatch() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [formData, setFormData] = useState({
    name: 'Quick Test Match',
    category: '',
    difficulty: 'medium',
    amount: 5,
  });

  const fetchUsers = async (searchQuery = 'a') => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.users) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        setAllUsers(data.users.filter(u => u.userId !== currentUser.id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/api/categories`);
        const data = await res.json();
        if (data.ok) {
          setCategories(data.categories);
          if (data.categories.length > 0) {
            setFormData(prev => ({ ...prev, category: data.categories[0].name }));
          }
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchCategories();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timer = setTimeout(() => fetchUsers(searchTerm), 300);
      return () => clearTimeout(timer);
    } else if (searchTerm.length === 0) fetchUsers('aa');  // Use 'aa' to meet 2-char minimum
  }, [searchTerm]);

  const togglePlayer = (user) => {
    setSelectedPlayers(prev => {
      const exists = prev.find(p => p.userId === user.userId);
      return exists ? prev.filter(p => p.userId !== user.userId) : [...prev, user];
    });
  };

  const removePlayer = (userId) => setSelectedPlayers(prev => prev.filter(p => p.userId !== userId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const currentUserStr = localStorage.getItem('currentUser');
      if (!token || !currentUserStr) {
        alert('Please login first');
        navigate('/login');
        return;
      }
      const currentUser = JSON.parse(currentUserStr);
      const payload = {
        category: formData.category,
        difficulty: formData.difficulty,
        amount: formData.amount,
        players: [parseInt(currentUser.id)],
        hostId: parseInt(currentUser.id),
      };
      const response = await fetch(`${API_URL}/api/match`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create match');
      const data = await response.json();
      
      // Send invites to selected players
      if (data.ok && data.matchId && selectedPlayers.length > 0) {
        
        // Send invites in parallel
        const invitePromises = selectedPlayers.map(player =>
          fetch(`${API_URL}/api/invites`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              matchId: parseInt(data.matchId),
              senderId: parseInt(currentUser.id),
              recipientId: player.userId,
            }),
          })
          .then(res => res.json())
          .then(result => {
            if (result.ok) {
            } else {
              console.error(`Failed to invite ${player.username}:`, result.error);
            }
            return result;
          })
          .catch(err => {
            console.error(`Error inviting ${player.username}:`, err);
          })
        );
        
        // Wait for all invites to complete
        await Promise.all(invitePromises);
      }
      
      if (data.ok && data.matchId) navigate(`/matchlobby/${data.matchId}`);
    } catch (error) {
      console.error(error);
      alert('Error creating match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e2f] p-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">

        {/* Match Form */}
        <Card className="flex-1 shadow-xl bg-[#252537]">
          <CardContent className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-white">Create a Match</h1>
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-2 bg-[#1f1f2e] text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Number of Questions</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-[#1f1f2e] text-white border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">1–7 questions</p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 border border-gray-700 rounded-lg bg-[#1f1f2e]">
                  {categories.map(cat => (
                    <label
                      key={cat.category_id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition duration-150 ${
                        formData.category === cat.name
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-[#252537] hover:bg-[#2a2a3e] text-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={formData.category === cat.name}
                        onChange={() => setFormData(prev => ({ ...prev, category: cat.name }))}
                        className="w-4 h-4 accent-blue-500"
                      />
                      <span className="text-sm font-medium">{cat.name}</span>
                    </label>
                  ))}
                </div>
                {categories.length === 0 && <p className="text-sm text-gray-400 mt-2">Loading categories...</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !formData.category}
                className={`w-full py-3 rounded-lg font-semibold text-white shadow-lg transition duration-200 ${
                  loading || !formData.category
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-400'
                }`}
              >
                {loading ? 'Creating Match...' : 'Create Match'}
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Player Invitations */}
        <div className="w-full lg:w-96 flex-shrink-0 space-y-4">

          {/* Selected Players */}
          <Card className="bg-[#252537] shadow-lg">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Users size={20} className="text-blue-500" />
                Invited Players ({selectedPlayers.length})
              </h3>
              {selectedPlayers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No players invited yet</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedPlayers.map(player => (
                    <div key={player.userId} className="flex items-center justify-between p-2 bg-[#1f1f2e] rounded-lg hover:bg-[#2a2a3e] transition">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {player.username[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-white">{player.username}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePlayer(player.userId)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Players */}
          <Card className="bg-[#252537] shadow-lg">
            <CardContent className="p-4">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Search size={20} className="text-blue-500" />
                Search Players
              </h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#1f1f2e] text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allUsers.slice(0, 10).map(user => {
                  const isSelected = selectedPlayers.some(p => p.userId === user.userId);
                  return (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => togglePlayer(user)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition duration-150 ${
                        isSelected
                          ? 'bg-blue-500/20 border border-blue-500'
                          : 'bg-[#1f1f2e] hover:bg-[#2a2a3e]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-white font-medium">{user.username}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                      <UserPlus size={16} className={isSelected ? 'text-blue-400' : 'text-gray-500'} />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CreateMatch;
