/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `GameProvider` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."GameProvider" ADD COLUMN     "externalId" TEXT,
ALTER COLUMN "code" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GameProvider_externalId_key" ON "public"."GameProvider"("externalId");
