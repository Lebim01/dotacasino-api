/*
  Warnings:

  - The values [LIVE,EGAME,TABLE,OTHER] on the enum `GameCategory` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `category` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."GameCategory" AS ENUM ('slots', 'live_dealers', 'fast_games', 'crash_games', 'table_games', 'lottery', 'card', 'roulette', 'video_poker', 'arcade', 'sport');
ALTER TABLE "public"."Game" ADD COLUMN     "category" "public"."GameCategory";
COMMIT;
