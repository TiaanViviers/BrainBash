/**
 * Import Trivia Questions from OpenTDB API
 * 
 * This script:
 * 1. Fetches questions from OpenTDB API
 * 2. Inserts them into the database
 * 3. Skips duplicates (based on content_hash)
 * 
 * Usage:
 *   node src/trivia/import.js
 *   OR
 *   make import-questions
 * 
 * Prerequisites:
 * - Database must be set up (run 'make db-migrate' first)
 * - Categories must exist (run 'make db-seed' first)
 */

import { generateSeedBatch } from './opentdb.js';
import { upsertQuestions } from './trivia-db.js';

async function importQuestions() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Trivia Question Import Tool');
  console.log('═══════════════════════════════════════════════\n');
  
  console.log('Fetching questions from OpenTDB API...');
  
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
      perDifficulty: 7,  // 7 per difficulty = 21 per category = 126 total
      rateLimitMs: 600   // Small delay between requests to respect API limits
    });
    
    console.log(`✓ Fetched ${batch.length} unique questions from OpenTDB\n`);
    
    // Show breakdown by category
    const byCategory = batch.reduce((acc, q) => {
      acc[q.category_name] = (acc[q.category_name] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Questions by category:');
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(20)} ${count}`);
    });
    console.log('');
    
    // Insert into database
    console.log('Inserting questions into database...\n');
    
    const result = await upsertQuestions(batch);
    
    console.log('═══════════════════════════════════════════════');
    console.log('Import Complete');
    console.log('═══════════════════════════════════════════════');
 
    
  } catch (error) {
    console.error('\nError importing questions:', error.message);
    console.error(error);
    throw error;
  }
}

// Run if called directly
importQuestions()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
