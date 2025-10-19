/**
 * Category Routes
 * 
 * Manages trivia question categories (Science, History, Geography, etc.)
 * 
 * Public routes:
 *   - GET /api/categories - List all categories
 *   - GET /api/categories/:id - Get single category
 *   - GET /api/categories/:id/stats - Get category stats
 * 
 * Admin routes (Protected):
 *   - POST /api/categories - Create new category
 *   - PUT /api/categories/:id - Update category
 *   - DELETE /api/categories/:id - Delete category
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../auth/middleware.js';
import * as controller from './controller.js';

const router = Router();

// ========================================
// PUBLIC ROUTES
// ========================================
router.get('/', controller.listCategories);
router.get('/:id', controller.getCategoryById);
router.get('/:id/stats', controller.getCategoryStats);

// ========================================
// ADMIN ROUTES (Protected)
// ========================================
router.post('/', authenticateToken, requireAdmin, controller.createCategory);
router.put('/:id', authenticateToken, requireAdmin, controller.updateCategory);
router.delete('/:id', authenticateToken, requireAdmin, controller.deleteCategory);

export default router;
