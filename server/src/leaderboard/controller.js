/**
 * Leaderboard Controller
 * 
 * Handles HTTP requests for leaderboard data.
 * Validates input, calls service layer, returns ranked players.
 */

import * as service from './service.js';

// ========================================
// PUBLIC CONTROLLERS
// ========================================

/**
 * Get leaderboard with filters
 * GET /api/leaderboard?period=weekly&category=Science&limit=50&page=1
 */
export async function getLeaderboard(req, res) {
  try {
    const { 
      period = 'all',
      category,
      limit = '100',
      page = '1'
    } = req.query;
    
    // Validation
    const validPeriods = ['daily', 'weekly', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }
    
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
      return res.status(400).json({
        ok: false,
        error: 'Limit must be between 1 and 500'
      });
    }
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid page number'
      });
    }
    
    const result = await service.getLeaderboard({
      period,
      category: category || undefined,
      limit: limitNum,
      page: pageNum
    });
    
    res.json({ 
      ok: true,
      leaderboard: result.players,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum)
      },
      period,
      category: category || null
    });
  } catch (error) {
    if (error.message.includes('Category not found')) {
      return res.status(404).json({ 
        ok: false, 
        error: error.message 
      });
    }
    
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch leaderboard',
      message: error.message 
    });
  }
}

/**
 * Get current user's rank and stats
 * GET /api/leaderboard/me
 */
export async function getMyRank(req, res) {
  try {
    // User ID comes from auth middleware (req.user)
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required'
      });
    }
    
    const { period = 'all', category } = req.query;
    
    const validPeriods = ['daily', 'weekly', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }
    
    const result = await service.getUserRank({
      userId: req.user.id,
      period,
      category: category || undefined
    });
    
    res.json({ 
      ok: true,
      rank: result.rank,
      stats: result.stats,
      total: result.total,
      period,
      category: category || null
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        ok: false, 
        error: error.message 
      });
    }
    
    console.error('Error getting user rank:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch user rank',
      message: error.message 
    });
  }
}

/**
 * Get leaderboard context for a specific user
 * Shows user's rank and players nearby
 * GET /api/leaderboard/user/:userId?period=all&category=Science
 */
export async function getUserLeaderboard(req, res) {
  try {
    const { userId } = req.params;
    const { period = 'all', category, context = '5' } = req.query;
    
    // Validation
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid user ID'
      });
    }
    
    const validPeriods = ['daily', 'weekly', 'all'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      });
    }
    
    const contextNum = parseInt(context);
    if (isNaN(contextNum) || contextNum < 1 || contextNum > 50) {
      return res.status(400).json({
        ok: false,
        error: 'Context must be between 1 and 50'
      });
    }
    
    const result = await service.getUserLeaderboardContext({
      userId: parseInt(userId),
      period,
      category: category || undefined,
      context: contextNum
    });
    
    res.json({ 
      ok: true,
      user: result.user,
      playersAbove: result.playersAbove,
      playersBelow: result.playersBelow,
      period,
      category: category || null
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ 
        ok: false, 
        error: error.message 
      });
    }
    
    console.error('Error getting user leaderboard:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch user leaderboard',
      message: error.message 
    });
  }
}
