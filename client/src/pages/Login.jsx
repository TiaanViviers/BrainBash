import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config";
import { urlToId } from "../utils/avatarUtils";

function Login({ setIsLoggedIn }) {
  const navigate = useNavigate();

  // Form state
  const [username, setUsername] = useState(""); // Only used for Sign Up
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Avatar state for Sign Up
  const [avatar, setAvatar] = useState(
    `${API_URL}/api/avatars/Stewie`
  );
  const [availableAvatars, setAvailableAvatars] = useState([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  // Load available avatars (used for Sign Up)
  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const response = await fetch(`${API_URL}/api/avatars`);
        const data = await response.json();
        if (data.ok) {
          setAvailableAvatars(data.avatars);
          if (data.avatars.length > 0) {
            setAvatar(`${API_URL}${data.avatars[0].url}`);
          }
        }
      } catch (err) {
        console.error("Error fetching avatars:", err);
      } finally {
        setLoadingAvatars(false);
      }
    };
    fetchAvatars();
  }, []);

  /**
   * Handle Login
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.ok) {
        // Save credentials if "Remember Me" is checked
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
          localStorage.setItem("rememberedPassword", password);
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
        }

        // Always use localStorage to stay logged in
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            id: data.user.userId,
            username: data.user.username,
            email: data.user.email,
            avatar: data.user.avatarUrl,
          })
        );
        setIsLoggedIn(true);
        navigate("/");
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Sign Up
   */
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          avatarId: urlToId(avatar),
        }),
      });
      const data = await response.json();

      if (data.ok) {
        // Always use localStorage to stay logged in
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            id: data.user.userId,
            username: data.user.username,
            email: data.user.email,
            avatar: data.user.avatarUrl,
          })
        );
        setIsLoggedIn(true);
        navigate("/");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center p-6">
      {/* Logo - Above the login panel */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <img src="/BrainBashIcon.png" alt="BrainBash Logo" className="h-40 w-40 shadow-lg rounded-full" />
        <span className="text-white text-5xl md:text-4xl font-bold select-none">BrainBash</span>
      </div>
      
      <div className="w-full max-w-md bg-[hsl(var(--card))] border border-purple-500/30 rounded-2xl shadow-2xl p-8 space-y-6">
        <h1 className="text-3xl font-bold text-white text-center">
          {isSignUp ? "Sign Up" : "Login"}
        </h1>

        <form
          onSubmit={isSignUp ? handleSignUp : handleLogin}
          className="flex flex-col gap-4"
        >
          {/* Sign Up Avatar Selection */}
          {isSignUp && (
            <div className="bg-gray-700/50 border border-purple-500/30 rounded-xl p-4">
              <label className="block mb-3 font-semibold text-gray-200">
                Avatar
              </label>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition"
                >
                  {showAvatarSelector ? "Hide" : "Choose"} Avatar
                </button>
              </div>

              {showAvatarSelector && (
                <div className="grid grid-cols-3 gap-3 max-h-56 overflow-auto">
                  {loadingAvatars ? (
                    <p className="col-span-3 text-center text-gray-400">
                      Loading avatars...
                    </p>
                  ) : (
                    availableAvatars.map((opt) => {
                      const avatarUrl = `${API_URL}${opt.url}`;
                      const isSelected = avatarUrl === avatar;
                      return (
                        <div
                          key={opt.id}
                          className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-transform transform ${
                            isSelected
                              ? "border-purple-500 scale-105 shadow-md"
                              : "border-gray-500 hover:border-purple-400 hover:scale-105"
                          }`}
                          onClick={() => {
                            setAvatar(avatarUrl);
                            setShowAvatarSelector(false);
                          }}
                        >
                          <img
                            src={avatarUrl}
                            alt={opt.name}
                            className="w-full h-20 object-cover"
                          />
                          <p className="text-center text-sm font-medium py-1 text-gray-200">
                            {opt.name}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sign Up Username */}
          {isSignUp && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full p-2 rounded-lg border border-purple-500/30 bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          )}

          {/* Email and Password Inputs */}
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full p-2 rounded-lg border border-purple-500/30 bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="w-full p-2 rounded-lg border border-purple-500/30 bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />

          {/* Remember Me Checkbox - Only show on Login */}
          {!isSignUp && (
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-purple-500 cursor-pointer"
              />
              <span>Remember me (auto-fill email and password next time)</span>
            </label>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-3 rounded-xl font-semibold text-gray-900 transition ${
              loading ? "bg-gray-500 cursor-not-allowed" : "bg-yellow-500 hover:bg-yellow-600"
            }`}
          >
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
          </button>

          {/* Toggle Login / Sign Up */}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-300 underline text-sm mt-2"
          >
            {isSignUp
              ? "Already have an account? Login"
              : "Don't have an account? Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
