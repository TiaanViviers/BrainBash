/**
 * Authentication Controller
 * 
 * HTTP request handlers for authentication endpoints.
 * Validates input, calls service layer, returns responses.
 */

import * as authService from './service.js';

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { username, email, password, avatarId? }
 */
export async function register(req, res) {
  try {
    const { username, email, password, avatarId } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Validation error',
        message: 'Username, email, and password are required'
      });
    }
    
    // Register user
    const result = await authService.registerUser({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      avatarId
    });
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
      ok: true,
      message: 'Registration successful',
      user: result.user,
      accessToken: result.accessToken
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific errors
    if (error.message.includes('Username already taken') || 
        error.message.includes('Email already registered')) {
      return res.status(409).json({
        ok: false,
        error: 'Conflict',
        message: error.message
      });
    }
    
    if (error.message.includes('Invalid email') || 
        error.message.includes('Username must') ||
        error.message.includes('Password must')) {
      return res.status(400).json({
        ok: false,
        error: 'Validation error',
        message: error.message
      });
    }
    
    res.status(500).json({
      ok: false,
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
}

/**
 * Login user
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }
    
    // Login user
    const result = await authService.loginUser({
      email: email.trim().toLowerCase(),
      password
    });
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      ok: true,
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }
    
    res.status(500).json({
      ok: false,
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
}

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh
 * Reads refresh token from HTTP-only cookie
 */
export async function refresh(req, res) {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        ok: false,
        error: 'Authentication required',
        message: 'No refresh token provided'
      });
    }
    
    // Refresh access token
    const result = await authService.refreshAccessToken(refreshToken);
    
    res.json({
      ok: true,
      message: 'Token refreshed',
      accessToken: result.accessToken
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.message.includes('expired') || error.message.includes('Invalid')) {
      // Clear invalid refresh token
      res.clearCookie('refreshToken');
      
      return res.status(401).json({
        ok: false,
        error: 'Token expired',
        message: 'Please log in again'
      });
    }
    
    res.status(500).json({
      ok: false,
      error: 'Token refresh failed',
      message: 'An error occurred during token refresh'
    });
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 * Requires authentication
 */
export async function logout(req, res) {
  try {
    // Update user status to OFFLINE
    if (req.user?.id) {
      await authService.logoutUser(req.user.id);
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({
      ok: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookie even if database update fails
    res.clearCookie('refreshToken');
    
    res.status(500).json({
      ok: false,
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
}

/**
 * Get current user info
 * GET /api/auth/me
 * Requires authentication
 */
export async function getMe(req, res) {
  try {
    // User info already attached by authenticateToken middleware
    res.json({
      ok: true,
      user: {
        userId: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
    
  } catch (error) {
    console.error('Get me error:', error);
    
    res.status(500).json({
      ok: false,
      error: 'Failed to get user info',
      message: error.message
    });
  }
}
