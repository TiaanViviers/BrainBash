import jwt from 'jsonwebtoken';
import * as matchService from './service.js';

/**
 * Helper: Get user from Bearer token
 */
export const getUserFromToken = async (authHeader) => {
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT payload:', payload); // Debug log
    
    // The JWT payload contains 'id', not 'userId'
    const userId = Number(payload.id);
    
    if (!userId || isNaN(userId)) {
      console.error('Invalid user ID from JWT payload:', payload);
      return null;
    }
    
    const user = await matchService.getUserById(userId);
    return user;
  } catch (err) {
    console.error('Invalid token:', err);
    return null;
  }
};

/**
 * GET /api/match
 * List all matches
 */
export const list = async (req, res) => {
  try {
    const matches = await matchService.getAllMatches();
    res.json({ ok: true, matches });
  } catch (e) {
    console.error('Error fetching matches:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};

/**
 * POST /api/match
 * Create a new match
 */
export const create = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { category, difficulty, amount, title, scheduledStart, players } = req.body;

    console.log('Creating match:', { category, difficulty, amount, players, userId: user.user_id });

    if (!category || !difficulty || !amount) {
      return res.status(400).json({ error: 'Category, difficulty, and amount are required' });
    }

    // Ensure host is in players array
    // Note: user object has user_id, not id
    const allPlayers = players && players.length ? players.map(Number) : [];
    if (!allPlayers.includes(user.user_id)) allPlayers.push(user.user_id);

    console.log('All players:', allPlayers);

    // Create match via service
    const result = await matchService.createMatch({
      title: title || `${difficulty} Trivia Match`,
      category,
      difficulty,
      amount,
      hostId: Number(user.user_id),
      players: allPlayers,
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null
    });

    console.log('Match created:', result);

    res.json({ ok: true, matchId: result.matchId, match: result });
  } catch (err) {
    console.error('Error creating match:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      ok: false,
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * GET /api/match/:id/state
 */
export const state = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const data = await matchService.getPublicState(matchId);
    res.json({ ok: true, ...data });
  } catch (e) {
    console.error('Error getting match state:', e);
    res.status(404).json({ ok: false, error: e.message });
  }
};

/**
 * POST /api/match/:id/answer
 */
export const answer = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const { userId, matchQuestionId, selectedOption, responseTimeMs } = req.body;
    const result = await matchService.submitAnswer(matchId, {
      userId, matchQuestionId, selectedOption, responseTimeMs
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('Error submitting answer:', e);
    res.status(400).json({ ok: false, error: e.message });
  }
};

/**
 * POST /api/match/:id/next
 */
export const advance = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const result = await matchService.nextQuestion(matchId);
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('Error advancing question:', e);
    res.status(400).json({ ok: false, error: e.message });
  }
};

/**
 * GET /api/match/:id/scoreboard
 */
export const scoreboard = async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const data = await matchService.getScoreboard(matchId);
    res.json({ ok: true, ...data });
  } catch (e) {
    console.error('Error fetching scoreboard:', e);
    res.status(404).json({ ok: false, error: e.message });
  }
};

/**
 * DELETE /api/match/:id
 * Delete a match (only host can delete)
 */
export const deleteMatch = async (req, res) => {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const matchId = parseInt(req.params.id);
    
    // Delete match (service will check if user is host)
    await matchService.deleteMatch(matchId, user.user_id);
    
    res.json({ ok: true, message: 'Match deleted successfully' });
  } catch (e) {
    console.error('Error deleting match:', e);
    const statusCode = e.message.includes('not found') ? 404 
                     : e.message.includes('Only the host') ? 403 
                     : 400;
    res.status(statusCode).json({ ok: false, error: e.message });
  }
};
