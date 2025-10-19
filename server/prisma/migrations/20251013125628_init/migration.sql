-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('OFFLINE', 'ONLINE', 'IN_MATCH');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'FINISHED', 'CANCELED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'OFFLINE',
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "trivia_questions" (
    "content_hash" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "question_text" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "wrong_answer_1" TEXT NOT NULL,
    "wrong_answer_2" TEXT NOT NULL,
    "wrong_answer_3" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trivia_questions_pkey" PRIMARY KEY ("content_hash")
);

-- CreateTable
CREATE TABLE "matches" (
    "match_id" SERIAL NOT NULL,
    "host_id" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "difficulty" "Difficulty",
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "match_rounds" (
    "round_id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "round_number" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',

    CONSTRAINT "match_rounds_pkey" PRIMARY KEY ("round_id")
);

-- CreateTable
CREATE TABLE "match_players" (
    "match_players_id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_players_pkey" PRIMARY KEY ("match_players_id")
);

-- CreateTable
CREATE TABLE "match_questions" (
    "match_question_id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "content_hash" TEXT NOT NULL,
    "round_id" INTEGER NOT NULL,
    "question_number" INTEGER NOT NULL,
    "correct_option" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_questions_pkey" PRIMARY KEY ("match_question_id")
);

-- CreateTable
CREATE TABLE "match_invites" (
    "invite_id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "match_invites_pkey" PRIMARY KEY ("invite_id")
);

-- CreateTable
CREATE TABLE "player_answers" (
    "answer_id" SERIAL NOT NULL,
    "match_question_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "selected_option" TEXT,
    "is_correct" BOOLEAN,
    "response_time_ms" INTEGER,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable
CREATE TABLE "scores" (
    "score_id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_score" INTEGER NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("score_id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "user_stats_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "games_won" INTEGER NOT NULL DEFAULT 0,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "highest_score" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "best_category" INTEGER,
    "best_category_accuracy" DOUBLE PRECISION,
    "total_answers" INTEGER NOT NULL DEFAULT 0,
    "avg_response_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_played_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("user_stats_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "trivia_questions_category_id_idx" ON "trivia_questions"("category_id");

-- CreateIndex
CREATE INDEX "matches_start_time_idx" ON "matches"("start_time");

-- CreateIndex
CREATE UNIQUE INDEX "match_rounds_match_id_round_number_key" ON "match_rounds"("match_id", "round_number");

-- CreateIndex
CREATE UNIQUE INDEX "match_players_match_id_user_id_key" ON "match_players"("match_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_questions_match_id_round_id_question_number_key" ON "match_questions"("match_id", "round_id", "question_number");

-- CreateIndex
CREATE INDEX "match_invites_recipient_id_status_idx" ON "match_invites"("recipient_id", "status");

-- CreateIndex
CREATE INDEX "player_answers_match_question_id_user_id_idx" ON "player_answers"("match_question_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scores_match_id_user_id_key" ON "scores"("match_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");

-- AddForeignKey
ALTER TABLE "trivia_questions" ADD CONSTRAINT "trivia_questions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_questions" ADD CONSTRAINT "match_questions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_questions" ADD CONSTRAINT "match_questions_content_hash_fkey" FOREIGN KEY ("content_hash") REFERENCES "trivia_questions"("content_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_questions" ADD CONSTRAINT "match_questions_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "match_rounds"("round_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_invites" ADD CONSTRAINT "match_invites_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_invites" ADD CONSTRAINT "match_invites_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_invites" ADD CONSTRAINT "match_invites_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_match_question_id_fkey" FOREIGN KEY ("match_question_id") REFERENCES "match_questions"("match_question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_answers" ADD CONSTRAINT "player_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("match_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_best_category_fkey" FOREIGN KEY ("best_category") REFERENCES "categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;
