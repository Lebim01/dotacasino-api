/*
  Warnings:

  - A unique constraint covering the columns `[refCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "refCode" VARCHAR(16);

-- CreateIndex
CREATE UNIQUE INDEX "User_refCode_key" ON "public"."User"("refCode");
