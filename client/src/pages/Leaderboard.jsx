import { Award, Calendar, Medal, Search, TrendingUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/Avatar";
import Badge from "../components/Badge";
import { Card, CardContent } from "../components/Card";
import { Input } from "../components/Input";
import API_URL from "../config";
import { resolveAvatar } from "../utils/avatarUtils";

export default function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_URL}/api/leaderboard?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        setLeaderboard(data.leaderboard);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [period]);

  const filteredLeaderboard =
    leaderboard
      .filter((entry) => !entry.username.startsWith("Deleted User")) // Filter out deleted users
      .filter((entry) =>
        entry.username.toLowerCase().includes(searchQuery.toLowerCase())
      ) || [];

  const getRankBadge = (rank) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankClass = (rank) => {
    let base = "bg-[hsl(var(--card))] border border-[hsl(var(--card-border))] rounded-2xl shadow-md";

    if (rank === 1) return `${base} border-yellow-400`;
    if (rank === 2) return `${base} border-gray-400`;
    if (rank === 3) return `${base} border-amber-400`;
    return base;
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-foreground mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Top players ranked by performance</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center flex-wrap gap-4 mb-6">
          {["daily", "weekly", "all"].map((p) => (
            <button
              key={p}
              className={`flex items-center gap-1 px-4 py-2 rounded-2xl font-semibold transition ${
                period === p
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "bg-[hsl(var(--card))] hover:bg-[hsl(var(--card-border))] text-foreground/70 hover:text-foreground"
              }`}
              onClick={() => setPeriod(p)}
            >
              {p === "daily" && <Calendar className="h-4 w-4" />}
              {p === "weekly" && <TrendingUp className="h-4 w-4" />}
              {p === "all" && <Trophy className="h-4 w-4" />}
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[hsl(var(--card-foreground))] placeholder:text-muted-foreground rounded-lg"
          />
        </div>

        {/* Leaderboard */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse bg-[hsl(var(--card))] border border-[hsl(var(--card-border))] rounded-2xl">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-[hsl(var(--muted))]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 bg-[hsl(var(--muted-foreground))] rounded" />
                    <div className="h-4 w-48 bg-[hsl(var(--muted-foreground)/0.5)] rounded" />
                  </div>
                  <div className="h-8 w-16 bg-[hsl(var(--muted-foreground))] rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No players found</h3>
            <p>{searchQuery ? "Try a different search term" : "Be the first to play!"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeaderboard.map((entry) => (
              <Card
                key={entry.userId}
                className={`flex items-center gap-4 p-4 ${getRankClass(entry.rank)}`}
              >
                <div className="w-12 flex justify-center">{getRankBadge(entry.rank)}</div>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={resolveAvatar(entry.avatarUrl)} />
                  <AvatarFallback>{entry.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-[hsl(var(--card-foreground))]">
                  <h3 className="font-semibold">{entry.username}</h3>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-1">
                    <span>{entry.gamesPlayed} games</span>
                    <span>•</span>
                    <span>{entry.correctAnswers} correct</span>
                    <span>•</span>
                    <span>{(entry.avgResponseTime / 1000).toFixed(1)}s avg</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-[hsl(var(--primary-foreground))]">
                    {entry.totalScore}
                  </div>
                  <div className="text-xs text-muted-foreground">points</div>
                  <Badge className="mt-1 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
                    High: {entry.highScore}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
