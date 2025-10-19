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
  console.log('Clearing all data from database...\n');
  
  try {
    // Delete in correct order (children first, parents last)
    
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
    
    console.log('\nAll data cleared successfully!');
    
  } catch (error) {
    console.error('\nError clearing data:', error.message);
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
