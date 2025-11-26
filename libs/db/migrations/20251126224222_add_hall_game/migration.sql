/*
  Warnings:

  - A unique constraint covering the columns `[hall,betId]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Game_betId_key";

-- AlterTable
ALTER TABLE "public"."Game" ADD COLUMN     "hall" TEXT NOT NULL DEFAULT '3208656';

-- CreateIndex
CREATE UNIQUE INDEX "Game_hall_betId_key" ON "public"."Game"("hall", "betId");
