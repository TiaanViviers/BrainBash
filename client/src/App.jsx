import { ClipboardList, Menu, Shield, Trophy, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import API_URL from "./config";
import AdminPage from "./pages/AdminPage";
import CreateMatch from "./pages/CreateMatch";
import EditProfile from "./pages/EditProfile";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import MatchLobby from "./pages/MatchLobby";
import MatchPlay from "./pages/MatchPlay";
import MyMatch from "./pages/MyMatch";
import ProfilePage from "./pages/ProfilePage";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Logout handler
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }
    } finally {
      localStorage.removeItem("accessToken");
      setIsLoggedIn(false);
      navigate("/");
    }
  };

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setIsLoggedIn(true);
            setUserRole(data.user.role);
          } else {
            localStorage.removeItem("accessToken");
          }
        } catch (err) {
          console.error(err);
          localStorage.removeItem("accessToken");
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Re-fetch user role when isLoggedIn changes (e.g., after login)
  useEffect(() => {
    const fetchUserRole = async () => {
      if (isLoggedIn) {
        const token = localStorage.getItem('accessToken');
        if (token) {
          try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
              const data = await response.json();
              setUserRole(data.user.role);
            }
          } catch (err) {
            console.error('Error fetching user role:', err);
          }
        }
      }
    };
    fetchUserRole();
  }, [isLoggedIn]);

  if (isLoading) return <div className="p-4 text-center text-white">Loading...</div>;
  if (!isLoggedIn) return <Login setIsLoggedIn={setIsLoggedIn} />;

  // Determine active link
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">

      {/* Top-right logo */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        <img src="/BrainBashIcon.png" alt="BrainBash Logo" className="h-10 w-10 shadow-lg rounded-full" />
        <span className="text-white text-xl md:text-2xl font-bold select-none">BrainBash</span>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full flex flex-col gap-4 transition-all duration-300 z-40
          ${sidebarOpen ? "w-48 p-4" : "w-16 p-2"} 
          bg-gradient-to-b from-gray-800 to-gray-900 shadow-lg border-r border-gray-700`}
      >
        {/* Toggle button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white p-2 rounded hover:bg-gray-700 transition"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-2 mt-2">
          <Link
            to="/MyMatch"
            className={`flex items-center gap-3 p-2 rounded-md transition-all hover:bg-blue-600/30
              ${isActive("/MyMatch") ? "bg-blue-500/30 text-blue-400" : "text-white"} ${sidebarOpen ? "text-sm font-medium" : "justify-center"}`}
          >
            <ClipboardList className="h-5 w-5" />
            {sidebarOpen && "My Matches"}
          </Link>

          <Link
            to="/leaderboard"
            className={`flex items-center gap-3 p-2 rounded-md transition-all hover:bg-yellow-500/30
              ${isActive("/leaderboard") ? "bg-yellow-500/30 text-yellow-400" : "text-white"} ${sidebarOpen ? "text-sm font-medium" : "justify-center"}`}
          >
            <Trophy className="h-5 w-5" />
            {sidebarOpen && "Leaderboard"}
          </Link>

          <Link
            to="/ProfilePage"
            className={`flex items-center gap-3 p-2 rounded-md transition-all hover:bg-green-500/30
              ${isActive("/ProfilePage") ? "bg-green-500/30 text-green-400" : "text-white"} ${sidebarOpen ? "text-sm font-medium" : "justify-center"}`}
          >
            <User className="h-5 w-5" />
            {sidebarOpen && "Profile"}
          </Link>

          {userRole === "ADMIN" && (
            <Link
              to="/admin"
              className={`flex items-center gap-3 p-2 rounded-md transition-all hover:bg-purple-500/30
                ${isActive("/admin") ? "bg-purple-500/30 text-purple-400" : "text-purple-400"} ${sidebarOpen ? "text-sm font-medium" : "justify-center"}`}
            >
              <Shield className="h-5 w-5" />
              {sidebarOpen && "Admin"}
            </Link>
          )}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 p-2 rounded-md transition-all hover:bg-red-500/30
              ${sidebarOpen ? "text-red-400 text-sm font-medium" : "justify-center text-red-400"}`}
          >
            Log Out
          </button>
        </nav>

        {/* Collapsed subtle strip for closed sidebar */}
        {!sidebarOpen && (
          <div className="absolute top-0 left-0 h-full w-1 bg-gray-700 rounded-tr rounded-br transition-all" />
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 ml-16 md:ml-48 transition-all duration-300">
        <Routes>
          <Route path="/" element={<MyMatch />} />
          <Route path="/matchlobby/:matchId" element={<MatchLobby />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/match/:id/play" element={<MatchPlay />} />
          <Route path="/create-match" element={<CreateMatch />} />
          <Route path="/ProfilePage" element={<ProfilePage setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/editprofile" element={<EditProfile />} />
          <Route path="/MyMatch" element={<MyMatch />} />
          <Route path="/Login" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route
            path="/admin"
            element={userRole === "ADMIN" ? <AdminPage /> : <div className="text-red-500 text-center mt-10 text-lg">Access Denied</div>}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
