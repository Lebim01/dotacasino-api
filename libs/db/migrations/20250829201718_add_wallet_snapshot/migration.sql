/*
  Warnings:

  - The `currency` column on the `Wallet` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `LedgerEntry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,currency]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."Currency" AS ENUM ('USD');

-- AlterTable
ALTER TABLE "public"."LedgerEntry" ADD COLUMN     "balanceAfter" DECIMAL(65,30),
ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "public"."Wallet" DROP COLUMN "currency",
ADD COLUMN     "currency" "public"."Currency" NOT NULL DEFAULT 'USD';

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "public"."LedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_currency_key" ON "public"."Wallet"("userId", "currency");
