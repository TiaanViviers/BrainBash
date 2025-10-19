/**
 * Match Invites Controller
 * 
 * Handles HTTP requests for match invitation operations.
 * Validates input and delegates business logic to the service layer.
 */

import * as inviteService from './service.js';

/**
 * Send a match invitation
 * POST /api/invites
 * Body: { matchId, recipientId, senderId }
 */
export async function sendInvite(req, res, next) {
  try {
    const { matchId, recipientId, senderId } = req.body;

    // Validation
    if (!matchId || !recipientId || !senderId) {
      return res.status(400).json({
        ok: false,
        error: 'matchId, recipientId, and senderId are required'
      });
    }

    const parsedMatchId = parseInt(matchId, 10);
    const parsedRecipientId = parseInt(recipientId, 10);
    const parsedSenderId = parseInt(senderId, 10);

    if (isNaN(parsedMatchId) || isNaN(parsedRecipientId) || isNaN(parsedSenderId)) {
      return res.status(400).json({
        ok: false,
        error: 'matchId, recipientId, and senderId must be valid numbers'
      });
    }

    if (parsedRecipientId === parsedSenderId) {
      return res.status(400).json({
        ok: false,
        error: 'Cannot invite yourself'
      });
    }

    const invite = await inviteService.createInvite(
      parsedMatchId,
      parsedSenderId,
      parsedRecipientId
    );

    res.status(201).json({
      ok: true,
      invite
    });
  } catch (error) {
    // Handle specific business logic errors
    if (error.message.includes('already invited') || 
        error.message.includes('already in match') ||
        error.message.includes('already started')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * Get invites I've received
 * GET /api/invites/received?userId=1&status=pending
 */
export async function getReceivedInvites(req, res, next) {
  try {
    const { userId, status } = req.query;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: 'userId query parameter is required'
      });
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return res.status(400).json({
        ok: false,
        error: 'userId must be a valid number'
      });
    }

    // Validate status if provided
    if (status && !['pending', 'accepted', 'declined'].includes(status.toLowerCase())) {
      return res.status(400).json({
        ok: false,
        error: 'status must be one of: pending, accepted, declined'
      });
    }

    // Convert status to uppercase for database enum
    const upperStatus = status ? status.toUpperCase() : null;
    const invites = await inviteService.getReceivedInvites(parsedUserId, upperStatus);

    res.json({
      ok: true,
      invites,
      count: invites.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get invites I've sent
 * GET /api/invites/sent?userId=1&status=pending
 */
export async function getSentInvites(req, res, next) {
  try {
    const { userId, status } = req.query;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: 'userId query parameter is required'
      });
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      return res.status(400).json({
        ok: false,
        error: 'userId must be a valid number'
      });
    }

    // Validate status if provided
    if (status && !['pending', 'accepted', 'declined'].includes(status.toLowerCase())) {
      return res.status(400).json({
        ok: false,
        error: 'status must be one of: pending, accepted, declined'
      });
    }

    // Convert status to uppercase for database enum
    const upperStatus = status ? status.toUpperCase() : null;
    const invites = await inviteService.getSentInvites(parsedUserId, upperStatus);

    res.json({
      ok: true,
      invites,
      count: invites.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all invites for a specific match
 * GET /api/invites/match/:matchId?userId=1
 */
export async function getMatchInvites(req, res, next) {
  try {
    const { matchId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: 'userId query parameter is required (to verify host)'
      });
    }

    const parsedMatchId = parseInt(matchId, 10);
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedMatchId) || isNaN(parsedUserId)) {
      return res.status(400).json({
        ok: false,
        error: 'matchId and userId must be valid numbers'
      });
    }

    const invites = await inviteService.getMatchInvites(parsedMatchId, parsedUserId);

    res.json({
      ok: true,
      invites,
      count: invites.length
    });
  } catch (error) {
    if (error.message.includes('not authorized')) {
      return res.status(403).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * Accept an invite
 * PUT /api/invites/:inviteId/accept
 * Body: { userId }
 */
export async function acceptInvite(req, res, next) {
  try {
    const { inviteId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: 'userId is required in request body'
      });
    }

    const parsedInviteId = parseInt(inviteId, 10);
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedInviteId) || isNaN(parsedUserId)) {
      return res.status(400).json({
        ok: false,
        error: 'inviteId and userId must be valid numbers'
      });
    }

    const result = await inviteService.acceptInvite(parsedInviteId, parsedUserId);

    res.json({
      ok: true,
      message: 'Invite accepted successfully',
      invite: result.invite,
      matchPlayer: result.matchPlayer
    });
  } catch (error) {
    if (error.message.includes('not found') || 
        error.message.includes('not authorized') ||
        error.message.includes('already responded')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * Decline an invite
 * PUT /api/invites/:inviteId/decline
 * Body: { userId }
 */
export async function declineInvite(req, res, next) {
  try {
    const { inviteId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: 'userId is required in request body'
      });
    }

    const parsedInviteId = parseInt(inviteId, 10);
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedInviteId) || isNaN(parsedUserId)) {
      return res.status(400).json({
        ok: false,
        error: 'inviteId and userId must be valid numbers'
      });
    }

    const invite = await inviteService.declineInvite(parsedInviteId, parsedUserId);

    res.json({
      ok: true,
      message: 'Invite declined successfully',
      invite
    });
  } catch (error) {
    if (error.message.includes('not found') || 
        error.message.includes('not authorized') ||
        error.message.includes('already responded')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * Cancel an invite (sender only)
 * DELETE /api/invites/:inviteId?userId=1
 */
export async function cancelInvite(req, res, next) {
  try {
    const { inviteId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: 'userId query parameter is required'
      });
    }

    const parsedInviteId = parseInt(inviteId, 10);
    const parsedUserId = parseInt(userId, 10);

    if (isNaN(parsedInviteId) || isNaN(parsedUserId)) {
      return res.status(400).json({
        ok: false,
        error: 'inviteId and userId must be valid numbers'
      });
    }

    await inviteService.cancelInvite(parsedInviteId, parsedUserId);

    res.json({
      ok: true,
      message: 'Invite cancelled successfully'
    });
  } catch (error) {
    if (error.message.includes('not found') || 
        error.message.includes('not authorized')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}
