/**
 * Category Controller
 * 
 * Handles HTTP requests for category management.
 * Delegates database operations to the service layer.
 */

import * as service from './service.js';

// ========================================
// PUBLIC CONTROLLERS
// ========================================

/**
 * List all categories
 * GET /api/categories
 */
export async function listCategories(req, res) {
  try {
    const categories = await service.getAllCategories();
    res.json({ ok: true, categories });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch categories', message: error.message });
  }
}

/**
 * Get single category by ID
 * GET /api/categories/:id
 */
export async function getCategoryById(req, res) {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) {
      return res.status(400).json({ ok: false, error: 'Invalid category ID' });
    }

    const category = await service.getCategoryById(categoryId);
    if (!category) return res.status(404).json({ ok: false, error: 'Category not found' });

    res.json({ ok: true, category });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch category', message: error.message });
  }
}

/**
 * Get category statistics
 * GET /api/categories/:id/stats
 */
export async function getCategoryStats(req, res) {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) return res.status(400).json({ ok: false, error: 'Invalid category ID' });

    const stats = await service.getCategoryStats(categoryId);
    res.json({ ok: true, stats });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch category statistics', message: error.message });
  }
}

// ========================================
// ADMIN CONTROLLERS
// ========================================

/**
 * Create new category
 * POST /api/categories
 */
export async function createCategory(req, res) {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0)
      return res.status(400).json({ ok: false, error: 'Category name is required' });

    const category = await service.createCategory({ name: name.trim(), description: description?.trim() || null });

    res.status(201).json({ ok: true, category, message: 'Category created successfully' });
  } catch (error) {
    if (error.message.includes('unique')) return res.status(409).json({ ok: false, error: 'Category already exists' });

    console.error('Error creating category:', error);
    res.status(500).json({ ok: false, error: 'Failed to create category', message: error.message });
  }
}

/**
 * Update category
 * PUT /api/categories/:id
 */
export async function updateCategory(req, res) {
  try {
    const categoryId = parseInt(req.params.id, 10);
    const { name, description } = req.body;

    if (isNaN(categoryId)) return res.status(400).json({ ok: false, error: 'Invalid category ID' });
    if (!name && !description) return res.status(400).json({ ok: false, error: 'Name or description required' });

    const updates = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;

    const category = await service.updateCategory(categoryId, updates);

    res.json({ ok: true, category, message: 'Category updated successfully' });
  } catch (error) {
    if (error.message === 'Category not found') return res.status(404).json({ ok: false, error: error.message });
    if (error.message.includes('unique')) return res.status(409).json({ ok: false, error: 'Category already exists' });

    console.error('Error updating category:', error);
    res.status(500).json({ ok: false, error: 'Failed to update category', message: error.message });
  }
}

/**
 * Delete category
 * DELETE /api/categories/:id
 */
export async function deleteCategory(req, res) {
  try {
    const categoryId = parseInt(req.params.id, 10);
    if (isNaN(categoryId)) return res.status(400).json({ ok: false, error: 'Invalid category ID' });

    await service.deleteCategory(categoryId);

    res.json({ ok: true, message: 'Category deleted successfully' });
  } catch (error) {
    if (error.message === 'Category not found') return res.status(404).json({ ok: false, error: error.message });
    if (error.message.includes('has questions')) return res.status(409).json({ ok: false, error: 'Cannot delete category with questions' });

    console.error('Error deleting category:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete category', message: error.message });
  }
}
