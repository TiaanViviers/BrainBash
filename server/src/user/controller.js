/**
 * User Controller
 * 
 * Handles HTTP requests for user-related operations.
 * Validates input and delegates business logic to the service layer.
 */

import * as userService from './service.js';

// List all users (admin)
export const listUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ ok: true, users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Failed to fetch users." });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!["PLAYER", "ADMIN"].includes(role)) {
    return res.status(400).json({ ok: false, error: "Invalid role." });
  }

  try {
    const user = await userService.changeUserRole(userId, role);
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Failed to update user role." });
  }
};

/**
 * Search users by username
 * GET /api/users/search?q=username&limit=10
 */
export async function searchUsers(req, res, next) {
  try {
    const { q, limit = 10 } = req.query;

    // Validation
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Query parameter "q" is required and must be a non-empty string'
      });
    }

    if (q.trim().length < 2) {
      return res.status(400).json({
        ok: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    // Validate limit
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({
        ok: false,
        error: 'Limit must be a number between 1 and 50'
      });
    }

    const users = await userService.searchUsersByUsername(q.trim(), parsedLimit);

    res.json({
      ok: true,
      users,
      count: users.length
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user by ID (public profile info only)
 * GET /api/users/:userId
 */
export async function getUserById(req, res, next) {
  try {
    const { userId } = req.params;

    // Validation
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId) || parsedUserId < 1) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid user ID'
      });
    }

    const user = await userService.getUserById(parsedUserId);

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: 'User not found'
      });
    }

    res.json({
      ok: true,
      user
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user's profile
 * GET /api/user/profile
 */
export async function getMyProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const profile = await userService.getMyProfile(userId);

    if (!profile) {
      return res.status(404).json({
        ok: false,
        error: 'Profile not found'
      });
    }

    res.json({
      ok: true,
      profile
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update current user's profile
 * PATCH /api/user/profile
 * Body: { username?, avatarId?, currentPassword?, newPassword? }
 */
export async function updateMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { username, avatarId, currentPassword, newPassword } = req.body;

    // Validation
    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Username must be a non-empty string'
        });
      }
      if (username.trim().length < 3) {
        return res.status(400).json({
          ok: false,
          error: 'Username must be at least 3 characters long'
        });
      }
      if (username.trim().length > 30) {
        return res.status(400).json({
          ok: false,
          error: 'Username must be at most 30 characters long'
        });
      }
    }

    if (avatarId !== undefined && avatarId !== null) {
      if (typeof avatarId !== 'string') {
        return res.status(400).json({
          ok: false,
          error: 'Avatar ID must be a string'
        });
      }
    }

    if (newPassword !== undefined) {
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        return res.status(400).json({
          ok: false,
          error: 'New password must be at least 8 characters long'
        });
      }
    }

    const updatedProfile = await userService.updateProfile(userId, {
      username: username?.trim(),
      avatarId,
      currentPassword,
      newPassword
    });

    res.json({
      ok: true,
      profile: updatedProfile,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    if (error.message === 'Username already taken' || 
        error.message === 'Current password is incorrect' ||
        error.message === 'Current password is required to change password') {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * Get current user's match history
 * GET /api/user/matches?limit=10&offset=0
 */
export async function getMyMatches(req, res, next) {
  try {
    const userId = req.user.id;
    const { limit = 10, offset = 0 } = req.query;

    // Validate limit
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({
        ok: false,
        error: 'Limit must be a number between 1 and 50'
      });
    }

    // Validate offset
    const parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        ok: false,
        error: 'Offset must be a non-negative number'
      });
    }

    const matches = await userService.getMatchHistory(userId, {
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json({
      ok: true,
      matches,
      count: matches.length,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete current user's account
 * DELETE /api/user/account
 * Body: { password }
 */
export async function deleteMyAccount(req, res, next) {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Validation
    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Password is required for account deletion'
      });
    }

    const result = await userService.deleteAccount(userId, password);

    res.json({
      ok: true,
      message: result.message
    });
  } catch (error) {
    if (error.message === 'Incorrect password') {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}

/**
 * Admin: Delete any user account
 * DELETE /api/users/:userId
 */
export async function adminDeleteUser(req, res, next) {
  try {
    const { userId } = req.params;

    // Validation
    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId) || parsedUserId < 1) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid user ID'
      });
    }

    // Don't allow admin to delete themselves
    if (req.user && req.user.id === parsedUserId) {
      return res.status(400).json({
        ok: false,
        error: 'Cannot delete your own account via admin panel'
      });
    }

    await userService.adminDeleteUser(parsedUserId);

    res.json({
      ok: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        ok: false,
        error: error.message
      });
    }
    next(error);
  }
}
