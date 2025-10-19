/**
 * Authentication Service
 * 
 * Core business logic for user authentication:
 * - Password hashing and verification (bcrypt)
 * - JWT token generation and validation
 * - User registration and login
 * 
 * Security features:
 * - bcrypt with 12 salt rounds (per project spec: ≥12)
 * - Access tokens (15 min expiry)
 * - Refresh tokens (7 day expiry)
 * - Email validation
 * - Password strength requirements
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DEFAULT_AVATAR, isValidAvatarId } from '../avatars/config.js';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// Token expiry times
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// Password requirements
const MIN_PASSWORD_LENGTH = 8;

// ========================================
// PASSWORD UTILITIES
// ========================================

/**
 * Hash a plain text password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare plain text password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ========================================
// JWT TOKEN UTILITIES
// ========================================

/**
 * Generate JWT access token (short-lived)
 * @param {object} user - User object { user_id, username, email, role }
 * @returns {string} JWT access token
 */
export function generateAccessToken(user) {
  const payload = {
    id: user.user_id,
    username: user.username,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
}

/**
 * Generate JWT refresh token (long-lived)
 * @param {object} user - User object { user_id }
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(user) {
  const payload = {
    id: user.user_id
  };
  
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
}

/**
 * Verify and decode JWT access token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    throw new Error('Invalid access token');
  }
}

/**
 * Verify and decode JWT refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
}

// ========================================
// EMAIL VALIDATION
// ========================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ========================================
// USER REGISTRATION
// ========================================

/**
 * Register a new user
 * @param {object} userData - { username, email, password, avatarId? }
 * @returns {Promise<object>} { user, accessToken, refreshToken }
 * @throws {Error} If validation fails or user already exists
 */
export async function registerUser({ username, email, password, avatarId }) {
  // Validate email
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  // Validate username
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }
  
  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Validate avatar (use default if not provided)
  const finalAvatarId = avatarId || DEFAULT_AVATAR;
  if (!isValidAvatarId(finalAvatarId)) {
    throw new Error('Invalid avatar ID');
  }
  
  // Check if user already exists
  const existingUser = await prisma.users.findFirst({
    where: {
      OR: [
        { username },
        { email }
      ]
    }
  });
  
  if (existingUser) {
    if (existingUser.username === username) {
      throw new Error('Username already taken');
    }
    if (existingUser.email === email) {
      throw new Error('Email already registered');
    }
  }
  
  // Hash password
  const password_hash = await hashPassword(password);
  
  // Create user with user_stats in a transaction
  const user = await prisma.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.users.create({
      data: {
        username,
        email,
        password_hash,
        avatar_url: finalAvatarId.toLowerCase(),
        role: 'PLAYER', // Default role
        status: 'ONLINE' // User just registered, they're online
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        role: true,
        avatar_url: true,
        status: true,
        created_at: true
      }
    });
    
    // Create initial user_stats
    await tx.user_stats.create({
      data: {
        user_id: newUser.user_id,
        games_played: 0,
        games_won: 0,
        total_score: 0,
        average_score: 0.0
      }
    });
    
    return newUser;
  });
  
  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return {
    user: {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatar_url,
      status: user.status,
      createdAt: user.created_at
    },
    accessToken,
    refreshToken
  };
}

// ========================================
// USER LOGIN
// ========================================

/**
 * Authenticate user and generate tokens
 * @param {object} credentials - { email, password }
 * @returns {Promise<object>} { user, accessToken, refreshToken }
 * @throws {Error} If credentials are invalid
 */
export async function loginUser({ email, password }) {
  // Find user by email
  const user = await prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      username: true,
      email: true,
      password_hash: true,
      role: true,
      avatar_url: true,
      status: true,
      created_at: true
    }
  });
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }
  
  // Update user status to ONLINE
  await prisma.users.update({
    where: { user_id: user.user_id },
    data: { status: 'ONLINE' }
  });
  
  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  return {
    user: {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatar_url,
      status: 'ONLINE',
      createdAt: user.created_at
    },
    accessToken,
    refreshToken
  };
}

// ========================================
// TOKEN REFRESH
// ========================================

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Valid refresh token
 * @returns {Promise<object>} { accessToken }
 * @throws {Error} If refresh token is invalid
 */
export async function refreshAccessToken(refreshToken) {
  // Verify refresh token
  const decoded = verifyRefreshToken(refreshToken);
  
  // Get user from database
  const user = await prisma.users.findUnique({
    where: { user_id: decoded.id },
    select: {
      user_id: true,
      username: true,
      email: true,
      role: true,
      avatar_url: true,
      status: true
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Generate new access token
  const accessToken = generateAccessToken(user);
  
  return { accessToken };
}

// ========================================
// USER LOGOUT
// ========================================

/**
 * Logout user (update status to OFFLINE)
 * @param {number} userId - User ID to logout
 * @returns {Promise<void>}
 */
export async function logoutUser(userId) {
  await prisma.users.update({
    where: { user_id: userId },
    data: { status: 'OFFLINE' }
  });
}
