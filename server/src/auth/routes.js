/**
 * Authentication Routes
 * 
 * Public authentication endpoints:
 * - POST /api/auth/register - Create new account
 * - POST /api/auth/login - Login with credentials
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/logout - Logout (requires auth)
 * - GET /api/auth/me - Get current user (requires auth)
 */

import { Router } from 'express';
import * as controller from './controller.js';
import { authenticateToken } from './middleware.js';

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================

// Register new user
router.post('/register', controller.register);

// Login with email and password
router.post('/login', controller.login);

// Refresh access token using refresh token
router.post('/refresh', controller.refresh);

// ========================================
// PROTECTED ROUTES
// ========================================

// Logout (requires authentication)
router.post('/logout', authenticateToken, controller.logout);

// Get current user info (requires authentication)
router.get('/me', authenticateToken, controller.getMe);

export default router;
