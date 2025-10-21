/**
 * Trivia Import Controller
 * 
 * Handles HTTP requests for importing questions from OpenTDB API
 */

import { generateSeedBatch } from './opentdb.js';
import { upsertQuestions } from './trivia-db.js';

/**
 * Import questions from OpenTDB API
 * POST /api/trivia/import
 * 
 * This endpoint triggers the scraper to fetch new questions
 * Admin only - requires authentication
 */
export async function importQuestionsFromAPI(req, res) {
  try {
    
    // Fetch questions from OpenTDB
    const batch = await generateSeedBatch({
      categories: [
        'General Knowledge',
        'Science',
        'Entertainment',
        'Geography',
        'Sports',
        'History'
      ],
      difficulties: ['easy', 'medium', 'hard'],
      perDifficulty: 7,
      rateLimitMs: 5500  // OpenTDB requires 5 seconds between requests
    });
    
    console.log(`✓ Fetched ${batch.length} unique questions from OpenTDB`);
    
    // Show breakdown by category
    const byCategory = batch.reduce((acc, q) => {
      acc[q.category_name] = (acc[q.category_name] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    
    // Insert into database (with deduplication)
    const result = await upsertQuestions(batch);
    
    // Return success response
    res.json({
      ok: true,
      message: 'Questions imported successfully',
      stats: {
        totalFetched: batch.length,
        inserted: result.inserted,
        skipped: result.skipped,
        byCategory
      }
    });
    
  } catch (error) {
    console.error('Error importing questions:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to import questions',
      message: error.message
    });
  }
}
