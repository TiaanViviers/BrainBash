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

  // 1. Request logging (dev mode shows colored, compact logs)
  app.use(morgan('dev'));

  // 2. Body parsing middleware
  app.use(express.json()); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

  // 3. Cookie parsing middleware (for refresh tokens)
  app.use(cookieParser());

  // 4. CORS middleware (allow frontend to connect)
  app.use((req, res, next) => {
    // Log all requests for debugging
    if (req.path.includes('/invites')) {
      console.log('[CORS] Incoming request:', req.method, req.path, req.originalUrl);
      console.log('[CORS] Headers:', Object.keys(req.headers));
    }
    
    // Use environment variable for frontend URL, fallback to localhost for development
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.header('Access-Control-Allow-Origin', frontendUrl);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true'); // Allow cookies
    
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

  // Authentication (public - no auth required)
  app.use('/api/auth', authRoutes);

  // Avatar management (public - no auth required for viewing avatars)
  app.use('/api/avatars', avatarRoutes);

  // Match management (requires authentication)
  app.use('/api/match', authenticateToken, matchRoutes);

  // Category management (GET public, POST/PUT/DELETE admin only)
  app.use('/api/categories', (req, res, next) => {
    // Allow GET requests without auth
    if (req.method === 'GET') {
      return next();
    }
    // Require admin for create/update/delete
    authenticateToken(req, res, () => requireAdmin(req, res, next));
  }, categoryRoutes);

  // Question bank management (GET public for match creation, POST/PUT/DELETE admin only)
  app.use('/api/questions', (req, res, next) => {
    // Allow GET requests without auth (needed for match creation)
    if (req.method === 'GET') {
      return next();
    }
    // Require admin for create/update/delete
    authenticateToken(req, res, () => requireAdmin(req, res, next));
  }, questionRoutes);

  // Leaderboard (public - no auth required for viewing)
  app.use('/api/leaderboard', leaderboardRoutes);

  // User management (mixed - some public, some require auth)
  app.use('/api/users', userRoutes);

  // Match invitations (requires authentication)
  app.use('/api/invites', authenticateToken, inviteRoutes);

  // Trivia import system (admin only)
  app.use('/api/trivia', triviaRoutes);

  // TODO: Add these routes as they're implemented by the team
  // app.use('/api/auth', authRoutes);        // Login, signup, logout (Auth team)

  // ========================================
  // MOCK ENDPOINTS (for frontend testing)
  // ========================================
  // These are temporary endpoints to help frontend dev
  // Remove or replace with real implementations

  // Mock: Get all matches (for dashboard)
  app.get('/api/matches', (req, res) => {
    res.json({
      ok: true,
      matches: [
        {
          id: 1,
          title: 'Science Showdown',
          categories: ['Science'],
          difficulty: 'medium',
          totalRounds: 4,
          questionsPerRound: 7,
          hostId: 1,
          hostName: 'Alice',
          status: 'scheduled',
          playerCount: 3,
          maxPlayers: 6,
          startTime: new Date(Date.now() + 600000).toISOString(), // 10 mins from now
        },
        {
          id: 2,
          title: 'History Challenge',
          categories: ['History'],
          difficulty: 'hard',
          totalRounds: 4,
          questionsPerRound: 7,
          hostId: 2,
          hostName: 'Bob',
          status: 'in_progress',
          playerCount: 4,
          maxPlayers: 8,
          startTime: new Date(Date.now() - 300000).toISOString(), // started 5 mins ago
        }
      ]
    });
  });

  // Mock: Get leaderboard
  app.get('/api/leaderboard', (req, res) => {
    res.json([
      {
        id: 1,
        name: 'Alice Johnson',
        username: 'alice',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
        totalScore: 12450,
        weeklyScore: 3200,
        dailyScore: 850,
        gamesPlayed: 45,
        gamesWon: 23,
        averageScore: 276,
        averageTime: 12.3,
        favoriteCategory: 'Science'
      },
      {
        id: 2,
        name: 'Bob Smith',
        username: 'bob',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
        totalScore: 11200,
        weeklyScore: 2800,
        dailyScore: 720,
        gamesPlayed: 38,
        gamesWon: 18,
        averageScore: 295,
        averageTime: 13.1,
        favoriteCategory: 'History'
      },
      {
        id: 3,
        name: 'Carol Williams',
        username: 'carol',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol',
        totalScore: 10800,
        weeklyScore: 2600,
        dailyScore: 650,
        gamesPlayed: 42,
        gamesWon: 19,
        averageScore: 257,
        averageTime: 11.8,
        favoriteCategory: 'Entertainment'
      }
    ]);
  });

  // Mock: Get match details (for lobby/play page)
  app.get('/api/match/:id', (req, res) => {
    const { id } = req.params;
    res.json({
      ok: true,
      match: {
        id: parseInt(id),
        title: 'Science Showdown',
        hostId: '1',
        categories: ['Science', 'Technology'],
        difficulty: 'medium',
        totalRounds: 4,
        questionsPerRound: 7,
        status: 'scheduled',
        startTime: new Date(Date.now() + 600000).toISOString(),
        players: [
          {
            id: '1',
            name: 'Alice',
            username: 'alice',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
            status: 'ready',
            score: 0,
            isOnline: true
          },
          {
            id: '2',
            name: 'Bob',
            username: 'bob',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
            status: 'waiting',
            score: 0,
            isOnline: true
          }
        ],
        questions: [
          [
            {
              id: 'q1',
              text: 'What is the chemical symbol for water?',
              category: 'Science',
              difficulty: 'easy',
              options: ['H2O', 'O2', 'CO2', 'HO'],
              correctAnswer: 0 // index of correct option
            }
          ]
        ]
      }
    });
  });

  // Mock: Submit answer
  app.post('/api/match/:id/answer', (req, res) => {
    const { userId, questionId, answer } = req.body;
    res.json({
      ok: true,
      correct: answer === 0, // Mock: first answer is always correct
      score: 100,
      message: answer === 0 ? 'Correct!' : 'Incorrect'
    });
  });

  // ========================================
  // ERROR HANDLING
  // ========================================

  // 404 handler - must be after all other routes
  app.use((req, res) => {
    res.status(404).json({ 
      ok: false, 
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.path}`,
      availableEndpoints: ['/health', '/api', '/api/match']
    });
  });

  // Global error handler - must be last
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Prisma errors (will be useful when database is connected)
    if (err.code?.startsWith('P')) {
      return res.status(400).json({
        ok: false,
        error: 'Database Error',
        message: 'A database error occurred',
        // Don't expose detailed DB errors in production
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
      });
    }

    // JWT errors (will be useful when auth is implemented)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({
        ok: false,
        error: 'Authentication Error',
        message: err.message
      });
    }

    // Default error response
    res.status(err.status || 500).json({
      ok: false,
      error: err.name || 'Internal Server Error',
      message: err.message || 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
}
