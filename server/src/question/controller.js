/**
 * Question Controller
 * 
 * Handles HTTP requests for question management.
 * Validates input, calls service layer, returns responses.
 */

import * as service from './service.js';

// ========================================
// GAME CONTROLLERS
// ========================================

/**
 * Get random questions for match gameplay
 * GET /api/questions/random?category=Science&difficulty=easy&amount=7
 */
export async function getRandomQuestions(req, res) {
  try {
    const { category, difficulty, amount } = req.query;
    
    // Validation
    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Category is required'
      });
    }
    
    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty.toLowerCase())) {
      return res.status(400).json({
        ok: false,
        error: 'Valid difficulty is required (easy, medium, hard)'
      });
    }
    
    const numAmount = parseInt(amount) || 7;
    if (numAmount < 1 || numAmount > 50) {
      return res.status(400).json({
        ok: false,
        error: 'Amount must be between 1 and 50'
      });
    }
    
    const questions = await service.getRandomQuestions({
      category,
      difficulty: difficulty.toUpperCase(), // Convert to uppercase for Prisma enum
      amount: numAmount
    });
    
    res.json({ 
      ok: true, 
      questions,
      count: questions.length
    });
  } catch (error) {
    console.error('Error getting random questions:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch random questions',
      message: error.message 
    });
  }
}

// ========================================
// ADMIN CONTROLLERS
// ========================================

/**
 * List/search/filter questions (admin dashboard)
 * GET /api/questions?search=water&category=Science&difficulty=easy&page=1&limit=20
 */
export async function listQuestions(req, res) {
  try {
    const { 
      search, 
      category, 
      difficulty, 
      page = '1', 
      limit = '20' 
    } = req.query;
    
    // Validation
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid page number'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        ok: false,
        error: 'Limit must be between 1 and 100'
      });
    }
    
    if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid difficulty (must be easy, medium, or hard)'
      });
    }
    
    const result = await service.listQuestions({
      search: search || undefined,
      category: category || undefined,
      difficulty: difficulty ? difficulty.toUpperCase() : undefined, // Convert to uppercase for database
      page: pageNum,
      limit: limitNum
    });
    
    res.json({ 
      ok: true, 
      questions: result.questions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error listing questions:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch questions',
      message: error.message 
    });
  }
}

/**
 * Get single question by ID (content hash)
 * GET /api/questions/:id
 */
export async function getQuestionById(req, res) {
  try {
    const { id } = req.params; // id is now content_hash (string)
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid question ID (content hash required)'
      });
    }
    
    const question = await service.getQuestionById(id);
    
    res.json({ 
      ok: true, 
      question 
    });
  } catch (error) {
    if (error.message === 'Question not found') {
      return res.status(404).json({ 
        ok: false, 
        error: error.message 
      });
    }
    
    console.error('Error getting question:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch question',
      message: error.message 
    });
  }
}

/**
 * Create new question manually (admin)
 * POST /api/questions
 * Body: {
 *   category_id: number,
 *   difficulty: string,
 *   question_text: string,
 *   correct_answer: string,
 *   wrong_answer_1: string,
 *   wrong_answer_2: string,
 *   wrong_answer_3: string
 * }
 */
export async function createQuestion(req, res) {
  try {
    const {
      category_id,
      difficulty,
      question_text,
      correct_answer,
      wrong_answer_1,
      wrong_answer_2,
      wrong_answer_3
    } = req.body;
    
    // Validation
    const errors = [];
    
    if (!category_id || isNaN(parseInt(category_id))) {
      errors.push('Valid category_id is required');
    }
    
    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
      errors.push('Difficulty must be easy, medium, or hard');
    }
    
    if (!question_text || typeof question_text !== 'string' || question_text.trim().length === 0) {
      errors.push('Question text is required');
    }
    
    if (!correct_answer || typeof correct_answer !== 'string' || correct_answer.trim().length === 0) {
      errors.push('Correct answer is required');
    }
    
    if (!wrong_answer_1 || typeof wrong_answer_1 !== 'string' || wrong_answer_1.trim().length === 0) {
      errors.push('Wrong answer 1 is required');
    }
    
    if (!wrong_answer_2 || typeof wrong_answer_2 !== 'string' || wrong_answer_2.trim().length === 0) {
      errors.push('Wrong answer 2 is required');
    }
    
    if (!wrong_answer_3 || typeof wrong_answer_3 !== 'string' || wrong_answer_3.trim().length === 0) {
      errors.push('Wrong answer 3 is required');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed',
        errors
      });
    }
    
    // Check for duplicate answers
    const answers = [
      correct_answer.trim().toLowerCase(),
      wrong_answer_1.trim().toLowerCase(),
      wrong_answer_2.trim().toLowerCase(),
      wrong_answer_3.trim().toLowerCase()
    ];
    
    const uniqueAnswers = new Set(answers);
    if (uniqueAnswers.size !== 4) {
      return res.status(400).json({
        ok: false,
        error: 'All answers must be unique'
      });
    }
    
    const question = await service.createQuestion({
      category_id: parseInt(category_id),
      difficulty: difficulty.toUpperCase(), // Convert to uppercase for database
      question_text: question_text.trim(),
      correct_answer: correct_answer.trim(),
      wrong_answer_1: wrong_answer_1.trim(),
      wrong_answer_2: wrong_answer_2.trim(),
      wrong_answer_3: wrong_answer_3.trim()
    });
    
    res.status(201).json({ 
      ok: true, 
      question,
      message: 'Question created successfully'
    });
  } catch (error) {
    if (error.message.includes('Category not found')) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Category not found'
      });
    }
    
    console.error('Error creating question:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to create question',
      message: error.message 
    });
  }
}

/**
 * Update question (admin)
 * PUT /api/questions/:id
 * Body: Same as create, all fields optional
 */
export async function updateQuestion(req, res) {
  try {
    const { id } = req.params;
    const {
      category_id,
      difficulty,
      question_text,
      correct_answer,
      wrong_answer_1,
      wrong_answer_2,
      wrong_answer_3
    } = req.body;
    
    // Validation
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid question ID (content hash required)'
      });
    }
    
    const updates = {};
    
    if (category_id !== undefined) {
      if (isNaN(parseInt(category_id))) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid category_id'
        });
      }
      updates.category_id = parseInt(category_id);
    }
    
    if (difficulty !== undefined) {
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({
          ok: false,
          error: 'Difficulty must be easy, medium, or hard'
        });
      }
      updates.difficulty = difficulty;
    }
    
    if (question_text !== undefined) {
      // Note: question_text cannot be updated (would change content_hash)
      // This is handled in the service layer
      if (typeof question_text !== 'string' || question_text.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Question text cannot be empty'
        });
      }
      updates.question_text = question_text.trim();
    }
    
    if (correct_answer !== undefined) {
      if (typeof correct_answer !== 'string' || correct_answer.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Correct answer cannot be empty'
        });
      }
      updates.correct_answer = correct_answer.trim();
    }
    
    if (wrong_answer_1 !== undefined) {
      if (typeof wrong_answer_1 !== 'string' || wrong_answer_1.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Wrong answer 1 cannot be empty'
        });
      }
      updates.wrong_answer_1 = wrong_answer_1.trim();
    }
    
    if (wrong_answer_2 !== undefined) {
      if (typeof wrong_answer_2 !== 'string' || wrong_answer_2.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Wrong answer 2 cannot be empty'
        });
      }
      updates.wrong_answer_2 = wrong_answer_2.trim();
    }
    
    if (wrong_answer_3 !== undefined) {
      if (typeof wrong_answer_3 !== 'string' || wrong_answer_3.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          error: 'Wrong answer 3 cannot be empty'
        });
      }
      updates.wrong_answer_3 = wrong_answer_3.trim();
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'At least one field must be provided'
      });
    }
    
    const question = await service.updateQuestion(id, updates); // id is content_hash string
    
    res.json({ 
      ok: true, 
      question,
      message: 'Question updated successfully'
    });
  } catch (error) {
    if (error.message === 'Question not found') {
      return res.status(404).json({ 
        ok: false, 
        error: error.message 
      });
    }
    
    if (error.message.includes('Category not found')) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Category not found'
      });
    }
    
    if (error.message.includes('cannot be modified')) {
      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
    
    console.error('Error updating question:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update question',
      message: error.message 
    });
  }
}

/**
 * Delete question (admin)
 * DELETE /api/questions/:id
 */
export async function deleteQuestion(req, res) {
  try {
    const { id } = req.params; // id is content_hash (string)
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid question ID (content hash required)'
      });
    }
    
    await service.deleteQuestion(id);
    
    res.json({ 
      ok: true, 
      message: 'Question deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Question not found') {
      return res.status(404).json({ 
        ok: false, 
        error: error.message 
      });
    }
    
    if (error.message.includes('used in matches')) {
      return res.status(409).json({ 
        ok: false, 
        error: 'Cannot delete question that has been used in matches'
      });
    }
    
    console.error('Error deleting question:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to delete question',
      message: error.message 
    });
  }
}
