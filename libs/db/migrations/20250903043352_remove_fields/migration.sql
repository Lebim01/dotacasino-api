/*
  Warnings:

  - You are about to drop the column `category` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `platformType` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `providerGameId` on the `Game` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Game" DROP CONSTRAINT "Game_providerId_fkey";

-- DropIndex
DROP INDEX "public"."Game_enabled_platformType_idx";

-- AlterTable
ALTER TABLE "public"."Game"
DROP COLUMN "platformType",
ADD COLUMN     "gameProviderId" TEXT;

-- CreateIndex
CREATE INDEX "Game_enabled_idx" ON "public"."Game"("enabled");

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_gameProviderId_fkey" FOREIGN KEY ("gameProviderId") REFERENCES "public"."GameProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
