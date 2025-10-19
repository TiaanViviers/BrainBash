/**
 * Question Routes
 * 
 * Manages trivia questions in the database.
 * 
 * Admin routes:
 *   - GET /api/questions - List/search/filter questions (admin dashboard)
 *   - GET /api/questions/:id - Get single question (admin)
 *   - POST /api/questions - Manually create question (admin)
 *   - PUT /api/questions/:id - Edit question (admin)
 *   - DELETE /api/questions/:id - Delete question (admin)
 * 
 * Game routes:
 *   - GET /api/questions/random - Get random questions for match
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../auth/middleware.js';
import * as controller from './controller.js';

const router = Router();

// ========================================
// GAME ROUTES (used by match system)
// ========================================

// Get random questions for match gameplay
// Query params: category, difficulty, amount
router.get('/random', controller.getRandomQuestions);

// ========================================
// ADMIN ROUTES (Protected)
// ========================================

// List/search/filter questions (admin dashboard)
// Query params: search, category, difficulty, page, limit
router.get('/', authenticateToken, requireAdmin, controller.listQuestions);

// Get single question by ID (admin)
router.get('/:id', authenticateToken, requireAdmin, controller.getQuestionById);

// Create new question manually (admin)
router.post('/', authenticateToken, requireAdmin, controller.createQuestion);

// Update question (admin)
router.put('/:id', authenticateToken, requireAdmin, controller.updateQuestion);

// Delete question (admin)
router.delete('/:id', authenticateToken, requireAdmin, controller.deleteQuestion);

export default router;
