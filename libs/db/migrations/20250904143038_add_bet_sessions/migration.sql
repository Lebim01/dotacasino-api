/*
  Warnings:

  - You are about to drop the column `providerGameId` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Game" DROP COLUMN "providerGameId";

-- CreateTable
CREATE TABLE "public"."BetSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."BetSession" ADD CONSTRAINT "BetSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BetSession" ADD CONSTRAINT "BetSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "public"."Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
