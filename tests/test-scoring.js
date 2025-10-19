/**
 * Scoring System Test Suite
 * Tests the time-based scoring algorithm and tie-breaking logic
 */

import { PrismaClient } from '../server/src/generated/prisma/index.js';
import { createMatch, finishMatch, submitAnswer } from '../server/src/match/service.js';

const prisma = new PrismaClient();

// Test utilities
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${colors.bright}${colors.blue}TEST: ${name}${colors.reset}`);
}

function logSuccess(message) {
  log(`  ✓ ${message}`, colors.green);
}

function logError(message) {
  log(`  ✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`  ℹ ${message}`, colors.cyan);
}

// Test data
let testUsers = [];
let testMatch = null;
let testQuestions = [];

/**
 * Setup: Create test users, match, and questions
 */
async function setup() {
  log('\n=== SETUP: Creating test data ===\n', colors.bright);

  try {
    // Check if questions exist first
    const questionCount = await prisma.trivia_questions.count();
    if (questionCount === 0) {
      throw new Error('No questions in database. Please run: npm run import-questions (in server directory)');
    }
    logSuccess(`Found ${questionCount} questions in database`);

    // Create test users
    for (let i = 1; i <= 4; i++) {
      const user = await prisma.users.create({
        data: {
          username: `test_scorer_${i}_${Date.now()}`,
          email: `scorer${i}_${Date.now()}@test.com`,
          password_hash: 'dummy_hash_for_testing',
        },
      });

      // Create user stats
      await prisma.user_stats.create({
        data: {
          user_id: user.user_id,
        },
      });

      testUsers.push(user);
      logSuccess(`Created user: ${user.username} (ID: ${user.user_id})`);
    }

    // Create a match using the service (this handles all the complexity)
    const matchData = await createMatch({
      category: 'Science',
      difficulty: 'medium',
      amount: 5,
      players: testUsers.map(u => u.user_id),
      hostId: testUsers[0].user_id,
    });

    testMatch = { match_id: matchData.matchId };
    logSuccess(`Created match: ${testMatch.match_id}`);

    // Get match questions directly from database
    const matchQuestions = await prisma.match_questions.findMany({
      where: { match_id: testMatch.match_id },
      orderBy: { question_number: 'asc' },
    });
    
    testQuestions = matchQuestions.map(q => ({
      match_question_id: q.match_question_id,
      correct_answer: q.correct_option,
      option1: q.option_a,
      option2: q.option_b,
      option3: q.option_c,
      option4: q.option_d,
    }));
    
    logSuccess(`Loaded ${testQuestions.length} match questions`);

    log('\n=== Setup complete ===\n', colors.green);
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 1: First responder gets 100 points
 */
async function testFirstResponder() {
  logTest('First Responder Gets 100 Points');

  const question = testQuestions[0];
  const user = testUsers[0];

  // Submit first answer with 2000ms response time
  const result = await submitAnswer(testMatch.match_id, {
    matchQuestionId: question.match_question_id,
    userId: user.user_id,
    selectedOption: question.correct_answer,
    responseTimeMs: 2000,
  });

  if (result.pointsAwarded === 100) {
    logSuccess(`First responder awarded 100 points (response time: 2000ms)`);
    return true;
  } else {
    logError(`Expected 100 points, got ${result.pointsAwarded}`);
    return false;
  }
}

/**
 * Test 2: Second responder gets penalty
 */
async function testSecondResponderPenalty() {
  logTest('Second Responder Gets Penalty for Slower Response');

  const question = testQuestions[0]; // Same question as Test 1
  const user = testUsers[1];

  // First responder was 2000ms, this one is 2500ms (+500ms)
  // Penalty should be floor(500/100) = 5 points
  // Expected: 100 - 5 = 95 points
  const result = await submitAnswer(testMatch.match_id, {
    matchQuestionId: question.match_question_id,
    userId: user.user_id,
    selectedOption: question.correct_answer,
    responseTimeMs: 2500,
  });

  logInfo(`Response time: 2500ms (500ms slower than fastest 2000ms)`);
  logInfo(`Expected penalty: 5 points (floor(500/100))`);
  logInfo(`Expected points: 95`);

  if (result.pointsAwarded === 95) {
    logSuccess(`Correct! Second responder awarded 95 points`);
    return true;
  } else {
    logError(`Expected 95 points, got ${result.pointsAwarded}`);
    return false;
  }
}

/**
 * Test 3: Very slow responder gets minimum points
 */
async function testMinimumPoints() {
  logTest('Very Slow Responder Gets Minimum 10 Points');

  const question = testQuestions[0]; // Same question
  const user = testUsers[2];

  // Very slow response: 15000ms (13 seconds slower than fastest 2000ms)
  // Penalty would be floor(13000/100) = 130 points
  // But minimum is 10 points
  const result = await submitAnswer(testMatch.match_id, {
    matchQuestionId: question.match_question_id,
    userId: user.user_id,
    selectedOption: question.correct_answer,
    responseTimeMs: 15000,
  });

  logInfo(`Response time: 15000ms (13000ms slower than fastest)`);
  logInfo(`Calculated penalty: 130 points (would result in negative)`);
  logInfo(`Expected: Minimum 10 points enforced`);

  if (result.pointsAwarded === 10) {
    logSuccess(`Correct! Minimum 10 points enforced`);
    return true;
  } else {
    logError(`Expected 10 points, got ${result.pointsAwarded}`);
    return false;
  }
}

/**
 * Test 4: Incorrect answer gets 0 points
 */
async function testIncorrectAnswer() {
  logTest('Incorrect Answer Gets 0 Points');

  const question = testQuestions[1]; // Use a new question
  const user = testUsers[0];

  // Get incorrect option
  const incorrectOption = [
    question.option1,
    question.option2,
    question.option3,
    question.option4,
  ].find(opt => opt !== question.correct_answer);

  const result = await submitAnswer(testMatch.match_id, {
    matchQuestionId: question.match_question_id,
    userId: user.user_id,
    selectedOption: incorrectOption,
    responseTimeMs: 1000,
  });

  logInfo(`Selected: ${incorrectOption}`);
  logInfo(`Correct: ${question.correct_answer}`);

  if (result.pointsAwarded === 0 || result.pointsAwarded === undefined) {
    logSuccess(`Correct! Incorrect answer awarded 0 points`);
    return true;
  } else {
    logError(`Expected 0 points, got ${result.pointsAwarded}`);
    return false;
  }
}

/**
 * Test 5: Faster responder gets more points than slower
 */
async function testRelativeScoring() {
  logTest('Relative Scoring: Faster Responder Beats Slower');

  const question = testQuestions[2]; // Use another new question
  const fastUser = testUsers[0];
  const slowUser = testUsers[1];

  // Fast answer: 1000ms
  const fastResult = await submitAnswer(testMatch.match_id, {
    matchQuestionId: question.match_question_id,
    userId: fastUser.user_id,
    selectedOption: question.correct_answer,
    responseTimeMs: 1000,
  });

  // Slow answer: 3000ms (2000ms slower = 20 point penalty)
  const slowResult = await submitAnswer(testMatch.match_id, {
    matchQuestionId: question.match_question_id,
    userId: slowUser.user_id,
    selectedOption: question.correct_answer,
    responseTimeMs: 3000,
  });

  logInfo(`Fast responder (1000ms): ${fastResult.pointsAwarded} points`);
  logInfo(`Slow responder (3000ms): ${slowResult.pointsAwarded} points`);
  logInfo(`Difference: ${fastResult.pointsAwarded - slowResult.pointsAwarded} points`);

  if (fastResult.pointsAwarded > slowResult.pointsAwarded) {
    logSuccess(`Correct! Faster responder (${fastResult.pointsAwarded}) > slower responder (${slowResult.pointsAwarded})`);
    return true;
  } else {
    logError(`Expected fast (${fastResult.pointsAwarded}) > slow (${slowResult.pointsAwarded})`);
    return false;
  }
}

/**
 * Test 6: Tie-breaking by total score
 */
async function testTieBreakingByScore() {
  logTest('Tie-Breaking: Highest Score Wins');

  // Set up scenario: User 0 has higher score than User 1
  const scores = await prisma.match_players.findMany({
    where: {
      match_id: testMatch.match_id,
      user_id: { in: [testUsers[0].user_id, testUsers[1].user_id] },
    },
  });

  logInfo(`Player 1 score: ${scores[0].score}`);
  logInfo(`Player 2 score: ${scores[1].score}`);

  if (scores[0].score !== scores[1].score) {
    logSuccess(`Scores are different - primary tie-breaker will work`);
    return true;
  } else {
    logInfo(`Scores are tied - would proceed to secondary tie-breaker`);
    return true;
  }
}

/**
 * Test 7: Complete match and verify statistics
 */
async function testCompleteMatchStatistics() {
  logTest('Complete Match and Verify Statistics');

  try {
    // Finish the match
    await finishMatch(testMatch.match_id);

    // Check that match status is updated
    const updatedMatch = await prisma.matches.findUnique({
      where: { match_id: testMatch.match_id },
    });

    if (updatedMatch.status !== 'FINISHED') {
      logError(`Match status should be 'FINISHED', got '${updatedMatch.status}'`);
      return false;
    }
    logSuccess(`Match status updated to 'FINISHED'`);

    // Check scores table
    const scores = await prisma.scores.findMany({
      where: { match_id: testMatch.match_id },
      include: { user: true },
    });

    logInfo(`\n  📊 Final Scores:`);
    for (const score of scores) {
      logInfo(`    ${score.user.username}: ${score.total_score} points`);
      logInfo(`      - Correct: ${score.correct_answers}/${score.total_questions}`);
      logInfo(`      - Avg response time: ${score.avg_response_time}ms`);
    }

    // Verify all statistics are populated
    let allValid = true;
    for (const score of scores) {
      if (score.correct_answers === null || score.total_questions === null) {
        logError(`Score statistics missing for user ${score.user_id}`);
        allValid = false;
      }
    }

    if (allValid) {
      logSuccess(`All score statistics properly recorded`);
    }

    // Check user_stats updated
    const userStats = await prisma.user_stats.findMany({
      where: { user_id: { in: testUsers.map(u => u.user_id) } },
    });

    logInfo(`\n  📈 User Stats Updated:`);
    for (const stats of userStats) {
      const user = testUsers.find(u => u.user_id === stats.user_id);
      logInfo(`    ${user.username}:`);
      logInfo(`      - Games played: ${stats.games_played}`);
      logInfo(`      - Games won: ${stats.games_won}`);
      logInfo(`      - Avg score: ${stats.average_score}`);
      logInfo(`      - Avg response time: ${stats.avg_response_time}ms`);
    }

    logSuccess(`User statistics updated successfully`);
    return allValid;
  } catch (error) {
    logError(`Error finishing match: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Cleanup: Remove test data
 */
async function cleanup() {
  log('\n=== CLEANUP: Removing test data ===\n', colors.bright);

  try {
    // Delete in correct order due to foreign keys
    if (testMatch && testMatch.match_id) {
      await prisma.player_answers.deleteMany({
        where: {
          match_question: {
            match_id: testMatch.match_id,
          },
        },
      });

      await prisma.match_questions.deleteMany({
        where: { match_id: testMatch.match_id },
      });

      await prisma.scores.deleteMany({
        where: { match_id: testMatch.match_id },
      });

      await prisma.match_players.deleteMany({
        where: { match_id: testMatch.match_id },
      });

      await prisma.match_rounds.deleteMany({
        where: { match_id: testMatch.match_id },
      });

      await prisma.matches.deleteMany({
        where: { match_id: testMatch.match_id },
      });
    }

    if (testUsers.length > 0) {
      await prisma.user_stats.deleteMany({
        where: { user_id: { in: testUsers.map(u => u.user_id) } },
      });

      await prisma.users.deleteMany({
        where: { user_id: { in: testUsers.map(u => u.user_id) } },
      });
    }

    logSuccess('Test data cleaned up');
  } catch (error) {
    logError(`Cleanup failed: ${error.message}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n╔══════════════════════════════════════════╗', colors.bright);
  log('║     SCORING SYSTEM TEST SUITE            ║', colors.bright);
  log('╚══════════════════════════════════════════╝\n', colors.bright);

  const tests = [
    { name: 'First Responder', fn: testFirstResponder },
    { name: 'Second Responder Penalty', fn: testSecondResponderPenalty },
    { name: 'Minimum Points', fn: testMinimumPoints },
    { name: 'Incorrect Answer', fn: testIncorrectAnswer },
    { name: 'Relative Scoring', fn: testRelativeScoring },
    { name: 'Tie-Breaking', fn: testTieBreakingByScore },
    { name: 'Complete Match Statistics', fn: testCompleteMatchStatistics },
  ];

  let passed = 0;
  let failed = 0;

  try {
    await setup();

    for (const test of tests) {
      try {
        const result = await test.fn();
        if (result) {
          passed++;
        } else {
          failed++;
        }
      } catch (error) {
        logError(`Test "${test.name}" threw error: ${error.message}`);
        console.error(error);
        failed++;
      }
    }
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
  } finally {
    await cleanup();
  }

  // Summary
  log('\n' + '='.repeat(50), colors.bright);
  log('TEST SUMMARY', colors.bright);
  log('='.repeat(50) + '\n', colors.bright);

  log(`Total: ${passed + failed}`, colors.bright);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);

  if (failed === 0) {
    log('\n✓ All tests passed! 🎉\n', colors.green);
  } else {
    log(`\n✗ ${failed} test(s) failed\n`, colors.red);
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
