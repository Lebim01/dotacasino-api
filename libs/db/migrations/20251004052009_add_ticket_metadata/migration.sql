/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `BetTicket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `meta` to the `BetTicket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."BetTicket" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "meta" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BetTicket_idempotencyKey_key" ON "public"."BetTicket"("idempotencyKey");
