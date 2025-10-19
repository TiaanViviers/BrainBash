/**
 * Match Service - Database Edition
 * 
 * Manages match gameplay with full database persistence.
 * No more in-memory storage - everything is in PostgreSQL via Prisma.
 */

import { PrismaClient } from '../generated/prisma/index.js';
import * as questionService from '../question/service.js';

const prisma = new PrismaClient();

/**
 * Fetch a user by ID
 */
export async function getUserById(userId) {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      username: true,
      email: true,
      avatar_url: true
    }
  });
}

export async function getAllMatches() {
  const matches = await prisma.matches.findMany({
    include: {
      match_players: { include: { user: true } },
      match_questions: {
        take: 1,
        include: {
          question: {
            include: {
              category: true
            }
          }
        }
      }
    }
  });

  // Add category name to each match from first question
  return matches.map(match => ({
    ...match,
    category: match.match_questions[0]?.question?.category?.name || 'Unknown',
    player_count: match.match_players.length
  }));
}

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Create a new match with players and questions
 * 
 * @param {Object} params
 * @param {string} params.category - Category name
 * @param {string} params.difficulty - 'easy', 'medium', or 'hard'
 * @param {number} params.amount - Number of questions
 * @param {number[]} params.players - Array of user IDs
 * @param {number} params.hostId - Host user ID (first player by default)
 * @returns {Promise<Object>} { matchId, totalQuestions }
 */
export async function createMatch({ category, difficulty, amount = 10, players, hostId }) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('At least one player required');
  }

  // Validate all players exist
  const userCount = await prisma.users.count({
    where: { user_id: { in: players } }
  });
  
  if (userCount !== players.length) {
    throw new Error('One or more invalid player IDs');
  }

  // Get random questions from the Question service
  const questions = await questionService.getRandomQuestions({
    category,
    difficulty: difficulty.toUpperCase(),
    amount
  });

  
  if (questions.length === 0) {
    throw new Error(`No questions available for ${category} at ${difficulty} difficulty`);
  }

  // Get category ID for rounds
  const categoryRecord = await prisma.categories.findUnique({
    where: { name: category },
    select: { category_id: true }
  });

  // Create match in transaction
  const match = await prisma.$transaction(async (tx) => {
    const newMatch = await tx.matches.create({
      data: {
        host_id: hostId || players[0],
        status: 'SCHEDULED',
        difficulty: difficulty.toUpperCase(),
        start_time: new Date()
      }
    });

    const round = await tx.match_rounds.create({
      data: {
        match_id: newMatch.match_id,
        round_number: 1,
        category_id: categoryRecord.category_id,
        difficulty: difficulty.toUpperCase()
      }
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      await tx.match_questions.create({
        data: {
          match_id: newMatch.match_id,
          content_hash: q.id,
          round_id: round.round_id,
          question_number: i + 1,
          correct_option: q.options[q.correctIndex],
          option_a: q.options[0],
          option_b: q.options[1],
          option_c: q.options[2],
          option_d: q.options[3]
        }
      });
    }

    for (const userId of players) {
      await tx.match_players.create({
        data: {
          match_id: newMatch.match_id,
          user_id: userId,
          score: 0
        }
      });
    }

    return newMatch;
  });

  return { 
    matchId: match.match_id, 
    totalQuestions: questions.length 
  };
}

/**
 * Get current question index for a match
 * Determined by how many questions have been answered by all players
 */
async function getCurrentQuestionIndex(matchId) {
  // Get total players
  const playerCount = await prisma.match_players.count({
    where: { match_id: matchId }
  });

  // Get questions in order
  const questions = await prisma.match_questions.findMany({
    where: { match_id: matchId },
    orderBy: { question_number: 'asc' },
    select: { match_question_id: true, question_number: true }
  });

  // Find first question where not all players have answered
  for (const q of questions) {
    const answerCount = await prisma.player_answers.count({
      where: { match_question_id: q.match_question_id }
    });

    if (answerCount < playerCount) {
      return q.question_number - 1;
    }
  }

  return questions.length;
}

/**
 * Get public state for the lobby/clients
 * Hides the correct answer
 * 
 * @param {number} matchId
 * @returns {Promise<Object>}
 */
export async function getPublicState(matchId) {
  const match = await prisma.matches.findUnique({
    where: { match_id: matchId },
    include: {
      match_questions: {
        orderBy: { question_number: 'asc' },
        include: {
          question: {
            select: {
              question_text: true
            }
          }
        }
      },
      match_players: {
        include: {
          user: {
            select: {
              user_id: true,
              username: true,
              avatar_url: true
            }
          }
        }
      }
    }
  });

  if (!match) {
    throw new Error('Match not found');
  }

  const currentIndex = await getCurrentQuestionIndex(matchId);
  const total = match.match_questions.length;
  const finished = match.status === 'FINISHED' || currentIndex >= total;

  const currentQuestion = match.match_questions[currentIndex];
  
  return {
    matchId,
    hostId: match.host_id,
    status: match.status,
    difficulty: match.difficulty,
    index: currentIndex,
    total,
    finished,
    question: currentQuestion ? {
      id: currentQuestion.match_question_id,
      number: currentQuestion.question_number,
      text: currentQuestion.question.question_text,
      correctAnswer: currentQuestion.correct_option,
      options: [
        currentQuestion.option_a,
        currentQuestion.option_b,
        currentQuestion.option_c,
        currentQuestion.option_d
      ]
    } : null,
    players: match.match_players.map(p => ({
      userId: p.user.user_id,
      username: p.user.username,
      avatar: p.user.avatar_url,
      avatarUrl: p.user.avatar_url,
      score: p.score
    }))
  };
}

/**
 * Calculate points awarded for a correct answer
 * 
 * Scoring methodology (per spec):
 * - Base: 100 points for correct answer
 * - Penalty: -1 point per 100ms beyond fastest responder
 * - Minimum: 10 points (even if very slow)
 * 
 * @param {number} matchQuestionId - The question being answered
 * @param {number} responseTimeMs - Response time in milliseconds
 * @returns {Promise<number>} Points to award (0-100)
 */
async function calculatePoints(matchQuestionId, responseTimeMs) {
  // Get all correct answers for this question so far
  const correctAnswers = await prisma.player_answers.findMany({
    where: {
      match_question_id: matchQuestionId,
      is_correct: true,
      response_time_ms: { not: null }
    },
    select: {
      response_time_ms: true
    }
  });

  // Find the fastest response time (including this one)
  const allTimes = [...correctAnswers.map(a => a.response_time_ms), responseTimeMs];
  const fastestTime = Math.min(...allTimes);

  // Calculate points
  let points = 100;

  // If not the fastest, apply penalty
  if (responseTimeMs > fastestTime) {
    const timeDifference = responseTimeMs - fastestTime;
    const penalty = Math.floor(timeDifference / 100);
    points = Math.max(10, points - penalty);
  }

  // Cap at 100 points maximum
  return Math.min(100, Math.max(10, points));
}

/**
 * Submit an answer for the current question
 * 
 * @param {number} matchId
 * @param {Object} params
 * @param {number} params.userId
 * @param {number} params.matchQuestionId
 * @param {string} params.selectedOption - The option text (option_a, option_b, etc.)
 * @param {number} params.responseTimeMs - Optional response time in milliseconds
 * @returns {Promise<Object>}
 */
export async function submitAnswer(matchId, { userId, matchQuestionId, selectedOption, responseTimeMs }) {
  // Verify match exists and is ongoing
  const match = await prisma.matches.findUnique({
    where: { match_id: matchId }
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status === 'FINISHED') {
    throw new Error('Match already finished');
  }

  // Verify player is in this match
  const player = await prisma.match_players.findFirst({
    where: {
      match_id: matchId,
      user_id: userId
    }
  });

  if (!player) {
    throw new Error('Player not in this match');
  }

  // Verify question exists and get correct answer
  const question = await prisma.match_questions.findUnique({
    where: { match_question_id: matchQuestionId }
  });

  if (!question || question.match_id !== matchId) {
    throw new Error('Invalid question for this match');
  }

  // Check if already answered
  const existingAnswer = await prisma.player_answers.findFirst({
    where: {
      match_question_id: matchQuestionId,
      user_id: userId
    }
  });

  if (existingAnswer) {
    return { 
      accepted: false, 
      reason: 'already-answered',
      isCorrect: existingAnswer.is_correct
    };
  }

  // Check if answer is correct
  const isCorrect = selectedOption === question.correct_option;

  // Calculate points awarded (if correct)
  let pointsAwarded = 0;
  if (isCorrect && responseTimeMs) {
    pointsAwarded = await calculatePoints(matchQuestionId, responseTimeMs);
  } else if (isCorrect) {
    pointsAwarded = 50;
  }

  // Save answer and update score in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create player answer
    await tx.player_answers.create({
      data: {
        match_question_id: matchQuestionId,
        user_id: userId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        response_time_ms: responseTimeMs || null,
        points_awarded: pointsAwarded
      }
    });

    // Update player score if correct
    if (isCorrect && pointsAwarded > 0) {
      await tx.match_players.update({
        where: {
          match_players_id: player.match_players_id
        },
        data: {
          score: { increment: pointsAwarded }
        }
      });
    }

    return { pointsAwarded };
  });

  return { 
    accepted: true,
    isCorrect,
    correctAnswer: question.correct_option,
    pointsAwarded: result.pointsAwarded,
    responseTime: responseTimeMs
  };
}

/**
 * Advance to next question or finish match
 * Called by host or when all players have answered
 * 
 * @param {number} matchId
 * @returns {Promise<Object>}
 */
export async function nextQuestion(matchId) {
  const match = await prisma.matches.findUnique({
    where: { match_id: matchId },
    include: {
      match_questions: {
        orderBy: { question_number: 'asc' }
      }
    }
  });

  if (!match) {
    throw new Error('Match not found');
  }

  const currentIndex = await getCurrentQuestionIndex(matchId);
  const total = match.match_questions.length;


  // Check if match should be finished (all questions answered)
  if (currentIndex >= total) {
    await finishMatch(matchId);
    return { 
      index: total, 
      finished: true,
      status: 'FINISHED'
    };
  }

  return { 
    index: currentIndex + 1, 
    finished: false,
    status: match.status
  };
}

/**
 * Finish a match and calculate final scores
 * 
 * Handles:
 * - Marking match as finished
 * - Recording final scores
 * - Calculating average response times for tie-breaking
 * - Updating user statistics
 * - Determining winner(s)
 * 
 * @param {number} matchId
 */
export async function finishMatch(matchId) {
  await prisma.$transaction(async (tx) => {
    // Update match status
    await tx.matches.update({
      where: { match_id: matchId },
      data: {
        status: 'FINISHED',
        end_time: new Date()
      }
    });

    // Get final scores and calculate average response times
    const players = await tx.match_players.findMany({
      where: { match_id: matchId }
    });

    // Calculate average response time and correct answers for each player
    const playerStats = await Promise.all(
      players.map(async (player) => {
        const answers = await tx.player_answers.findMany({
          where: {
            user_id: player.user_id,
            match_question: {
              match_id: matchId
            }
          },
          select: {
            is_correct: true,
            response_time_ms: true
          }
        });

        // Calculate stats
        const correctAnswers = answers.filter(a => a.is_correct).length;
        const totalAnswers = answers.length;
        const responseTimes = answers
          .filter(a => a.response_time_ms !== null)
          .map(a => a.response_time_ms);
        
        const avgResponseTime = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
          : null;

        return {
          ...player,
          correctAnswers,
          totalAnswers,
          avgResponseTime
        };
      })
    );

    const maxScore = Math.max(...playerStats.map(p => p.score));
    const topScorers = playerStats.filter(p => p.score === maxScore);
    
    let winners;
    if (topScorers.length === 1) {
      winners = topScorers;
    } else {
      // Tie-break by correct answers
      const maxCorrect = Math.max(...topScorers.map(p => p.correctAnswers));
      const mostCorrect = topScorers.filter(p => p.correctAnswers === maxCorrect);
      
      if (mostCorrect.length === 1) {
        winners = mostCorrect;
      } else {
        const withResponseTimes = mostCorrect.filter(p => p.avgResponseTime !== null);
        if (withResponseTimes.length > 0) {
          const minTime = Math.min(...withResponseTimes.map(p => p.avgResponseTime));
          winners = withResponseTimes.filter(p => p.avgResponseTime === minTime);
        } else {
          winners = mostCorrect;
        }
      }
    }

    const winnerIds = new Set(winners.map(w => w.user_id));

    for (const playerStat of playerStats) {
      const isWinner = winnerIds.has(playerStat.user_id);

      await tx.scores.upsert({
        where: {
          match_id_user_id: {
            match_id: matchId,
            user_id: playerStat.user_id
          }
        },
        update: {
          total_score: playerStat.score,
          correct_answers: playerStat.correctAnswers,
          total_questions: playerStat.totalAnswers,
          avg_response_time: playerStat.avgResponseTime
        },
        create: {
          match_id: matchId,
          user_id: playerStat.user_id,
          total_score: playerStat.score,
          correct_answers: playerStat.correctAnswers,
          total_questions: playerStat.totalAnswers,
          avg_response_time: playerStat.avgResponseTime
        }
      });

      // Update user stats
      const stats = await tx.user_stats.findUnique({
        where: { user_id: playerStat.user_id }
      });

      if (stats) {
        // Calculate new average response time
        const newTotalGames = stats.games_played + 1;
        let newAvgResponseTime = stats.avg_response_time;
        
        if (playerStat.avgResponseTime !== null) {
          if (stats.avg_response_time !== null) {
            // Weighted average
            newAvgResponseTime = Math.round(
              ((stats.avg_response_time * stats.games_played) + playerStat.avgResponseTime) / newTotalGames
            );
          } else {
            newAvgResponseTime = playerStat.avgResponseTime;
          }
        }

        // Calculate new accuracy
        const newCorrectAnswers = (stats.correct_answers || 0) + playerStat.correctAnswers;
        const newTotalAnswers = (stats.total_answers || 0) + playerStat.totalAnswers;

        await tx.user_stats.update({
          where: { user_id: playerStat.user_id },
          data: {
            games_played: { increment: 1 },
            games_won: isWinner ? { increment: 1 } : undefined,
            total_score: { increment: playerStat.score },
            highest_score: playerStat.score > stats.highest_score ? playerStat.score : undefined,
            correct_answers: newCorrectAnswers,
            total_answers: newTotalAnswers,
            avg_response_time: newAvgResponseTime,
            average_score: Math.round((stats.total_score + playerStat.score) / newTotalGames),
            last_played_at: new Date()
          }
        });
      } else {
        // Create stats if they don't exist
        await tx.user_stats.create({
          data: {
            user_id: playerStat.user_id,
            games_played: 1,
            games_won: isWinner ? 1 : 0,
            total_score: playerStat.score,
            highest_score: playerStat.score,
            correct_answers: playerStat.correctAnswers,
            total_answers: playerStat.totalAnswers,
            avg_response_time: playerStat.avgResponseTime,
            average_score: playerStat.score,
            last_played_at: new Date()
          }
        });
      }
    }
  });
}

/**
 * Get scoreboard for a match
 * 
 * @param {number} matchId
 * @returns {Promise<Object>}
 */
export async function getScoreboard(matchId) {
  const match = await prisma.matches.findUnique({
    where: { match_id: matchId },
    include: {
      match_players: {
        include: {
          user: {
            select: {
              user_id: true,
              username: true,
              avatar_url: true
            }
          }
        },
        orderBy: { score: 'desc' }
      },
      match_questions: true
    }
  });

  if (!match) {
    throw new Error('Match not found');
  }

  const currentIndex = await getCurrentQuestionIndex(matchId);

  return {
    matchId,
    status: match.status,
    scores: match.match_players.map((p, index) => ({
      rank: index + 1,
      userId: p.user.user_id,
      username: p.user.username,
      avatar: p.user.avatar_url,
      avatarUrl: p.user.avatar_url,
      score: p.score
    })),
    finished: match.status === 'FINISHED',
    currentQuestion: currentIndex + 1,
    totalQuestions: match.match_questions.length
  };
}

/**
 * Delete a match (only host can delete)
 * Also deletes all related invitations
 * 
 * @param {number} matchId - Match ID to delete
 * @param {number} userId - User ID of the requester
 */
export async function deleteMatch(matchId, userId) {
  // Check if match exists and user is host
  const match = await prisma.matches.findUnique({
    where: { match_id: matchId },
    select: { 
      match_id: true, 
      host_id: true,
      status: true
    }
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.host_id !== userId) {
    throw new Error('Only the host can delete this match');
  }

  // Don't allow deleting ONGOING or FINISHED matches
  if (match.status === 'ONGOING') {
    throw new Error('Cannot delete an ongoing match');
  }

  if (match.status === 'FINISHED') {
    throw new Error('Cannot delete a finished match');
  }

  // Delete in transaction to ensure consistency
  await prisma.$transaction(async (tx) => {
    await tx.match_invites.deleteMany({
      where: { match_id: matchId }
    });

    await tx.player_answers.deleteMany({
      where: {
        match_question: {
          match_id: matchId
        }
      }
    });

    await tx.match_questions.deleteMany({
      where: { match_id: matchId }
    });

    await tx.match_players.deleteMany({
      where: { match_id: matchId }
    });

    await tx.match_rounds.deleteMany({
      where: { match_id: matchId }
    });

    await tx.scores.deleteMany({
      where: { match_id: matchId }
    });

    await tx.matches.delete({
      where: { match_id: matchId }
    });
  });

  return { matchId, deleted: true };
}
