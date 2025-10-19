/**
 * User Service
 * 
 * Business logic for user operations.
 * Interacts with the database via Prisma.
 */

import bcrypt from 'bcryptjs';
import { isValidAvatarId } from '../avatars/config.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// Get all users (admin)
export const getAllUsers = async () => {
  return prisma.users.findMany({
    select: { user_id: true, username: true, email: true, role: true },
    orderBy: { username: 'asc' },
  });
};

// Update user role
export const changeUserRole = async (userId, role) => {
  return prisma.users.update({
    where: { user_id: parseInt(userId) },
    data: { role },
    select: { user_id: true, username: true, email: true, role: true },
  });
};

/**
 * Search users by username (case-insensitive, partial match)
 * Returns public user info only (no sensitive data)
 */
export async function searchUsersByUsername(query, limit = 10) {
  const users = await prisma.users.findMany({
    where: {
      username: {
        contains: query,
        mode: 'insensitive' // case-insensitive search
      }
    },
    select: {
      user_id: true,
      username: true,
      avatar_url: true,
      status: true,
      created_at: true,
      // Optionally include basic stats
      user_stats: {
        select: {
          games_played: true,
          games_won: true,
          total_score: true,
          average_score: true
        }
      }
    },
    take: limit,
    orderBy: {
      username: 'asc'
    }
  });

  // Transform to cleaner format
  return users.map(user => ({
    userId: user.user_id,
    username: user.username,
    avatarUrl: user.avatar_url,
    status: user.status,
    createdAt: user.created_at,
    stats: user.user_stats ? {
      gamesPlayed: user.user_stats.games_played,
      gamesWon: user.user_stats.games_won,
      totalScore: user.user_stats.total_score,
      averageScore: user.user_stats.average_score
    } : null
  }));
}

/**
 * Get user by ID (public profile only)
 */
export async function getUserById(userId) {
  const user = await prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      username: true,
      avatar_url: true,
      status: true,
      role: true,
      created_at: true,
      user_stats: {
        select: {
          games_played: true,
          games_won: true,
          total_score: true,
          highest_score: true,
          average_score: true,
          correct_answers: true,
          total_answers: true,
          avg_response_time: true,
          last_played_at: true
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  // Transform to cleaner format
  return {
    userId: user.user_id,
    username: user.username,
    avatarUrl: user.avatar_url,
    status: user.status,
    role: user.role,
    createdAt: user.created_at,
    stats: user.user_stats ? {
      gamesPlayed: user.user_stats.games_played,
      gamesWon: user.user_stats.games_won,
      totalScore: user.user_stats.total_score,
      highestScore: user.user_stats.highest_score,
      averageScore: user.user_stats.average_score,
      correctAnswers: user.user_stats.correct_answers,
      totalAnswers: user.user_stats.total_answers,
      accuracy: user.user_stats.total_answers > 0 
        ? ((user.user_stats.correct_answers / user.user_stats.total_answers) * 100).toFixed(1)
        : 0,
      avgResponseTime: user.user_stats.avg_response_time,
      lastPlayedAt: user.user_stats.last_played_at
    } : null
  };
}

/**
 * Get current user's full profile (includes email)
 * This is for the authenticated user viewing their own profile
 */
export async function getMyProfile(userId) {
  const user = await prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      username: true,
      email: true,
      avatar_url: true,
      status: true,
      role: true,
      created_at: true,
      user_stats: {
        select: {
          games_played: true,
          games_won: true,
          total_score: true,
          highest_score: true,
          average_score: true,
          correct_answers: true,
          total_answers: true,
          avg_response_time: true,
          last_played_at: true
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatar_url,
    status: user.status,
    role: user.role,
    memberSince: user.created_at,
    stats: user.user_stats ? {
      gamesPlayed: user.user_stats.games_played,
      gamesWon: user.user_stats.games_won,
      totalScore: user.user_stats.total_score,
      highestScore: user.user_stats.highest_score,
      averageScore: user.user_stats.average_score,
      correctAnswers: user.user_stats.correct_answers,
      totalAnswers: user.user_stats.total_answers,
      accuracy: user.user_stats.total_answers > 0 
        ? parseFloat(((user.user_stats.correct_answers / user.user_stats.total_answers) * 100).toFixed(1))
        : 0,
      avgResponseTime: user.user_stats.avg_response_time,
      lastPlayedAt: user.user_stats.last_played_at
    } : null
  };
}

/**
 * Update user profile
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update
 * @param {string} [updates.username] - New username
 * @param {string} [updates.avatarId] - New avatar ID (from preset list)
 * @param {string} [updates.currentPassword] - Current password (required if changing password)
 * @param {string} [updates.newPassword] - New password
 */
export async function updateProfile(userId, updates) {
  const { username, avatarId, currentPassword, newPassword } = updates;

  // Get current user data
  const user = await prisma.users.findUnique({
    where: { user_id: userId },
    select: { 
      user_id: true, 
      username: true, 
      password_hash: true 
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const updateData = {};

  // Update username if provided
  if (username !== undefined && username !== user.username) {
    // Check if username is already taken
    const existingUser = await prisma.users.findUnique({
      where: { username }
    });

    if (existingUser && existingUser.user_id !== userId) {
      throw new Error('Username already taken');
    }

    updateData.username = username;
  }

  // Update avatar if provided
  if (avatarId !== undefined) {
    // Validate avatar ID
    if (!isValidAvatarId(avatarId)) {
      throw new Error('Invalid avatar ID. Must be one of: andrew, brian, bubbles, choomah, clarence, homer, nick, stewie');
    }
    updateData.avatar_url = avatarId.toLowerCase();
  }

  // Update password if requested
  if (newPassword) {
    if (!currentPassword) {
      throw new Error('Current password is required to change password');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    const saltRounds = 12;
    updateData.password_hash = await bcrypt.hash(newPassword, saltRounds);
  }

  // If no updates, return current profile
  if (Object.keys(updateData).length === 0) {
    return getMyProfile(userId);
  }

  // Update user
  await prisma.users.update({
    where: { user_id: userId },
    data: updateData
  });

  // Return updated profile
  return getMyProfile(userId);
}

/**
 * Get user's match history
 * @param {number} userId - User ID
 * @param {Object} options - Pagination options
 * @param {number} [options.limit=10] - Number of matches to return
 * @param {number} [options.offset=0] - Number of matches to skip
 */
export async function getMatchHistory(userId, { limit = 10, offset = 0 } = {}) {
  const matches = await prisma.matches.findMany({
    where: {
      match_players: {
        some: {
          user_id: userId
        }
      },
      status: 'FINISHED'
    },
    include: {
      match_players: {
        include: {
          user: {
            select: {
              user_id: true,
              username: true,
              avatar_url: true
            }
          }
        },
        orderBy: {
          score: 'desc'
        }
      },
      scores: {
        where: {
          user_id: userId
        }
      }
    },
    orderBy: {
      end_time: 'desc'
    },
    take: limit,
    skip: offset
  });

  return matches.map(match => {
    const userScore = match.scores[0];
    const playerRank = match.match_players.findIndex(p => p.user_id === userId) + 1;
    const totalPlayers = match.match_players.length;

    return {
      matchId: match.match_id,
      status: match.status,
      difficulty: match.difficulty,
      startTime: match.start_time,
      endTime: match.end_time,
      myScore: userScore ? {
        totalScore: userScore.total_score,
        correctAnswers: userScore.correct_answers,
        totalQuestions: userScore.total_questions,
        avgResponseTime: userScore.avg_response_time
      } : null,
      placement: {
        rank: playerRank,
        totalPlayers: totalPlayers
      },
      players: match.match_players.map(p => ({
        userId: p.user.user_id,
        username: p.user.username,
        avatarUrl: p.user.avatar_url,
        score: p.score
      })),
      winner: match.match_players[0]?.user_id === userId
    };
  });
}

/**
 * Delete user account
 * @param {number} userId - User ID
 * @param {string} password - Password confirmation
 */
export async function deleteAccount(userId, password) {
  // Get user with password
  const user = await prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      username: true,
      password_hash: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Incorrect password');
  }

  const deletedHash = await bcrypt.hash(`DELETED_${userId}_${Date.now()}`, 12);
  
  await prisma.users.update({
    where: { user_id: userId },
    data: {
      username: `Deleted User ${userId}`,
      email: `deleted_${userId}@deleted.local`,
      password_hash: deletedHash,
      avatar_url: null,
      status: 'OFFLINE'
    }
  });

  return { success: true, message: 'Account deleted successfully' };
}

/**
 * Admin: Delete any user account (no password required)
 */
export async function adminDeleteUser(userId) {
  const user = await prisma.users.findUnique({
    where: { user_id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const deletedHash = await bcrypt.hash(`DELETED_${userId}_${Date.now()}`, 12);
  
  await prisma.users.update({
    where: { user_id: userId },
    data: {
      username: `Deleted User ${userId}`,
      email: `deleted_${userId}@deleted.local`,
      password_hash: deletedHash,
      avatar_url: null,
      status: 'OFFLINE',
      role: 'PLAYER'
    }
  });

  return { success: true, message: 'User deleted successfully' };
}
