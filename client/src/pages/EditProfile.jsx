import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";
import { resolveAvatar, urlToId } from "../utils/avatarUtils";

function EditProfile() {
  const navigate = useNavigate();

  // Form state
  const [avatar, setAvatar] = useState(""); // Full URL for display
  const [avatarId, setAvatarId] = useState(""); // ID for backend
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // UI state
  const [availableAvatars, setAvailableAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load current profile and available avatars on mount
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const response = await fetch(`${API_URL}/api/avatars`);
        const data = await response.json();
        if (data.ok) setAvailableAvatars(data.avatars);
      } catch (error) {
        console.error('Error fetching avatars:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          const u = data.user || data.profile;
          setUsername(u?.username || "");
          const raw = (u?.avatarUrl || u?.avatar_url || "").toString();
          setAvatar(resolveAvatar(raw));
          setAvatarId(urlToId(resolveAvatar(raw)));
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    };

    fetchMe();
    fetchAvatars();
  }, []);

  // Handle saving profile changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      const finalAvatarId = urlToId(avatar);

      const payload = {
        username: username || undefined,
        avatarId: finalAvatarId || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      };

      const res = await fetch(`${API_URL}/api/users/me/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || data.message || 'Update failed');
        return;
      }

      alert('Profile updated successfully');
      navigate('/ProfilePage');
    } catch (e) {
      console.error('Save error:', e);
      alert('Network error saving profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6 flex justify-center">
      <div className="w-full max-w-3xl bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-white text-center mb-6">Edit Profile</h1>

        {/* Avatar Selection */}
        <div className="bg-gray-700 rounded-xl p-4">
          <label className="block mb-3 font-semibold text-gray-200">Avatar</label>
          <div className="flex items-center gap-4 mb-4">
            <img
              src={avatar || 'https://via.placeholder.com/150'}
              alt="Avatar"
              className="w-32 h-32 rounded-full object-cover border-2 border-gray-500"
            />
            <button
              type="button"
              onClick={() => setShowAvatarSelector(!showAvatarSelector)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
            >
              {showAvatarSelector ? 'Hide' : 'Choose'} Avatar
            </button>
          </div>

          {/* Avatar Grid */}
          {showAvatarSelector && (
            <div className="grid grid-cols-3 gap-3 max-h-60 overflow-auto mt-3">
              {loading ? (
                <p className="col-span-3 text-center text-gray-400">Loading avatars...</p>
              ) : (
                availableAvatars.map((avatarOption) => {
                  const avatarUrl = `${API_URL}${avatarOption.url}`;
                  const isSelected = avatarUrl === avatar;
                  return (
                    <div
                      key={avatarOption.id}
                      className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-transform transform ${
                        isSelected
                          ? 'border-blue-500 scale-105 shadow-md'
                          : 'border-gray-400 hover:border-gray-300 hover:scale-105'
                      }`}
                      onClick={() => {
                        setAvatar(avatarUrl);
                        setAvatarId(urlToId(avatarUrl));
                        setShowAvatarSelector(false);
                      }}
                    >
                      <img
                        src={avatarUrl}
                        alt={avatarOption.name}
                        className="w-full h-24 object-cover"
                      />
                      <p className="text-center text-sm font-medium py-1 text-gray-200">
                        {avatarOption.name}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Username Input */}
        <div className="bg-gray-700 rounded-xl p-4">
          <label className="block mb-2 font-semibold text-gray-200">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-600 text-white"
          />
        </div>

        {/* Password Inputs */}
        <div className="bg-gray-700 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-semibold text-gray-200">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full p-2 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-600 text-white"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold text-gray-200">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full p-2 rounded-lg border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-600 text-white"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full p-3 rounded-xl font-semibold text-white transition ${
            saving ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default EditProfile;
