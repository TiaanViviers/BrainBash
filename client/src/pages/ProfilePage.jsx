import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";
import { resolveAvatar } from "../utils/avatarUtils";

function ProfilePage({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const avatarsPromise = fetch(`${API_URL}/api/avatars`)
          .then((r) => r.json())
          .catch(() => ({ ok: false, avatars: [] }));

        if (!token) {
          await avatarsPromise;
          setLoading(false);
          return;
        }

        const mePromise = fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(async (r) => ({ res: r, json: await r.json() }));

        const [{ ok: avatarsOk, avatars = [] }, { res, json }] = await Promise.all([
          avatarsPromise,
          mePromise,
        ]);

        if (!res.ok || !json?.ok) {
          setError(json?.error || json?.message || "Failed to load profile");
          return;
        }

        const u = json.user || json.profile || {};
        const raw = (u.avatarUrl ?? u.avatar_url ?? "").toString();

        setProfile({
          username: u.username || "",
          avatarUrl: resolveAvatar(raw),
          memberSince: u.createdAt || u.created_at || new Date().toISOString(),
          gamesPlayed: u.stats?.gamesPlayed ?? 0,
          highScore: u.stats?.highestScore ?? 0,
        });
      } catch (e) {
        setError("Network error loading profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleEdit = () => navigate("/editprofile");

  const handleDeleteAccount = async () => {
    const password = prompt("Enter your password to confirm account deletion:");
    if (!password) return;
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/api/users/me/account`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("Account deleted successfully");
        localStorage.removeItem("accessToken");
        setIsLoggedIn(false);
        navigate("/");
      } else {
        alert(data.error || "Failed to delete account");
      }
    } catch (error) {
      console.error(error);
      alert("Network error deleting account");
    }
  };

  const initials = (profile?.username || "").slice(0, 1).toUpperCase();
  const matchHistory = [];

  if (loading) return <div className="flex items-center justify-center min-h-screen text-white">Loading profile...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!profile) return <div className="p-4 text-white">No profile loaded.</div>;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] p-6 space-y-8 max-w-4xl mx-auto">
      {/* Top actions */}
      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          className="px-6 py-2 rounded-lg border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))/10] transition"
          onClick={handleEdit}
        >
          Edit Profile
        </button>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="px-6 py-2 rounded-lg border-2 border-[hsl(var(--destructive))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))/10] transition"
        >
          Delete Account
        </button>
      </div>

      {/* Profile summary */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mt-8 bg-[hsl(var(--card))] border border-[hsl(var(--card-border))] rounded-2xl p-6 shadow-md">
        {/* Avatar */}
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt="Avatar"
            className="w-32 h-32 rounded-full object-cover border-2 border-[hsl(var(--primary))]"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center text-white text-5xl font-bold border-2 border-[hsl(var(--primary))]">
            {initials}
          </div>
        )}

        {/* Details */}
        <div className="flex-1 space-y-2 text-lg">
          <div className="text-2xl font-semibold">Username: {profile.username}</div>
          <div>Number of games played: {profile.gamesPlayed}</div>
          <div>High score: {profile.highScore}</div>
          <div>Member since: {new Date(profile.memberSince).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Match history */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Match History</h2>
        {matchHistory.length === 0 ? (
          <div className="text-muted-foreground">No matches played yet.</div>
        ) : (
          <div className="space-y-2">
            {matchHistory.map((m) => (
              <div
                key={m.id}
                className="flex justify-between items-center p-4 bg-[hsl(var(--card))] border border-[hsl(var(--card-border))] rounded-lg shadow"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
                  <span className="font-medium">vs {m.opponent}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Score: {m.score}</span>
                  <span className={m.result === "Win" ? "text-success font-semibold" : "text-destructive font-semibold"}>
                    {m.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
