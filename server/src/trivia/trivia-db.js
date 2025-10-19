import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// Cache for category name -> ID mapping
let categoryCache = null;

/**
 * Fetch category IDs from database, creating categories if they don't exist
 * This makes the import self-sufficient - works on empty databases!
 */
async function ensureCategories(categoryNames) {
  if (categoryCache) {
    return categoryCache;
  }
  
  categoryCache = {};
  
  for (const name of categoryNames) {
    // Upsert each category (create if missing, find if exists)
    const category = await prisma.categories.upsert({
      where: { name },
      update: {}, // Don't change if exists
      create: { 
        name,
        description: `${name} questions`
      }
    });
    categoryCache[name] = category.category_id;
  }
  
  return categoryCache;
}

/**
 * Upsert many trivia questions into the database (dedupe by content_hash).
 *
 * INPUT: `batch` is the array returned by generateSeedBatch() in opentbd.js.
 *        Each item has these fields:
 *          - category_name: string        // e.g. "Science"
 *          - difficulty: string           // "easy"|"medium"|"hard"
 *          - question: string             // the question text
 *          - options: string[]            // 4 options (includes the correct one)
 *          - correct: string              // the correct answer text
 *          - content_hash: string         // stable hash for dedupe (unique index)
 *
 * OUTPUT: return object on success:
 *         { inserted: number, skipped: number}
 * 
 *         Throw error on DB error
 * 
 * 
 * EXAMPLE of a batch item:
        {
        category_name: "Science",
        difficulty: "easy",
        question: "What is H2O commonly known as?",
        options: ["Water", "Oxygen", "Hydrogen", "Salt"],
        correct: "Water",
        content_hash: "123"
        }
 */
export async function upsertQuestions(batch) {
  // Each batch items has a unique has value. If that value is already in the db.
  // we do not want to insert it. Add all batch items that are not already in the db.
  if (!Array.isArray(batch) || batch.length === 0) {
    throw new Error('upsertQuestions: batch must be a non-empty array');
  }

  // Get all unique category names from the batch
  const categoryNames = [...new Set(batch.map(item => item.category_name))];
  
  // Ensure all categories exist in DB (creates them if missing)
  const CATEGORIES = await ensureCategories(categoryNames);
  
  let inserted = 0;
  let skipped = 0;

  for (const item of batch) {
    const { category_name, difficulty, question, options, correct, content_hash } = item;
    
    // Get category ID (should always exist now)
    const category_id = CATEGORIES[category_name];
    if (!category_id) {
      console.warn(`Skipping question with unknown category: ${category_name}`);
      skipped++;
      continue;
    }

    try {
      // Separate wrong answers cleanly
      const wrongOptions = options.filter(opt => opt !== correct).slice(0, 3);
      // Try upsert by content_hash
      await prisma.trivia_questions.upsert({
        where: {content_hash },
        update: {}, // no update if exists
        create: {
          content_hash,
          category_id,
          difficulty: difficulty.toUpperCase(),
          question_text: question,
          correct_answer: correct,
          wrong_answer_1: wrongOptions[0] || '',
          wrong_answer_2: wrongOptions[1] || '',
          wrong_answer_3: wrongOptions[2] || '',
        }
      });
      inserted++;
    } catch (error) {
      console.error('Error upserting question:', error);
      skipped++;
    }
  }

  return { inserted, skipped };
}