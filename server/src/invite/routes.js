/**
 * Match Invites Routes
 * 
 * Endpoints for sending, receiving, and managing match invitations.
 * Allows hosts to invite players to matches and players to respond to invites.
 */

import { Router } from 'express';
import * as inviteController from './controller.js';

const router = Router();

// Send a match invitation
router.post('/', inviteController.sendInvite);

// Get invites I've received (as recipient)
router.get('/received', inviteController.getReceivedInvites);

// Get invites I've sent (as sender)
router.get('/sent', inviteController.getSentInvites);

// Get all invites for a specific match (host only, validation in controller)
router.get('/match/:matchId', inviteController.getMatchInvites);

// Accept an invite
router.put('/:inviteId/accept', inviteController.acceptInvite);

// Decline an invite
router.put('/:inviteId/decline', inviteController.declineInvite);

// Cancel an invite (sender only)
router.delete('/:inviteId', inviteController.cancelInvite);

export default router;
