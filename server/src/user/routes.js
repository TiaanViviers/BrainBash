/**
 * User Routes
 * 
 * Endpoints for user management and search.
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../auth/middleware.js';
import * as userController from './controller.js';

const router = Router();

// Public routes

// === ADMIN ONLY ===
// GET all users
router.get("/", authenticateToken, requireAdmin, userController.listUsers);
// PATCH user role
router.patch("/:userId/role", authenticateToken, requireAdmin, userController.updateUserRole);
// DELETE user (admin)
router.delete("/:userId", authenticateToken, requireAdmin, userController.adminDeleteUser);

// Search users by username (for inviting to matches)
router.get('/search', userController.searchUsers);

// Protected routes (require authentication)
router.get('/me', authenticateToken, userController.getMyProfile);
router.put('/me', authenticateToken, userController.updateMyProfile);

// Get current user's full profile
router.get('/me/profile', authenticateToken, userController.getMyProfile);

// Update current user's profile
router.patch('/me/profile', authenticateToken, userController.updateMyProfile);

// Get current user's match history
router.get('/me/matches', authenticateToken, userController.getMyMatches);

// Delete current user's account
router.delete('/me/account', authenticateToken, userController.deleteMyAccount);

// Get user profile by ID (public info only)
router.get('/:userId', userController.getUserById);

export default router;
