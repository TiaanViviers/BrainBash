/**
 * Leaderboard Service
 * 
 * Business logic for leaderboard rankings and statistics.
 * Handles complex queries with aggregations, filtering, and ranking.
 * 
 * NOTE: Work with Jaiden on optimizing these queries.
 * Consider adding database indexes on:
 *   - user_stats.total_score
 *   - user_stats.highest_score
 *   - scores.match_id (with end_time)
 */

import { MatchStatus, PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// ========================================
// MAIN LEADERBOARD FUNCTION
// ========================================

/**
 * Get leaderboard with filters
 * 
 * @param {Object} params - { period, category?, limit, page }
 * @returns {Promise<Object>} { players: Array, total: number }
 */
export async function getLeaderboard({ period, category, limit, page }) {
  const skip = (page - 1) * limit;
  
  // Build the query based on period and category
  let players;
  let total;
  
  if (period === 'all') {
    // All-time leaderboard from user_stats table
    const result = await getAllTimeLeaderboard({ category, limit, skip });
    players = result.players;
    total = result.total;
  } else if (period === 'weekly') {
    // Weekly leaderboard
    const result = await getWeeklyLeaderboard({ category, limit, skip });
    players = result.players;
    total = result.total;
  } else if (period === 'daily') {
    // Daily leaderboard
    const result = await getDailyLeaderboard({ category, limit, skip });
    players = result.players;
    total = result.total;
  }
  
  // Add rank numbers
  const rankedPlayers = players.map((player, index) => ({
    rank: skip + index + 1,
    ...player
  }));
  
  return { players: rankedPlayers, total };
}

// ========================================
// PERIOD-SPECIFIC LEADERBOARDS
// ========================================

/**
 * All-time leaderboard from user_stats
 */
async function getAllTimeLeaderboard({ category, limit, skip }) {
  const where = {};
  
  // Filter by category if specified
  if (category) {
    const categoryRecord = await prisma.categories.findUnique({
      where: { name: category },
      select: { category_id: true }
    });
    
    if (!categoryRecord) {
      throw new Error(`Category '${category}' not found`);
    }
    
    where.best_category = categoryRecord.category_id;
  }
  
  const [stats, total] = await Promise.all([
    prisma.user_stats.findMany({
      where,
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            avatar_url: true,
            created_at: true
          }
        },
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { total_score: 'desc' },
        { games_won: 'desc' },
        { avg_response_time: 'asc' }
      ],
      skip,
      take: limit
    }),
    prisma.user_stats.count({ where })
  ]);
  
  const players = stats.map(stat => ({
    userId: stat.user.user_id,
    username: stat.user.username,
    avatarUrl: stat.user.avatar_url,
    totalScore: stat.total_score,
    gamesPlayed: stat.games_played,
    gamesWon: stat.games_won,
    averageScore: stat.average_score,
    highestScore: stat.highest_score,
    highScore: stat.highest_score,
    correctAnswers: stat.correct_answers,
    totalAnswers: stat.total_answers,
    accuracy: stat.total_answers > 0 
      ? Math.round((stat.correct_answers / stat.total_answers) * 100) 
      : 0,
    avgResponseTime: stat.avg_response_time,
    averageResponseTime: stat.avg_response_time,
    bestCategory: stat.category?.name || null,
    memberSince: stat.user.created_at
  }));
  
  return { players, total };
}

/**
 * Weekly leaderboard - aggregate scores from last 7 days
 */
async function getWeeklyLeaderboard({ category, limit, skip }) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const matchWhere = {
    end_time: {
      gte: sevenDaysAgo
    },
    status: MatchStatus.COMPLETED
  };
  
  if (category) {
    const categoryRecord = await prisma.categories.findUnique({
      where: { name: category },
      select: { category_id: true }
    });
    
    if (!categoryRecord) {
      throw new Error(`Category '${category}' not found`);
    }
    
    matchWhere.match_rounds = {
      some: {
        category_id: categoryRecord.category_id
      }
    };
  }
  
  // Get all scores from qualifying matches
  const scores = await prisma.scores.findMany({
    where: {
      match: matchWhere
    },
    select: {
      user_id: true,
      total_score: true,
      user: {
        select: {
          username: true,
          avatar_url: true,
          created_at: true,
          user_stats: {
            select: {
              games_played: true,
              games_won: true,
              avg_response_time: true
            }
          }
        }
      }
    }
  });
  
  const userScores = new Map();
  
  scores.forEach(score => {
    const userId = score.user_id;
    if (!userScores.has(userId)) {
      userScores.set(userId, {
        userId,
        username: score.user.username,
        avatarUrl: score.user.avatar_url, 
        totalScore: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        avgResponseTime: score.user.user_stats?.avg_response_time || 0,
        averageResponseTime: score.user.user_stats?.avg_response_time || 0,
        memberSince: score.user.created_at
      });
    }
    
    const userData = userScores.get(userId);
    userData.totalScore += score.total_score;
    userData.gamesPlayed += 1;
  });
  
  // Convert to array and sort
  let players = Array.from(userScores.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    return a.averageResponseTime - b.averageResponseTime;
  });
  
  const total = players.length;
  players = players.slice(skip, skip + limit);
  
  // Calculate averages
  players = players.map(p => ({
    ...p,
    averageScore: p.gamesPlayed > 0 ? Math.round(p.totalScore / p.gamesPlayed) : 0
  }));
  
  return { players, total };
}

/**
 * Daily leaderboard - aggregate scores from last 24 hours
 */
async function getDailyLeaderboard({ category, limit, skip }) {
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const matchWhere = {
    end_time: {
      gte: oneDayAgo
    },
    status: MatchStatus.COMPLETED
  };
  
  if (category) {
    const categoryRecord = await prisma.categories.findUnique({
      where: { name: category },
      select: { category_id: true }
    });
    
    if (!categoryRecord) {
      throw new Error(`Category '${category}' not found`);
    }
    
    matchWhere.match_rounds = {
      some: {
        category_id: categoryRecord.category_id
      }
    };
  }
  
  const scores = await prisma.scores.findMany({
    where: {
      match: matchWhere
    },
    select: {
      user_id: true,
      total_score: true,
      user: {
        select: {
          username: true,
          avatar_url: true,
          created_at: true,
          user_stats: {
            select: {
              games_played: true,
              games_won: true,
              avg_response_time: true
            }
          }
        }
      }
    }
  });
  
  const userScores = new Map();
  
  scores.forEach(score => {
    const userId = score.user_id;
    if (!userScores.has(userId)) {
      userScores.set(userId, {
        userId,
        username: score.user.username,
        avatarUrl: score.user.avatar_url,
        totalScore: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        avgResponseTime: score.user.user_stats?.avg_response_time || 0,
        averageResponseTime: score.user.user_stats?.avg_response_time || 0,
        memberSince: score.user.created_at
      });
    }
    
    const userData = userScores.get(userId);
    userData.totalScore += score.total_score;
    userData.gamesPlayed += 1;
  });
  
  let players = Array.from(userScores.values()).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    return a.averageResponseTime - b.averageResponseTime;
  });
  
  const total = players.length;
  players = players.slice(skip, skip + limit);
  
  players = players.map(p => ({
    ...p,
    averageScore: p.gamesPlayed > 0 ? Math.round(p.totalScore / p.gamesPlayed) : 0
  }));
  
  return { players, total };
}

// ========================================
// USER-SPECIFIC FUNCTIONS
// ========================================

/**
 * Get a user's rank and stats
 */
export async function getUserRank({ userId, period, category }) {
  // Get full leaderboard (expensive, consider caching)
  const { players, total } = await getLeaderboard({
    period,
    category,
    limit: 10000, // Get all for ranking
    page: 1
  });
  
  const userIndex = players.findIndex(p => p.userId === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found in leaderboard');
  }
  
  return {
    rank: userIndex + 1,
    stats: players[userIndex],
    total
  };
}

/**
 * Get leaderboard context around a user
 * Shows players above and below for context
 */
export async function getUserLeaderboardContext({ userId, period, category, context }) {
  // Verify user exists
  const user = await prisma.users.findUnique({
    where: { user_id: userId },
    select: { user_id: true }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const { players } = await getLeaderboard({
    period,
    category,
    limit: 10000,
    page: 1
  });
  
  const userIndex = players.findIndex(p => p.userId === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found in leaderboard');
  }
  
  // Get context above and below
  const start = Math.max(0, userIndex - context);
  const end = Math.min(players.length, userIndex + context + 1);
  
  const contextPlayers = players.slice(start, end);
  const userPlayer = contextPlayers.find(p => p.userId === userId);
  const playersAbove = contextPlayers.filter(p => p.rank < userPlayer.rank);
  const playersBelow = contextPlayers.filter(p => p.rank > userPlayer.rank);
  
  return {
    user: userPlayer,
    playersAbove,
    playersBelow
  };
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get top N players (for homepage widgets, etc.)
 */
export async function getTopPlayers(limit = 10) {
  const { players } = await getAllTimeLeaderboard({
    category: undefined,
    limit,
    skip: 0
  });
  
  return players.map((player, index) => ({
    rank: index + 1,
    ...player
  }));
}

/**
 * Get category-specific leaderboards (all categories at once)
 */
export async function getCategoryLeaderboards(limit = 10) {
  const categories = await prisma.categories.findMany({
    select: { category_id: true, name: true }
  });
  
  const leaderboards = {};
  
  for (const cat of categories) {
    const { players } = await getAllTimeLeaderboard({
      category: cat.name,
      limit,
      skip: 0
    });
    
    leaderboards[cat.name] = players.map((player, index) => ({
      rank: index + 1,
      ...player
    }));
  }
  
  return leaderboards;
}
