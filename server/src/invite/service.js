/**
 * Match Invites Service
 * 
 * Business logic for match invitation system.
 * Handles invite creation, acceptance, rejection, and validation.
 */

import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

/**
 * Create a new match invitation
 */
export async function createInvite(matchId, senderId, recipientId) {
  // Check if match exists and hasn't started
  const match = await prisma.matches.findUnique({
    where: { match_id: matchId },
    include: {
      match_players: true,
      match_invites: {
        where: {
          recipient_id: recipientId,
          status: 'PENDING'
        }
      }
    }
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status === 'in_progress' || match.status === 'completed') {
    throw new Error('Cannot invite to a match that has already started or finished');
  }

  // Check if recipient already has a pending invite
  if (match.match_invites.length > 0) {
    throw new Error('User already has a pending invite for this match');
  }

  // Check if recipient is already in the match
  const alreadyInMatch = match.match_players.some(
    player => player.user_id === recipientId
  );
  if (alreadyInMatch) {
    throw new Error('User is already in this match');
  }

  // Check if recipient exists
  const recipient = await prisma.users.findUnique({
    where: { user_id: recipientId }
  });

  if (!recipient) {
    throw new Error('Recipient user not found');
  }

  // Create the invite
  const invite = await prisma.match_invites.create({
    data: {
      match_id: matchId,
      sender_id: senderId,
      recipient_id: recipientId,
      status: 'PENDING',
      sent_at: new Date()
    },
    include: {
      match: {
        include: {
          host: {
            select: {
              user_id: true,
              username: true,
              avatar_url: true
            }
          }
        }
      },
      sender: {
        select: {
          user_id: true,
          username: true,
          avatar_url: true
        }
      },
      recipient: {
        select: {
          user_id: true,
          username: true,
          avatar_url: true
        }
      }
    }
  });

  return transformInvite(invite);
}

/**
 * Get invites received by a user
 */
export async function getReceivedInvites(userId, status = null) {
  const where = {
    recipient_id: userId
  };

  if (status) {
    where.status = status;
  }

  const invites = await prisma.match_invites.findMany({
    where,
    include: {
      match: {
        include: {
          host: {
            select: {
              user_id: true,
              username: true,
              avatar_url: true
            }
          },
          match_players: {
            select: {
              user_id: true
            }
          }
        }
      },
      sender: {
        select: {
          user_id: true,
          username: true,
          avatar_url: true
        }
      }
    },
    orderBy: {
      sent_at: 'desc'
    }
  });

  return invites.map(transformInvite);
}

/**
 * Get invites sent by a user
 */
export async function getSentInvites(userId, status = null) {
  const where = {
    sender_id: userId
  };

  if (status) {
    where.status = status;
  }

  const invites = await prisma.match_invites.findMany({
    where,
    include: {
      match: {
        include: {
          host: {
            select: {
              user_id: true,
              username: true,
              avatar_url: true
            }
          }
        }
      },
      recipient: {
        select: {
          user_id: true,
          username: true,
          avatar_url: true
        }
      }
    },
    orderBy: {
      sent_at: 'desc'
    }
  });

  return invites.map(transformInvite);
}

/**
 * Get all invites for a specific match (host only)
 */
export async function getMatchInvites(matchId, requestingUserId) {
  // Verify the requesting user is the host
  const match = await prisma.matches.findUnique({
    where: { match_id: matchId }
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.host_id !== requestingUserId) {
    throw new Error('You are not authorized to view invites for this match');
  }

  const invites = await prisma.match_invites.findMany({
    where: { match_id: matchId },
    include: {
      sender: {
        select: {
          user_id: true,
          username: true,
          avatar_url: true
        }
      },
      recipient: {
        select: {
          user_id: true,
          username: true,
          avatar_url: true,
          status: true
        }
      }
    },
    orderBy: {
      sent_at: 'desc'
    }
  });

  return invites.map(transformInvite);
}

/**
 * Accept an invite (adds user to match_players)
 */
export async function acceptInvite(inviteId, userId) {
  // Get the invite
  const invite = await prisma.match_invites.findUnique({
    where: { invite_id: inviteId },
    include: {
      match: true
    }
  });

  if (!invite) {
    throw new Error('Invite not found');
  }

  if (invite.recipient_id !== userId) {
    throw new Error('You are not authorized to accept this invite');
  }

  if (invite.status !== 'PENDING') {
    throw new Error('This invite has already been responded to');
  }

  if (invite.match.status === 'in_progress' || invite.match.status === 'completed') {
    throw new Error('Cannot accept invite for a match that has already started or finished');
  }

  // Use a transaction to update invite and add player to match
  const result = await prisma.$transaction(async (tx) => {
    // Update invite status
    const updatedInvite = await tx.match_invites.update({
      where: { invite_id: inviteId },
      data: {
        status: 'ACCEPTED',
        responded_at: new Date()
      },
      include: {
        match: {
          include: {
            host: {
              select: {
                user_id: true,
                username: true,
                avatar_url: true
              }
            }
          }
        },
        sender: {
          select: {
            user_id: true,
            username: true,
            avatar_url: true
          }
        },
        recipient: {
          select: {
            user_id: true,
            username: true,
            avatar_url: true
          }
        }
      }
    });

    // Add player to match
    const matchPlayer = await tx.match_players.create({
      data: {
        match_id: invite.match_id,
        user_id: userId,
        score: 0,
        joined_at: new Date()
      },
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            avatar_url: true
          }
        }
      }
    });

    return {
      invite: transformInvite(updatedInvite),
      matchPlayer: {
        matchPlayerId: matchPlayer.match_players_id,
        matchId: matchPlayer.match_id,
        userId: matchPlayer.user_id,
        score: matchPlayer.score,
        joinedAt: matchPlayer.joined_at,
        user: matchPlayer.user
      }
    };
  });

  return result;
}

/**
 * Decline an invite
 */
export async function declineInvite(inviteId, userId) {
  // Get the invite
  const invite = await prisma.match_invites.findUnique({
    where: { invite_id: inviteId }
  });

  if (!invite) {
    throw new Error('Invite not found');
  }

  if (invite.recipient_id !== userId) {
    throw new Error('You are not authorized to decline this invite');
  }

  if (invite.status !== 'PENDING') {
    throw new Error('This invite has already been responded to');
  }

  // Update invite status
  const updatedInvite = await prisma.match_invites.update({
    where: { invite_id: inviteId },
    data: {
      status: 'DECLINED',
      responded_at: new Date()
    },
    include: {
      match: {
        include: {
          host: {
            select: {
              user_id: true,
              username: true,
              avatar_url: true
            }
          }
        }
      },
      sender: {
        select: {
          user_id: true,
          username: true,
          avatar_url: true
        }
      },
      recipient: {
        select: {
          user_id: true,
          username: true,
          avatar_url: true
        }
      }
    }
  });

  return transformInvite(updatedInvite);
}

/**
 * Cancel an invite (sender only)
 */
export async function cancelInvite(inviteId, userId) {
  // Get the invite
  const invite = await prisma.match_invites.findUnique({
    where: { invite_id: inviteId }
  });

  if (!invite) {
    throw new Error('Invite not found');
  }

  if (invite.sender_id !== userId) {
    throw new Error('Only the sender can cancel this invite');
  }

  if (invite.status !== 'PENDING') {
    throw new Error('Cannot cancel an invite that has already been responded to');
  }

  // Delete the invite
  await prisma.match_invites.delete({
    where: { invite_id: inviteId }
  });
}

/**
 * Transform invite data to clean format
 */
function transformInvite(invite) {
  return {
    inviteId: invite.invite_id,
    matchId: invite.match_id,
    senderId: invite.sender_id,
    recipientId: invite.recipient_id,
    status: invite.status,
    sentAt: invite.sent_at,
    respondedAt: invite.responded_at,
    match: invite.match ? {
      matchId: invite.match.match_id,
      status: invite.match.status,
      difficulty: invite.match.difficulty,
      startTime: invite.match.start_time,
      createdAt: invite.match.created_at,
      host: invite.match.host,
      playerCount: invite.match.match_players?.length || 0
    } : undefined,
    sender: invite.sender,
    recipient: invite.recipient
  };
}
