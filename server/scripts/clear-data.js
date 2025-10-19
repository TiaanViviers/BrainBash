/**
 * Clear all data from database tables
 * 
 * This script deletes all rows from all tables but keeps the table structure.
 * Useful for testing - you can immediately insert new data after running this.
 * 
 * Usage:
 *   node scripts/clear-data.js
 *   OR
 *   make db-clear
 */

import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🗑️  Clearing all data from database...\n');
  
  try {
    // Delete in correct order (children first, parents last)
    // This respects foreign key constraints
    
    console.log('   Deleting player answers...');
    await prisma.player_answers.deleteMany();
    
    console.log('   Deleting scores...');
    await prisma.scores.deleteMany();
    
    console.log('   Deleting match questions...');
    await prisma.match_questions.deleteMany();
    
    console.log('   Deleting match players...');
    await prisma.match_players.deleteMany();
    
    console.log('   Deleting match rounds...');
    await prisma.match_rounds.deleteMany();
    
    console.log('   Deleting match invites...');
    await prisma.match_invites.deleteMany();
    
    console.log('   Deleting matches...');
    await prisma.matches.deleteMany();
    
    console.log('   Deleting user stats...');
    await prisma.user_stats.deleteMany();
    
    console.log('   Deleting users...');
    await prisma.users.deleteMany();
    
    console.log('   Deleting trivia questions...');
    await prisma.trivia_questions.deleteMany();
    
    console.log('   Deleting categories...');
    await prisma.categories.deleteMany();
    
    console.log('\n✅ All data cleared successfully!');
    console.log('   Tables still exist and ready for new data.');
    console.log('\n💡 Next steps:');
    console.log('   - make db-seed          (add sample users & categories)');
    console.log('   - make import-questions (import questions from OpenTDB)');
    
  } catch (error) {
    console.error('\n❌ Error clearing data:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
clearAllData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
