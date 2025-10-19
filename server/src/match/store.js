
import { PrismaClient } from '../generated/prisma/index.js';

const matches = new Map();
let prisma;

function getPrisma() {
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}

export function saveMatch(match) {
  matches.set(match.id, match);
  return match;
}

export function getMatch(id) {
  return matches.get(id) || null;
}

export function deleteMatch(id) {
  matches.delete(id);
}

export function generateId(prefix = 'm') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

// Persist match metadata to the DB (matches + rounds + match_questions)
// matchObj shape (example): { id, hostId, status, difficulty, startTime, rounds: [ { roundNumber, categoryId, difficulty, questions: [ { questionId, questionNumber, options... } ] } ], players: [ { userId } ] }
export async function saveMatchToDb(matchObj) {
  const db = getPrisma();

  // create match row
  const created = await db.matches.create({
    data: {
      match_id: Number(matchObj.id) || undefined,
      host_id: matchObj.hostId,
      status: matchObj.status || undefined,
      difficulty: matchObj.difficulty || undefined,
      start_time: matchObj.startTime ? new Date(matchObj.startTime) : undefined,
      end_time: matchObj.endTime ? new Date(matchObj.endTime) : undefined,
    },
  });

  // create rounds and questions if present
  if (Array.isArray(matchObj.rounds)) {
    for (const r of matchObj.rounds) {
      const round = await db.match_rounds.create({
        data: {
          match_id: created.match_id,
          round_number: r.roundNumber,
          category_id: r.categoryId,
          difficulty: r.difficulty || undefined,
        },
      });

      if (Array.isArray(r.questions)) {
        for (const q of r.questions) {
          await db.match_questions.create({
            data: {
              match_id: created.match_id,
              question_id: q.questionId,
              round_id: round.round_id,
              question_number: q.questionNumber,
              correct_option: q.correctOption,
              option_a: q.optionA,
              option_b: q.optionB,
              option_c: q.optionC,
              option_d: q.optionD,
            },
          });
        }
      }
    }
  }

  // add players
  if (Array.isArray(matchObj.players)) {
    for (const p of matchObj.players) {
      await db.match_players.create({
        data: {
          match_id: created.match_id,
          user_id: p.userId,
          score: p.score || 0,
        },
      });
    }
  }

  return created;
}

// Persist final scores for a match
export async function persistScores(matchId, scoresArray) {
  const db = getPrisma();

  const writes = scoresArray.map((s) =>
    db.scores.upsert({
      where: { score_id: s.scoreId || 0 },
      update: { total_score: s.totalScore },
      create: {
        match_id: matchId,
        user_id: s.userId,
        total_score: s.totalScore,
      },
    })
  );

  return Promise.all(writes);
}

export async function getMatchFromDb(matchId) {
  const db = getPrisma();
  const m = await db.matches.findUnique({
    where: { match_id: Number(matchId) },
    include: {
      match_rounds: { include: { match_questions: true } },
      match_players: true,
      match_questions: true,
    },
  });
  return m;
}
