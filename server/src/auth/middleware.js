/**
 * Authentication Middleware
 * 
 * Middleware functions for protecting routes and verifying JWT tokens.
 * 
 * Usage:
 *   app.use('/api/protected', authenticateToken, protectedRoutes);
 *   app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes);
 */

import * as authService from './service.js';

/**
 * Middleware to authenticate JWT token
 * Extracts token from Authorization header and verifies it
 * Attaches user info to req.user for downstream handlers
 * 
 * Usage:
 *   router.get('/protected', authenticateToken, (req, res) => {
 *     console.log(req.user); // { id, username, email, role }
 *   });
 */
export function authenticateToken(req, res, next) {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      ok: false,
      error: 'Authentication required',
      message: 'No access token provided'
    });
  }
  
  try {
    // Verify token and extract payload
    const decoded = authService.verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error.message === 'Access token expired') {
      return res.status(401).json({
        ok: false,
        error: 'Token expired',
        message: 'Access token has expired. Please refresh your token.'
      });
    }
    
    return res.status(403).json({
      ok: false,
      error: 'Invalid token',
      message: error.message
    });
  }
}

/**
 * Middleware to require admin role
 * Must be used AFTER authenticateToken middleware
 * 
 * Usage:
 *   router.post('/admin-only', authenticateToken, requireAdmin, (req, res) => {
 *     // Only admins can access this
 *   });
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      ok: false,
      error: 'Authentication required',
      message: 'Please authenticate first'
    });
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      ok: false,
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  
  next();
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 * Useful for endpoints that change behavior based on auth state
 * 
 * Usage:
 *   router.get('/public-but-personalized', optionalAuth, (req, res) => {
 *     if (req.user) {
 *       // Show personalized content
 *     } else {
 *       // Show generic content
 *     }
 *   });
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return next(); // No token, continue without user
  }
  
  try {
    const decoded = authService.verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    // Token invalid, ok for optional auth
  }
  
  next();
}
