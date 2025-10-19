/**
 * Trivia Import Routes
 * 
 * Endpoints for importing questions from external APIs
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../auth/middleware.js';
import * as controller from './controller.js';

const router = Router();

// Import questions from OpenTDB API (Admin only)
router.post('/import', authenticateToken, requireAdmin, controller.importQuestionsFromAPI);

export default router;
