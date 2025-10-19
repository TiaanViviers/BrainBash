import {
    Calendar,
    ChevronDown, Crown,
    Eye,
    Filter,
    Play,
    Search,
    Trophy, Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/Card';
import { PendingInvites } from '../components/PendingInvites';
import API_URL from '../config';

export function MyMatch() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('desc'); // 'asc' or 'desc' for last activity

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  useEffect(() => {
    fetchCategories();
    fetchMatches();
    const interval = setInterval(fetchMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      if (data.ok) {
        setCategories(data.categories.map((cat) => cat.name));
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${API_URL}/api/match`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.ok) {
        setMatches(data.matches || []);
        setError("");
      } else {
        setError(data.error || "Failed to load matches");
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
      setError("Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const filteredMatches = matches.filter((match) => {
    const matchesSearch =
      searchTerm === "" ||
      match.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.difficulty?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(match.category);

    const matchesStatus =
      selectedStatus === "ALL" || match.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort matches by last activity
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    // Get the most recent timestamp (updated_at, start_time, or created_at)
    const getLastActivity = (match) => {
      const timestamps = [
        match.updated_at,
        match.end_time,
        match.start_time,
        match.created_at
      ].filter(Boolean); // Remove null/undefined
      
      const mostRecent = timestamps.sort((x, y) => new Date(y) - new Date(x))[0];
      return new Date(mostRecent || match.created_at);
    };

    const dateA = getLastActivity(a);
    const dateB = getLastActivity(b);

    // Sort descending (newest first) or ascending (oldest first)
    return sortBy === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Separate into created vs joined
  const createdMatches = sortedMatches.filter(m => m.host_id === currentUser.id);
  const joinedMatches = sortedMatches.filter(m => {
    if (m.host_id === currentUser.id) return false; // Don't include matches where user is host
    
    // Check if user is in match_players
    return m.match_players?.some(p => p.user_id === currentUser.id);
  });

  const MatchCard = ({ match, isHost }) => {
    const statusColors = {
      SCHEDULED:
        "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
      ONGOING: "bg-green-500/20 text-green-400 border border-green-500/40",
      FINISHED: "bg-gray-500/20 text-gray-400 border border-gray-500/40",
      CANCELED: "bg-red-500/20 text-red-400 border border-red-500/40",
    };

    const handleAction = (action) => {
      switch (action) {
        case "lobby":
          navigate(`/matchlobby/${match.match_id}`);
          break;
        case "play":
          navigate(`/match/${match.match_id}/play`);
          break;
        case "results":
          navigate(`/match/${match.match_id}/play`);
          break;
        default:
          break;
      }
    };

    return (
      <Card className="bg-[hsl(var(--card))] border border-border/50 hover:border-[hsl(var(--primary))] shadow-lg hover:shadow-[hsl(var(--primary)/0.3)] transition-all rounded-2xl">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-blue-400">
                  {match.category || "Trivia Match"}
                </h3>
                {isHost && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">
                    <Crown size={12} />
                    HOST
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {match.player_count || 1}{" "}
                  {match.player_count === 1 ? "player" : "players"}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy size={14} />
                  {match.difficulty || "Medium"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(
                    match.start_time || match.created_at
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[match.status] || statusColors.SCHEDULED}`}
            >
              {match.status || "SCHEDULED"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {match.status === "SCHEDULED" && (
              <>
                <button
                  onClick={() => handleAction("lobby")}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
                >
                  <Eye size={16} />
                  View Lobby
                </button>
                {isHost && (
                  <button
                    onClick={() => handleAction("lobby")}
                    className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
                  >
                    <Play size={16} />
                    Manage Match
                  </button>
                )}
              </>
            )}
            {match.status === "ONGOING" && (
              <button
                onClick={() => handleAction("play")}
                className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
              >
                <Play size={16} />
                Join Game
              </button>
            )}
            {match.status === "FINISHED" && (
              <button
                onClick={() => handleAction("results")}
                className="flex items-center gap-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition"
              >
                <Trophy size={16} />
                View Results
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Trophy className="text-yellow-500 h-7 w-7" />
              My Matches
            </h1>
          </div>
          <button
            onClick={() => navigate("/create-match")}
            className="w-full sm:w-auto px-6 py-3 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white rounded-2xl font-semibold shadow-lg transition"
          >
            + Create Match
          </button>
        </div>

        {/* Pending Invitations */}
        <PendingInvites />

        {/* Filters */}
        <Card className="border border-border/50 bg-[hsl(var(--card))]">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[hsl(var(--muted))] text-gray-900 placeholder:text-gray-500 rounded-lg border border-border focus:border-[hsl(var(--primary))] focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 bg-[hsl(var(--muted))] text-gray-900 rounded-lg border border-border focus:border-[hsl(var(--primary))] focus:outline-none [&>option]:text-gray-900 [&>option]:bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ONGOING">Ongoing</option>
                <option value="FINISHED">Finished</option>
                <option value="CANCELED">Canceled</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-[hsl(var(--muted))] text-gray-900 rounded-lg border border-border focus:border-[hsl(var(--primary))] focus:outline-none [&>option]:text-gray-900 [&>option]:bg-white"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>

              {/* Category Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-gray-900 rounded-lg border border-border transition"
              >
                <Filter size={18} />
                Categories
                <ChevronDown
                  size={14}
                  className={`transition-transform text-gray-900 ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Category Checkboxes */}
            {showFilters && (
              <div className="pt-4 border-t border-border/50 space-y-2">
                <p className="text-sm text-muted">Filter by category (max 4):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {categories.map((category) => (
                    <label
                      key={category}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-all ${
                        selectedCategories.includes(category)
                          ? "bg-[hsl(var(--primary)/0.2)] border border-[hsl(var(--primary))]"
                          : "bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        disabled={
                          selectedCategories.length >= 4 &&
                          !selectedCategories.includes(category)
                        }
                        className="accent-[hsl(var(--primary))]"
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Matches I Created */}
        {createdMatches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Crown className="text-yellow-500" />
              Matches I Created ({createdMatches.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {createdMatches.map((match) => (
                <MatchCard key={match.match_id} match={match} isHost={true} />
              ))}
            </div>
          </div>
        )}

        {/* Matches I Joined */}
        {joinedMatches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="text-blue-500" />
              Matches I Joined ({joinedMatches.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {joinedMatches.map((match) => (
                <MatchCard key={match.match_id} match={match} isHost={false} />
              ))}
            </div>
          </div>
        )}

        {/* No Matches */}
        {createdMatches.length === 0 &&
          joinedMatches.length === 0 &&
          !loading && (
            <Card className="bg-[hsl(var(--card))] border border-border/50 text-center p-10">
              <CardContent>
                <Trophy className="text-gray-600 mx-auto mb-4" size={64} />
                <h3 className="text-xl font-bold text-gray-300 mb-2">
                  No matches found
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ||
                  selectedCategories.length > 0 ||
                  selectedStatus !== "ALL"
                    ? "Try adjusting your filters or search term"
                    : "Create your first match to get started!"}
                </p>
                {!searchTerm &&
                  selectedCategories.length === 0 &&
                  selectedStatus === "ALL" && (
                    <button
                      onClick={() => navigate("/create-match")}
                      className="px-6 py-3 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.9)] text-white rounded-xl font-semibold shadow-md transition"
                    >
                      Create Your First Match
                    </button>
                  )}
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
}

export default MyMatch;
