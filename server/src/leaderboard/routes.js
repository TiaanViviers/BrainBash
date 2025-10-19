/**
 * Leaderboard Routes
 * 
 * Provides ranked player statistics and leaderboards.
 * 
 * Public routes:
 *   - GET /api/leaderboard - Get ranked players with filtering
 * 
 * Features:
 *   - Filter by time period (daily, weekly, all-time)
 *   - Filter by category
 *   - Pagination support
 *   - Multiple ranking metrics
 */

import { Router } from 'express';
import { authenticateToken } from '../auth/middleware.js';
import * as controller from './controller.js';

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================

/**
 * Get leaderboard with filters
 * Query params:
 *   - period: 'daily' | 'weekly' | 'all' (default: 'all')
 *   - category: category name (optional)
 *   - limit: number of results (default: 100, max: 500)
 *   - page: page number (default: 1)
 */
router.get('/', controller.getLeaderboard);

/**
 * Get current user's rank and stats
 * Requires authentication
 */
router.get('/me', authenticateToken, controller.getMyRank);

/**
 * Get leaderboard for a specific user
 * Shows their rank and nearby players
 */
router.get('/user/:userId', controller.getUserLeaderboard);

export default router;
