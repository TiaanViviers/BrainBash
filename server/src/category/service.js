/**
 * Category Service
 * 
 * Business logic for category management.
 * Interacts with the database via Prisma.
 */

import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// ========================================
// READ OPERATIONS
// ========================================

/**
 * Get all categories
 */
export async function getAllCategories() {
  const categories = await prisma.categories.findMany({
    select: {
      category_id: true,
      name: true,
      description: true
    },
    orderBy: { name: 'asc' }
  });

  return categories.map(c => ({
    category_id: c.category_id,  // Use snake_case to match database and frontend
    name: c.name,
    description: c.description
  }));
}

/**
 * Get category by ID
 */
export async function getCategoryById(categoryId) {
  const category = await prisma.categories.findUnique({
    where: { category_id: categoryId },
    select: {
      category_id: true,
      name: true,
      description: true
    }
  });

  if (!category) throw new Error('Category not found');

  return {
    categoryId: category.category_id,
    name: category.name,
    description: category.description
  };
}

/**
 * Get category stats
 * Optimized: counts questions by difficulty in DB
 */
export async function getCategoryStats(categoryId) {
  const category = await prisma.categories.findUnique({
    where: { category_id: categoryId },
    select: { category_id: true, name: true, description: true }
  });

  if (!category) throw new Error('Category not found');

  // Count questions by difficulty using groupBy
  const counts = await prisma.trivia_questions.groupBy({
    by: ['difficulty'],
    where: { category_id: categoryId },
    _count: { difficulty: true }
  });

  const questionCounts = { easy: 0, medium: 0, hard: 0, total: 0 };
  counts.forEach(c => {
    const diff = c.difficulty.toLowerCase();
    questionCounts[diff] = c._count.difficulty;
    questionCounts.total += c._count.difficulty;
  });

  return {
    categoryId: category.category_id,
    name: category.name,
    description: category.description,
    questionCounts
  };
}

// ========================================
// WRITE OPERATIONS (ADMIN)
// ========================================

export async function createCategory(data) {
  try {
    const category = await prisma.categories.create({
      data: { name: data.name, description: data.description },
      select: { category_id: true, name: true, description: true }
    });

    return {
      categoryId: category.category_id,
      name: category.name,
      description: category.description
    };
  } catch (error) {
    if (error.code === 'P2002') throw new Error('A category with this name already exists');
    throw error;
  }
}

export async function updateCategory(categoryId, updates) {
  try {
    const category = await prisma.categories.update({
      where: { category_id: categoryId },
      data: updates,
      select: { category_id: true, name: true, description: true }
    });

    return {
      categoryId: category.category_id,
      name: category.name,
      description: category.description
    };
  } catch (error) {
    if (error.code === 'P2025') throw new Error('Category not found');
    if (error.code === 'P2002') throw new Error('A category with this name already exists');
    throw error;
  }
}

export async function deleteCategory(categoryId) {
  try {
    const questionCount = await prisma.trivia_questions.count({ where: { category_id: categoryId } });
    if (questionCount > 0) throw new Error(`Cannot delete category: ${questionCount} questions exist`);

    await prisma.categories.delete({ where: { category_id: categoryId } });
  } catch (error) {
    if (error.code === 'P2025') throw new Error('Category not found');
    if (error.code === 'P2003') throw new Error('Cannot delete category: it has related questions');
    throw error;
  }
}

// ========================================
// UTILITY
// ========================================

export async function categoryExistsByName(name) {
  const category = await prisma.categories.findUnique({ where: { name }, select: { category_id: true } });
  return !!category;
}

export async function getCategoryByName(name) {
  const category = await prisma.categories.findUnique({
    where: { name },
    select: { category_id: true, name: true, description: true }
  });

  if (!category) return null;

  return {
    categoryId: category.category_id,
    name: category.name,
    description: category.description
  };
}
