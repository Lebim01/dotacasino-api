/*
  Warnings:

  - You are about to drop the column `refCode` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[refCodeL]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refCodeR]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."User_refCode_key";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "refCode",
ADD COLUMN     "firebaseId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "refCodeL" VARCHAR(16),
ADD COLUMN     "refCodeR" VARCHAR(16);

-- CreateIndex
CREATE UNIQUE INDEX "User_refCodeL_key" ON "public"."User"("refCodeL");

-- CreateIndex
CREATE UNIQUE INDEX "User_refCodeR_key" ON "public"."User"("refCodeR");
