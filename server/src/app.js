/**
 * app.js - Main Express Application Setup
 * 
 * This file configures and exports the Express app with all middleware,
 * routes, and error handling. It's separated from index.js to make testing easier.
 * 
 * Structure:
 * 1. Imports and setup
 * 2. Middleware (CORS, body parsing, logging)
 * 3. Routes (health check, API endpoints)
 * 4. Error handling
 * 5. Export
 */

import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import express from 'express';
import morgan from 'morgan';

// Import route modules
import authRoutes from './auth/routes.js';
import avatarRoutes from './avatars/routes.js';
import categoryRoutes from './category/routes.js';
import inviteRoutes from './invite/routes.js';
import leaderboardRoutes from './leaderboard/routes.js';
import matchRoutes from './match/routes.js';
import questionRoutes from './question/routes.js';
import triviaRoutes from './trivia/routes.js';
import userRoutes from './user/routes.js';

// Import auth middleware
import { authenticateToken, requireAdmin } from './auth/middleware.js';

// Load environment variables
config();

export function createApp() {
  const app = express();

  // ========================================
  // MIDDLEWARE SETUP
  // ========================================

  // Request logging (dev mode shows colored, compact logs)
  app.use(morgan('dev'));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cookie parsing middleware
  app.use(cookieParser());

  app.use((req, res, next) => {
    // Log all CORS requests
    if (req.path.includes('/api/')) {
      console.log('[CORS] Incoming request:', req.method, req.path, req.originalUrl);
      console.log('[CORS] Headers:', Object.keys(req.headers));
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.header('Access-Control-Allow-Origin', frontendUrl);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ========================================
  // ROUTES
  // ========================================

  // Health check endpoint (useful for deployment monitoring)
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // API root
  app.get('/api', (req, res) => {
    res.json({ 
      message: 'Trivia Tournament API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        auth: '/api/auth',
        avatars: '/api/avatars',
        match: '/api/match',
        categories: '/api/categories',
        questions: '/api/questions',
        leaderboard: '/api/leaderboard',
        users: '/api/users',
        invites: '/api/invites'
      }
    });
  });

  // ========================================
  // API ROUTES (v1)
  // ========================================

  app.use('/api/auth', authRoutes);
  app.use('/api/avatars', avatarRoutes);
  app.use('/api/match', authenticateToken, matchRoutes);
  app.use('/api/categories', (req, res, next) => {
    // Allow GET requests without auth
    if (req.method === 'GET') {
      return next();
    }
    // Require admin for create/update/delete
    authenticateToken(req, res, () => requireAdmin(req, res, next));
  }, categoryRoutes);

  app.use('/api/questions', (req, res, next) => {
    // Allow GET requests without auth (needed for match creation)
    if (req.method === 'GET') {
      return next();
    }
    // Require admin for create/update/delete
    authenticateToken(req, res, () => requireAdmin(req, res, next));
  }, questionRoutes);

  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/invites', authenticateToken, inviteRoutes);
  app.use('/api/trivia', triviaRoutes);

  // ========================================
  // ERROR HANDLING
  // ========================================

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ 
      ok: false, 
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      availableEndpoints: ['/health', '/api', '/api/match']
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Prisma errors
    if (err.code?.startsWith('P')) {
      return res.status(400).json({
        ok: false,
        error: 'Database Error',
        message: 'A database error occurred',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
      });
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        error: 'Authentication Error',
        message: err.message
      });
    }

    res.status(err.status || 500).json({
      ok: false,
      error: err.name || 'Internal Server Error',
      message: err.message || 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
}
