/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "countDirectPeopleThisCycle" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "countUnderlinePeople" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sponsorName" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "public"."BinaryTreeRelation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ancestorId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinaryTreeRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BinaryTreeRelation_ancestorId_side_idx" ON "public"."BinaryTreeRelation"("ancestorId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "BinaryTreeRelation_userId_ancestorId_key" ON "public"."BinaryTreeRelation"("userId", "ancestorId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- AddForeignKey
ALTER TABLE "public"."BinaryTreeRelation" ADD CONSTRAINT "BinaryTreeRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BinaryTreeRelation" ADD CONSTRAINT "BinaryTreeRelation_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
