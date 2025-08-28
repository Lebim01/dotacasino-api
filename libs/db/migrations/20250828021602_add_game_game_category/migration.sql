/*
  Warnings:

  - You are about to alter the column `rtp` on the `Game` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(5,2)`.
  - A unique constraint covering the columns `[code]` on the table `GameProvider` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformType` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `GameProvider` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GameProvider` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."GameCategory" AS ENUM ('LIVE', 'EGAME', 'TABLE', 'OTHER');

-- AlterTable
ALTER TABLE "public"."Game" ADD COLUMN     "category" "public"."GameCategory" NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "devices" TEXT[],
ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "gameType" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformType" TEXT NOT NULL,
ADD COLUMN     "providerGameId" TEXT,
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "thumbnailUrl" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "rtp" DROP NOT NULL,
ALTER COLUMN "rtp" SET DATA TYPE DECIMAL(5,2);

-- AlterTable
ALTER TABLE "public"."GameProvider" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "platformTypes" TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "apiKey" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Game_enabled_category_platformType_idx" ON "public"."Game"("enabled", "category", "platformType");

-- CreateIndex
CREATE UNIQUE INDEX "GameProvider_code_key" ON "public"."GameProvider"("code");

-- AddForeignKey
ALTER TABLE "public"."Game" ADD CONSTRAINT "Game_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."GameProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
