-- Add points_awarded to player_answers table
-- This tracks how many points were awarded for each answer (for time-based scoring)
ALTER TABLE "player_answers" ADD COLUMN "points_awarded" INTEGER DEFAULT 0;

-- Add additional stats to scores table for detailed match history
-- These help with tie-breaking and detailed analytics
ALTER TABLE "scores" ADD COLUMN "correct_answers" INTEGER DEFAULT 0;
ALTER TABLE "scores" ADD COLUMN "total_questions" INTEGER DEFAULT 0;
ALTER TABLE "scores" ADD COLUMN "avg_response_time" INTEGER;

-- Create index on player_answers for performance (finding fastest responder)
CREATE INDEX IF NOT EXISTS "player_answers_question_time_idx" ON "player_answers"("match_question_id", "response_time_ms") WHERE "is_correct" = true;
