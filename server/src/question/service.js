/**
 * Question Service
 * 
 * Business logic for question management.
 * Interacts with the database via Prisma.
 * 
 * NOTE: Work with Jaiden to ensure these Prisma queries are optimized.
 */

import crypto from 'crypto';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

/**
 * Generate content hash for a question (used as primary key)
 * This ensures uniqueness based on question text
 */
function generateContentHash(questionText) {
  return crypto.createHash('sha1').update(questionText).digest('hex');
}

// ========================================
// GAME FUNCTIONS
// ========================================

/**
 * Get random questions for match gameplay
 * This is what the match system uses to get questions
 * 
 * @param {Object} params - { category: string, difficulty: string, amount: number }
 * @returns {Promise<Array>} Array of questions with answers shuffled
 */
export async function getRandomQuestions({ category, difficulty, amount }) {
  // First, get the category_id from the category name
  const categoryRecord = await prisma.categories.findUnique({
    where: { name: category },
    select: { category_id: true }
  });
  
  if (!categoryRecord) {
    throw new Error(`Category '${category}' not found`);
  }
  
  // Get all matching questions
  const allQuestions = await prisma.trivia_questions.findMany({
    where: {
      category_id: categoryRecord.category_id,
      difficulty: difficulty
    },
    select: {
      content_hash: true,
      question_text: true,
      correct_answer: true,
      wrong_answer_1: true,
      wrong_answer_2: true,
      wrong_answer_3: true,
      difficulty: true,
      category: {
        select: {
          name: true
        }
      }
    }
  });
  
  if (allQuestions.length === 0) {
    throw new Error(`No questions found for category '${category}' with difficulty '${difficulty}'`);
  }
  
  // Shuffle and take requested amount
  console.log(`[QUESTION] Found ${allQuestions.length} total questions, requesting ${amount}`);
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const toTake = Math.min(amount, shuffled.length);
  const selected = shuffled.slice(0, toTake);
  console.log(`[QUESTION] Returning ${selected.length} questions (took ${toTake})`);
  
  // Format for match system (shuffle answer options)
  return selected.map(q => {
    const options = [
      q.correct_answer,
      q.wrong_answer_1,
      q.wrong_answer_2,
      q.wrong_answer_3
    ];
    
    // Shuffle options
    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    const correctIndex = shuffledOptions.indexOf(q.correct_answer);
    
    return {
      id: q.content_hash,
      text: q.question_text,
      category: q.category.name,
      difficulty: q.difficulty,
      options: shuffledOptions,
      correctIndex // For server-side validation, don't send to client!
    };
  });
}

// ========================================
// ADMIN READ OPERATIONS
// ========================================

/**
 * List questions with search/filter (admin dashboard)
 * 
 * @param {Object} params - { search?, category?, difficulty?, page, limit }
 * @returns {Promise<Object>} { questions: Array, total: number }
 */
export async function listQuestions({ search, category, difficulty, page, limit }) {
  const where = {};
  
  // Text search in question text or answers
  if (search) {
    where.OR = [
      { question_text: { contains: search, mode: 'insensitive' } },
      { correct_answer: { contains: search, mode: 'insensitive' } },
      { wrong_answer_1: { contains: search, mode: 'insensitive' } },
      { wrong_answer_2: { contains: search, mode: 'insensitive' } },
      { wrong_answer_3: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  // Filter by category (name)
  if (category) {
    const categoryRecord = await prisma.categories.findUnique({
      where: { name: category },
      select: { category_id: true }
    });
    
    if (categoryRecord) {
      where.category_id = categoryRecord.category_id;
    } else {
      // Category doesn't exist, return empty results
      return { questions: [], total: 0 };
    }
  }
  
  // Filter by difficulty
  if (difficulty) {
    where.difficulty = difficulty;
  }
  
  const skip = (page - 1) * limit;
  
  // Execute query with pagination
  const [questions, total] = await Promise.all([
    prisma.trivia_questions.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.trivia_questions.count({ where })
  ]);
  
  return { questions, total };
}

/**
 * Get single question by ID (admin)
 * 
 * @param {string} contentHash - Question content hash (primary key)
 * @returns {Promise<Object>} Question object
 * @throws {Error} If question not found
 */
export async function getQuestionById(contentHash) {
  const question = await prisma.trivia_questions.findUnique({
    where: { 
      content_hash: contentHash 
    },
    include: {
      category: {
        select: {
          category_id: true,
          name: true,
          description: true
        }
      }
    }
  });
  
  if (!question) {
    throw new Error('Question not found');
  }
  
  return question;
}

// ========================================
// ADMIN WRITE OPERATIONS
// ========================================

/**
 * Create new question manually (admin)
 * 
 * @param {Object} data - Question data
 * @returns {Promise<Object>} Created question
 * @throws {Error} If category doesn't exist
 */
export async function createQuestion(data) {
  // Verify category exists
  const category = await prisma.categories.findUnique({
    where: { category_id: data.category_id },
    select: { category_id: true, name: true }
  });
  
  if (!category) {
    throw new Error('Category not found');
  }
  
  // Generate content hash from question text
  const contentHash = generateContentHash(data.question_text);
  
  try {
    const question = await prisma.trivia_questions.create({
      data: {
        content_hash: contentHash,
        category_id: data.category_id,
        difficulty: data.difficulty,
        question_text: data.question_text,
        correct_answer: data.correct_answer,
        wrong_answer_1: data.wrong_answer_1,
        wrong_answer_2: data.wrong_answer_2,
        wrong_answer_3: data.wrong_answer_3
      },
      include: {
        category: {
          select: {
            name: true,
            description: true
          }
        }
      }
    });
    
    return question;
  } catch (error) {
    // Duplicate content hash error
    if (error.code === 'P2002') {
      throw new Error('Question with this text already exists');
    }
    console.error('Prisma error creating question:', error);
    throw error;
  }
}

/**
 * Update question (admin)
 * 
 * @param {string} contentHash - Question content hash (primary key)
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated question
 * @throws {Error} If question or category not found
 */
export async function updateQuestion(contentHash, updates) {
  // If updating category, verify it exists
  if (updates.category_id) {
    const category = await prisma.categories.findUnique({
      where: { category_id: updates.category_id },
      select: { category_id: true }
    });
    
    if (!category) {
      throw new Error('Category not found');
    }
  }
  
  // Note: If question_text is updated, content_hash would change
  // This is a limitation - questions cannot be edited after creation
  // to preserve data integrity
  if (updates.question_text) {
    throw new Error('Question text cannot be modified (would change content_hash). Delete and recreate instead.');
  }
  
  try {
    const question = await prisma.trivia_questions.update({
      where: { 
        content_hash: contentHash 
      },
      data: updates,
      include: {
        category: {
          select: {
            name: true,
            description: true
          }
        }
      }
    });
    
    return question;
  } catch (error) {
    // Record not found
    if (error.code === 'P2025') {
      throw new Error('Question not found');
    }
    throw error;
  }
}

/**
 * Delete question (admin)
 * 
 * @param {string} contentHash - Question content hash (primary key)
 * @throws {Error} If question not found or used in matches
 */
export async function deleteQuestion(contentHash) {
  // Check if question has been used in any matches
  const usageCount = await prisma.match_questions.count({
    where: { content_hash: contentHash }
  });
  
  if (usageCount > 0) {
    throw new Error(`Cannot delete question: it has been used in ${usageCount} match(es)`);
  }
  
  // Check if question has any player answers
  const answerCount = await prisma.player_answers.count({
    where: {
      match_question: {
        content_hash: contentHash
      }
    }
  });
  
  if (answerCount > 0) {
    throw new Error('Cannot delete question: it has player answers recorded');
  }
  
  try {
    await prisma.trivia_questions.delete({
      where: { 
        content_hash: contentHash 
      }
    });
  } catch (error) {
    // Record not found
    if (error.code === 'P2025') {
      throw new Error('Question not found');
    }
    // Foreign key constraint
    if (error.code === 'P2003') {
      throw new Error('Cannot delete question: it is referenced by other records');
    }
    throw error;
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Get question count by category
 * 
 * @returns {Promise<Array>} Array of { category_name, count }
 */
export async function getQuestionCountsByCategory() {
  const categories = await prisma.categories.findMany({
    select: {
      name: true,
      _count: {
        select: {
          trivia_questions: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  return categories.map(c => ({
    category: c.name,
    count: c._count.trivia_questions
  }));
}

/**
 * Get question count by difficulty
 * 
 * @returns {Promise<Object>} { easy: number, medium: number, hard: number }
 */
export async function getQuestionCountsByDifficulty() {
  const counts = await prisma.trivia_questions.groupBy({
    by: ['difficulty'],
    _count: {
      content_hash: true
    }
  });
  
  const result = {
    easy: 0,
    medium: 0,
    hard: 0
  };
  
  counts.forEach(item => {
    const diff = item.difficulty.toLowerCase();
    if (result[diff] !== undefined) {
      result[diff] = item._count.content_hash;
    }
  });
  
  return result;
}
