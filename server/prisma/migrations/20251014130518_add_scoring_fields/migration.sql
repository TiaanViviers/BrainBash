-- AlterTable
ALTER TABLE "player_answers" ADD COLUMN     "points_awarded" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "scores" ADD COLUMN     "avg_response_time" INTEGER,
ADD COLUMN     "correct_answers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "total_questions" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "total_score" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "player_answers_match_question_id_response_time_ms_idx" ON "player_answers"("match_question_id", "response_time_ms");
